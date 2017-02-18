
var IInstanceFactory = Object.create(Object.prototype, {

  create: {
    value: function (options) {}, //eslint-disable-line no-unused-vars
    enumerable: true
  },

  toString: {
    value: function () {
      return "[object IInstanceFactory]";
    },
    enumerable: true
  }

});

Object.freeze(IInstanceFactory);

exports.IInstanceFactory = IInstanceFactory;