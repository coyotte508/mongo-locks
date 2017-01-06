const lockSchema = require("./schema.js");

module.exports = (function() {
  var Locks = null;

  function MongoLocksError(message, remaining) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
  };

  require('util').inherits(MongoLocksError, Error);

  var init = (connection, options) => {
    options = options || {};
    Locks = connection.model(options.collection || 'Locks', lockSchema);
  }

  var checkInit = (fn) => function() {
    if (!Locks) {
      throw new MongoLocksError("You must initialize mongo-locks with a mongoose connection");
    }

    return fn.apply(this, arguments);
  };

  var makeLockId = (array) => Array.prototype.slice.apply(array).join("-");

  var lock = function() {
    var lockId = makeLockId(arguments);

    var l = new Locks();
    l.action = lockId;
    return l.save().then(() => { return () => Locks.remove({action: lockId});});
  }

  var free = function() {
    return Locks.remove(makeLockId(arguments));
  };

  return {
    init,
    lock: checkInit(lock),
    free: checkInit(free),
    MongoLocksError
  };
}());