import { Collection, ObjectId } from "mongodb";

export class MongoLocksError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

const makeKey = (key: unknown) => {
  // Arrays mess up the unique MongoDB indexes
  return Array.isArray(key) ? { _key_array: key } : key;
};

interface LockModel {
  _id: ObjectId;
  action: unknown;
  createdAt: Date;
  refreshedAt: Date;
  expiresAt: Date;
}

class Lock {
  constructor(public _id: ObjectId, public action: unknown, public collection: Collection<LockModel>) {
    if (this.locked) {
      (async () => {
        while (this.locked) {
          await new Promise((resolve) => setTimeout(resolve, 10_000));
          await this.refresh().catch(() => {
            console.error("Failed to refresh lock", action);
          });
        }
      })();
    }
  }

  locked = true;

  /**
   * Instead of calling `this.free` directly you can use the `using` syntax
   *
   * @returns true if the lock was successfully released. False if the lock was not found
   */
  async free(): Promise<boolean> {
    if (!this.locked) {
      return false;
    }
    this.locked = false;

    const result = await this.collection.deleteOne({ _id: this._id });
    return result.deletedCount === 1;
  }

  /**
   * Refreshes the lock's TTL
   *
   * Automatically called every 10 seconds if the lock is still active, no
   * need to call this manually
   *
   * @returns true if the lock was successfully refreshed. False if the lock was not found
   */
  async refresh(): Promise<boolean> {
    if (!this.locked) {
      return false;
    }

    const res = await this.collection.updateOne(
      { _id: this._id },
      { $set: { refreshedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) } }
    );

    this.locked = res.matchedCount === 1;

    return this.locked;
  }

  [Symbol.dispose]() {
    this.free();
  }

  async [Symbol.asyncDispose]() {
    return this.free();
  }
}

export class LockManager {
  collection: Collection<LockModel>;
  MongoLocksError = MongoLocksError;

  constructor(collection: Collection) {
    this.collection = collection as unknown as Collection<LockModel>;

    collection.createIndex({ action: 1 }, { unique: true });
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }

  /**
   * Creates a DB lock based on the key provided
   *
   * @returns a function that when called will release the lock
   */
  async lock(key: unknown): Promise<Lock | null> {
    const lockId = makeKey(key);
    const id = new ObjectId();

    try {
      await this.collection.insertOne({
        _id: id,
        action: lockId,
        createdAt: new Date(),
        refreshedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      return new Lock(id, lockId, this.collection);
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === 11000) {
        return null;
      }

      throw err;
    }
  }
}

export type { LockModel, Lock };
