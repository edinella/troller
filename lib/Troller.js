var util             = require('util');
var debug            = require('debug');
var express          = require('express');
var expressValidator = require('express-validator');
var jwt              = require('./middlewares/jwt');
var Component        = require('./Component');
var errors           = require('./errors');

module.exports = Troller;
util.inherits(Troller, Component);
function Troller(alias, options) {
  Component.call(this, alias);
  this.debug = debug('ot:Troller:' + this.alias);
  this.alias = alias;
  this.options = options || {};
  this.options.manyMatcher = this.options.manyMatcher || this.alias;
  this.options.oneMatcher = this.options.oneMatcher || '/:id';
  this.manyRoute = this.options.manyMatcher;
  this.oneRoute = this.options.manyMatcher + this.options.oneMatcher;
  this.debug('manyRoute is %s', this.manyRoute);
  this.debug('oneRoute is %s', this.oneRoute);
  this.router = express.Router();
  this.router.use(Troller.validatorMiddleware);
}

Troller.validatorMiddleware = expressValidator({
  errorFormatter: function(path, msg, value) {
    var map = {};
    map[path] = new errors.ValidatorError('invalid', msg, path, value);
    throw new errors.ValidationError(map);
  }
});

Troller.prototype.action = function(type, op, status, isOpen) {
  var one  = this.oneRoute;
  var many = this.manyRoute;
  switch (type) {
    case 'index':   this.route('get',    many, op, status, isOpen); break;
    case 'create':  this.route('post',   many, op, status, isOpen); break;
    case 'show':    this.route('get',    one,  op, status, isOpen); break;
    case 'update':  this.route('put',    one,  op, status, isOpen); break;
    case 'destroy': this.route('delete', one,  op, status, isOpen); break;
    default: throw new Error(type + ' is not a valid action type');
  }
};

Troller.prototype.route = function(method, path, op, status, isOpen) {
  var handler = isOpen ? [] : [jwt];
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
  var request = new Component('RestRequest:' + this.alias, this.getStructure());
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
      // TODO: implement 204 on frontend
      // return res.status(status).end();
      return res.status(200).send({});
    }
    if (result) {
      return res.status(status).send(result);
    }
    return next(new errors.NotFoundError());
  }

  function failure(err) {
    request.debug('#%s ERROR', operation, err.stack);
    next(err);
  }

};
