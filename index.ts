import * as mongoose from "mongoose";
import lockSchema from "./src/schema";

export class MongoLocksError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

const makeLockId = array => Array.prototype.slice.apply(array).join("-");

class LockManager {
  Locks: mongoose.Model<any> = null;
  MongoLocksError = MongoLocksError;
  noop: () => Promise<any> = async () => {};

  init(connection: mongoose.Connection, options?: {collection?: string}) {
    options = options || {};
    this.Locks = connection.model(options.collection || 'Locks', lockSchema);
  }

  lock(...actions: any[]): Promise<() => Promise<any>> {
    if (!this.Locks) {
      throw new MongoLocksError("You must initialize mongo-locks with a mongoose connection");
    }

    const lockId = makeLockId(actions);

    const l = new this.Locks();
    l.action = lockId;
    return l.save().then(() => () => this.Locks.deleteOne({action: lockId}).exec());
  }

  refresh(...actions: any[]) {
    if (!this.Locks) {
      throw new MongoLocksError("You must initialize mongo-locks with a mongoose connection");
    }

    return this.Locks.updateOne({action: makeLockId(actions)}, {$set: {refreshedAt: Date.now()}}).exec();
  }

  free(...actions: any[]) {
    if (!this.Locks) {
      throw new MongoLocksError("You must initialize mongo-locks with a mongoose connection");
    }

    return this.Locks.deleteOne({action: makeLockId(actions)}).exec();
  }
}

export default new LockManager();
