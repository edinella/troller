var util    = require('util');
var debug   = require('debug');
var OpSet   = require('opset');
var express = require('express');
var errors  = require('./errors');

module.exports = Troller;
util.inherits(Troller, OpSet);
function Troller(alias, options) {
  OpSet.call(this, alias);
  this.debug = debug('Troller:' + this.alias);
  this.alias = alias;
  this.options = options || {};
  this.options.manyMatcher = this.options.manyMatcher || this.alias;
  this.options.oneMatcher = this.options.oneMatcher || '/:id';
  this.manyRoute = this.options.manyMatcher;
  this.oneRoute = this.options.manyMatcher + this.options.oneMatcher;
  this.debug('manyRoute is %s', this.manyRoute);
  this.debug('oneRoute is %s', this.oneRoute);
  this.router = express.Router();
}

Troller.errors = errors;

Troller.prototype.use = function() {
  return this.router.use.apply(this.router, arguments);
};

Troller.prototype.action = function(type, op, status) {
  var one  = this.oneRoute;
  var many = this.manyRoute;
  switch (type) {
    case 'index':   this.route('get',    many, op, status); break;
    case 'create':  this.route('post',   many, op, status); break;
    case 'show':    this.route('get',    one,  op, status); break;
    case 'update':  this.route('put',    one,  op, status); break;
    case 'destroy': this.route('delete', one,  op, status); break;
    default: throw new Error(type + ' is not a valid action type');
  }
};

Troller.prototype.route = function(method, path, op, status) {
  var handler = [];
  if (op instanceof Array) {
    for (var i = 0, l = op.length; i < l; i++) {
      var isString = typeof op[i] === 'string';
      handler.push(isString ? this.handler.bind(this, op[i], status) : op[i]);
    }
  } else {
    handler.push(this.handler.bind(this, op, status));
  }
  this.router[method](path, handler);
};

Troller.prototype.handler = function(operation, status, req, res, next) {
  var request = new OpSet('RestRequest:' + this.alias, this.getStructure());
  request.debug('#%s START', operation);

  request.setCache('req', req);
  request.setCache('res', res);
  request.setCache('next', next);
  request.run(operation).then(success).fail(failure);

  function success(result) {
    request.debug('#%s SUCCESS', operation);
    if (res.headersSent) {
      request.debug('#%s Response previously sent', operation);
      return;
    }
    if (status === 204 && result) {
      return res.status(status).end();
      // return res.status(200).send({});
    }
    if (result) {
      return res.status(status).send(result);
    }
    return next(new Troller.errors.NotFoundError());
  }

  function failure(err) {
    request.debug('#%s ERROR', operation, err.stack);
    next(err);
  }

};
