# mongo-locks

Simple and bountiful locks to avoid doing the same operation multiple times

The purpose of this package is simply to avoid doing the same thing twice at the same time
and make your system a bit more user-proof.

```ts
import { LockManager } from "mongo-locks";
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27017");
const lockManager = new LockManager(client.db().collection("mongo-locks"));

async function doStuff() {
  await using lock = await lockManager.lock("unique string key");

  if (!lock) {
    console.log("Lock already taken");
    return;
  }

  // do stuff

  //lock is automatically freed
}
```

If the process crashes while a lock is active, MongoDB will automatically free it after one minute or two.

If you don't want to use the `using` syntax, you can do it this way:

```ts
async function doStuff() {
  const lock = await lockManager.lock("unique string key");

  if (!lock) {
    console.log("Lock already taken");
    return;
  }

  try {
    // do stuff
  } finally {
    await lock.free(); // or await lock[Symbol.asyncDispose]();
  }
}
```

## Mongoose

Mongoose let's you access the underlying collection of a model, so you can use it like this:

```ts
import { LockManager } from "mongo-locks";
import mongoose from "mongoose";

const lockManager = new LockManager(mongoose.model("Lock").collection);
// ...
```
