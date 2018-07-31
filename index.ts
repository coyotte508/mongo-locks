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

  init(connection: mongoose.Connection, options?: {collection?: string}) {
    options = options || {};
    this.Locks = connection.model(options.collection || 'Locks', lockSchema);
  }

  lock() {
    if (!this.Locks) {
      throw new MongoLocksError("You must initialize mongo-locks with a mongoose connection");
    }

    const lockId = makeLockId(arguments);

    const l = new this.Locks();
    l.action = lockId;
    return l.save().then(() => () => this.Locks.remove({action: lockId}).exec());
  }

  free() {
    if (!this.Locks) {
      throw new MongoLocksError("You must initialize mongo-locks with a mongoose connection");
    }

    return this.Locks.remove(makeLockId(arguments)).exec();
  }
}

export default new LockManager();
