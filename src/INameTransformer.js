var INameTransformer = Object.create(Object.prototype, {

  transform: {
    value: function (name) {},//eslint-disable-line no-unused-vars
    enumerable: true
  },

  toString: {
    value: function () {
      return "[object INameTransformer]";
    },
    enumerable: true
  }

});

Object.freeze(INameTransformer);

exports.INameTransformer = INameTransformer;