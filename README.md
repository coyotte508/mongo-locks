# mongo-locks
Simple and bountiful locks to avoid doing the same operation multiple times

The purpose of this package is simply to avoid doing the same thing twice at the same time
and make your system a bit more user-proof.

Usage, if your version of node supports await/async:

```js
async function doStuff() {
  var freeLock = () => {}; //no-op

  //... code

  try {
    //...
    freeLock = await locks.lock("unique string key");

    //sensitive code
  } catch(err) {
    //...
  }

  freeLock(); /* Gets started on releasing lock, can be awaited */
}
```

Locks are automatically freed within one minute or two, as the purpose of this package is just to protect against
race conditions and doing the same action several times in a short span.

For a more concrete example:

Imagine you have a "like" feature on your site, where users can like posts. Maybe you would
process likes this way:

```js
const mongoose = require('mongoose');

router.all("/like", isUserLoggedIn, (req, res, next) => {
  /* Silently ignore attempt to like an already liked post */
  if (req.user.doesLike(req.post.id)) {
    return res.redirect(req.post.getLink()); 
  }

  /* Add post reference to user, and increase likes for post */
  Promise.all([
    req.user.update({$push: {likedPosts: {ref: req.post.id, title: req.post.title}}}),
    req.post.update({$inc: {likes: 1}})
  ]).then(
    () => res.redirect(req.post.getLink()), //when all done
    next //in case of error, next(err) is called
  );
});
```

The problem with this is that if a user accesses the "like" url twice very fast, for whatever
reason, the server can add the like on one hand while the silent check is already passed successfully
on the other hand, and boom, the user liked the same post twice!

This package aims to solve that problem. The code would now look like:

```js
const mongoose = require('mongoose');
const locks = require('mongo-locks');

locks.init(mongoose.connection); //do just once across the whole app

router.all("/like", isUserLoggedIn, (req, res, next) => {
  /* Silently ignore attempt to like an already liked post */
  if (req.user.doesLike(req.post.id)) {
    return res.redirect(req.post.getLink()); 
  }

  var freeLock = () => {};
  /* Add post reference to user, and increase likes for post */
  locks.lock("like", req.user.id, req.post.id).then((free) => {
    freeLock = free;
    return Promise.all([
      req.user.update({$push: {likedPosts: {ref: req.post.id, title: req.post.title}}}),
      req.post.update({$inc: {likes: 1}})
    ]);
  }).then(() => res.redirect(req.post.getLink()), next)
    .then(() => freeLock(), () => freeLock());
});
```

Internally, this package creates a collection and tries to insert locks in
that collection. It relies on MongoDB's unique indexes to guarantee an error
is returned in case the same lock is used twice.


## API

All the functions except for getting and setting the parameters return Promises.

### .init(connection: mongoose.connection[, options])

Initialize the connection to the mongo database, needed before any calls to the other functions.

`options` is made of the following:

#### collection 

The collection this module will create and use to store locks, by default `locks`

### .lock([action1[, action2[, action3[, ...])

Create a lock for the combination of said actions, return a Promise that is rejected if lock creation failed.

The lock's id will actually be the various arguments converted to string and joined with `"-"`, so passing objects
to this function is ill-advised.

If lock creation succeeded, the Promise will resolve to a function to free the lock.

### .free([action1[, action2[, action3[, ...])

Frees the lock. If you want to wait until the lock is freed, you can chain it with `.then`.

## MongoDb model

Model created:

``` js
// This module will create a Mongoose model 
// collection with schema:
Locks = new mongoose.Schema({
    createdAt:     Date, //indexed, expires after 60 seconds
    action:        String //uniquely indexed
});
```

The collection is called "locks" by default, but you can set the name you want in the `options`
parameter of the `init()` function.