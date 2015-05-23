# troller [![Build Status](https://travis-ci.org/edinella/troller.png?branch=master)](https://travis-ci.org/edinella/troller) [![Code Climate](https://codeclimate.com/github/edinella/troller.png)](https://codeclimate.com/github/edinella/troller)
Promised DI RESTfull controller for express

[![NPM](https://nodei.co/npm/troller.png)](https://npmjs.org/package/troller)

## Example

```js
// app.js
var express = require('express');
var app = express();

app.use(require('./controllers'));

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
```

```js
// controllers/index.js
var _                = require('lodash');
var express          = require('express');
var requireDirectory = require('require-directory');

var router = module.exports = express.Router();
var ctrls  = requireDirectory(module);

_.forOwn(ctrls, function(ctrl) {
  if (!_.isUndefined(ctrl.router)) {
    router.use(ctrl.router);
  }
});
```

```js
// controllers/comments.js
var Troller = require('troller');
var mongoose = require('mongoose');

var Post    = mongoose.model('Post');
var Comment = mongoose.model('Comment');

var controller = module.exports = new Troller('/api/posts');

// declare actions
controller.action('show'   , 'commented', 200);
controller.action('index'  , 'items'  ,   200);
controller.action('create' , 'created',   201);
controller.action('update' , 'updated',   200);
controller.action('destroy', 'deleted',   204);

// declare operations
controller.operation('item', function(req) {
  return Post.findOne()
    .where('deletedAt', null)
    .where('_id', req.params.id)
    .exec();
});

controller.operation('commented', function(item, comments) {
  item.comments = comments;
  return item;
});

controller.operation('items', function() {
  return Post.find()
    .where('deletedAt', null)
    .sort('-createdAt')
    .exec();
});

controller.operation('comments', function(item) {
  return Comment.find()
    .where('deletedAt', null)
    .where('post', item._id)
    .exec();
});

controller.operation('created', function(req) {
  return Post.create(req.body);
});

controller.operation('updated', function(item, req) {
  if (item) {
    item.set(req.body);
  }
  return update(item);
});

controller.operation('deleted', function(item) {
  if (item) {
    item.deletedAt = Date.now();
  }
  return update(item);
});

// usually this would be a mongoose plugin
function update(doc) {
  return doc && Q.Promise(function(resolve, reject) {
    doc.save(function(err, item) {
      if (err) {reject(err);}
      else {resolve(item);}
    });
  });
}
```

## How to use
Install with NPM:
```sh
npm install --save troller
```

Then require it:
```js
var Troller = require('troller');
```
