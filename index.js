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

  var lock = (what) => {
    var l = new Locks();
    l.action = what;
    return l.save().then(() => { return () => Locks.remove({action: what});});
  }

  var free = (what) => {
    return Locks.remove({action: what});
  };

  return {
    init,
    lock: checkInit(lock),
    free: checkInit(free),
    MongoLocksError
  };
}());