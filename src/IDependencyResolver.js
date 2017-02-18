var IDependencyResolver = Object.create(Object.prototype, {

  isAutowired: {
    value: function () {},
    enumerable: true
  },

  autowired: {
    value: function (value) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  register: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  as: {
    value: function (type) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  instance: {
    value: function (instance) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  asSingleton: {
    value: function () {},
    enumerable: true
  },

  withConstructor: {
    value: function () {},
    enumerable: true
  },

  param: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  withProperties: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  prop: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  val: {
    value: function (instance) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  ref: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  setFactory: {
    value: function (factory) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  create: {
    value: function () {},
    enumerable: true
  },

  inject: {
    value: function (func, name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  contains: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  resolve: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  getDefaultFactory: {
    value: function () {},
    enumerable: true
  },

  setDefaultFactory: {
    value: function (factory) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  getNameTransformer: {
    value: function () {},
    enumerable: true
  },

  setNameTransformer: {
    value: function (transformer) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  getRegistration: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  dispose: {
    value: function () {},
    enumerable: true
  },

  toString: {
    value: function () {
      return "[object IDependencyResolver]";
    },
    enumerable: true
  }

});

Object.freeze(IDependencyResolver);

exports.IDependencyResolver = IDependencyResolver;