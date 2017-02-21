'use strict';

var exports = {};

exports.version = '2.1.0';

  //http://stackoverflow.com/questions/6598945/detect-if-function-is-native-to-browser
var isFuncNative = function isFuncNative(f) {
    return !!f && (typeof f).toLowerCase() === "function" &&
        //jshint maxlen=300
        (/^\s*function\s*(\b[a-z$_][a-z0-9$_]*\b)*\s*\((|([a-z$_][a-z0-9$_]*)(\s*,[a-z$_][a-z0-9$_]*)*)\)\s*\{\s*\[native code\]\s*}\s*$/i.test(String(f))
        || f === Function.prototype);
};

var shim = {
    object: {},
    _: {}
};

//noinspection Eslint
shim._.function_toString = Function.prototype.toString;
var call = Function.call;

function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}

var prototypeOfObject = Object.prototype;
shim.object.prototype = prototypeOfObject;
var owns = uncurryThis(prototypeOfObject.hasOwnProperty);
var isEnumerable = uncurryThis(prototypeOfObject.propertyIsEnumerable);
var toStr = uncurryThis(prototypeOfObject.toString);

// If JS engine supports accessors creating shortcuts.
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors = owns(prototypeOfObject, "__defineGetter__");
if (supportsAccessors) {
    /* eslint-disable no-underscore-dangle */
    defineGetter = call.bind(prototypeOfObject.__defineGetter__);
    defineSetter = call.bind(prototypeOfObject.__defineSetter__);
    lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
    lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
    /* eslint-enable no-underscore-dangle */
}

// Having a toString local variable name breaks in Opera so use to_string.
var to_string = prototypeOfObject.toString;

var isFunction = function (val) {
    return to_string.call(val) === "[object Function]";
};
var isArray = function isArray(obj) {
    return to_string.call(obj) === "[object Array]";
};
var isString = function isString(obj) {
    return to_string.call(obj) === "[object String]";
};
var isArguments = function isArguments(value) {
    var str = to_string.call(value);
    var isArgs = str === "[object Arguments]";
    if (!isArgs) {
        isArgs = !isArray(value) &&
            value !== null &&
            typeof value === "object" &&
            typeof value.length === "number" &&
            value.length >= 0 &&
            isFunction(value.callee);
    }
    return isArgs;
};


// http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
var hasDontEnumBug = !({"toString": null}).propertyIsEnumerable("toString"),
    hasProtoEnumBug = function () {
    }.propertyIsEnumerable("prototype"),
    hasStringEnumBug = !owns("x", "0"),
    dontEnums = [
        "toString",
        "toLocaleString",
        "valueOf",
        "hasOwnProperty",
        "isPrototypeOf",
        "propertyIsEnumerable",
        "constructor"
    ],
    dontEnumsLength = dontEnums.length;

var toObject = function (o) {
    /*jshint eqnull: true */
    //noinspection Eslint
    if (o == null) { // this matches both null and undefined
        throw new TypeError("can\"t convert " + o + " to object");
    }
    return Object(o);
};

shim._.indexOf = Array.prototype.indexOf && isFuncNative(Array.prototype.indexOf) ?
    function (arr, sought) {
        return arr.indexOf(sought);
    } :
    function indexOf(arr, sought /*, fromIndex */) {
        var length = arr.length >>> 0;

        if (!length) {
            return -1;
        }

        for (var i = 0; i < length; i++) {
            if (i in arr && arr[i] === sought) {
                return i;
            }
        }
        return -1;
    };

var array_forEach = function forEach(arr, fun) {
    var thisp = arguments[2],
        i = -1,
        length = arr.length >>> 0;

    // If no callback function or if callback is not a callable function
    if (!isFunction(fun)) {
        throw new TypeError(); // TODO message
    }

    while (++i < length) {
        if (i in arr) {
            // Invoke the callback function with call, passing arguments:
            // context, property value, property key, thisArg object
            // context
            fun.call(thisp, arr[i], i, arr);
        }
    }
};

shim.object.keys = Object.keys && isFuncNative(Object.keys) ? Object.keys : function keys(object) {
    var isFn = isFunction(object),
        isArgs = isArguments(object),
        isObject = object !== null && typeof object === "object",
        isStr = isObject && isString(object);

    if (!isObject && !isFn && !isArgs) {
        throw new TypeError("Object.keys called on a non-object");
    }

    var theKeys = [];
    var skipProto = hasProtoEnumBug && isFn;
    if ((isStr && hasStringEnumBug) || isArgs) {
        for (var i = 0; i < object.length; ++i) {
            theKeys.push(String(i));
        }
    }

    if (!isArgs) {
        for (var name in object) {
            if (!(skipProto && name === "prototype") && owns(object, name)) {
                theKeys.push(String(name));
            }
        }
    }

    if (hasDontEnumBug) {
        var ctor = object.constructor,
            skipConstructor = ctor && ctor.prototype === object;
        for (var j = 0; j < dontEnumsLength; j++) {
            var dontEnum = dontEnums[j];
            if (!(skipConstructor && dontEnum === "constructor") && owns(object, dontEnum)) {
                theKeys.push(dontEnum);
            }
        }
    }
    return theKeys;
};

shim.object.getPrototypeOf = Object.getPrototypeOf && isFuncNative(Object.getPrototypeOf) ? Object.getPrototypeOf :
    function getPrototypeOf(object) {
        /* jshint ignore:start */
        var proto = object.__proto__;
        /* jshint ignore:end */
        if (proto || proto === null) {
            return proto;
        } else if (toStr(object.constructor) === "[object Function]") {
            return object.constructor.prototype;
        } else if (object instanceof Object) {
            return prototypeOfObject;
        } else {
            // Correctly return null for Objects created with `Object.create(null)`
            // (shammed or native) or `{ __proto__: null}`.  Also returns null for
            // cross-realm objects on browsers that lack `__proto__` support (like
            // IE <11), but that"s the best we can do.
            return null;
        }
    };

var doesGetOwnPropertyDescriptorWork = function doesGetOwnPropertyDescriptorWork(object) {
    try {
        object.sentinel = 0;
        return Object.getOwnPropertyDescriptor(object, "sentinel").value === 0;
    } catch (exception) {
        return false;
    }
};

// check whether getOwnPropertyDescriptor works if it"s given. Otherwise, shim partially.
var getOwnPropertyDescriptorFallback;
if (Object.defineProperty) {
    var getOwnPropertyDescriptorWorksOnObject = doesGetOwnPropertyDescriptorWork({});
    var getOwnPropertyDescriptorWorksOnDom = typeof document === "undefined" ||
        doesGetOwnPropertyDescriptorWork(document.createElement("div"));
    if (!getOwnPropertyDescriptorWorksOnDom || !getOwnPropertyDescriptorWorksOnObject) {
        getOwnPropertyDescriptorFallback = Object.getOwnPropertyDescriptor;
    }
}

var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a non-object: ";

/* eslint-disable no-proto */
shim.object.getOwnPropertyDescriptor =
    (Object.getOwnPropertyDescriptor && getOwnPropertyDescriptorFallback) && isFuncNative(Object.getOwnPropertyDescriptor) ?
        Object.getOwnPropertyDescriptor :
        function getOwnPropertyDescriptor(object, property) {
            if ((typeof object !== "object" && typeof object !== "function") || object === null) {
                throw new TypeError(ERR_NON_OBJECT + object);
            }

            // make a valiant attempt to use the real getOwnPropertyDescriptor
            // for I8"s DOM elements.
            if (getOwnPropertyDescriptorFallback) {
                try {
                    return getOwnPropertyDescriptorFallback.call(Object, object, property);
                } catch (exception) {
                    // try the shim if the real one doesn't work
                }
            }

            var descriptor;

            // If object does not owns property return undefined immediately.
            if (!owns(object, property)) {
                return descriptor;
            }

            // If object has a property then it"s for sure `configurable`, and
            // probably `enumerable`. Detect enumerability though.
            descriptor = {
                enumerable: isEnumerable(object, property),
                configurable: true
            };

            // If JS engine supports accessor properties then property may be a
            // getter or setter.
            if (supportsAccessors) {
                // Unfortunately `__lookupGetter__` will return a getter even
                // if object has own non getter property along with a same named
                // inherited getter. To avoid misbehavior we temporary remove
                // `__proto__` so that `__lookupGetter__` will return getter only
                // if it"s owned by an object.
                /* jshint ignore:start */
                var prototype = object.__proto__;
                /* jshint ignore:end */


                var notPrototypeOfObject = object !== prototypeOfObject;
                // avoid recursion problem, breaking in Opera Mini when
                // Object.getOwnPropertyDescriptor(Object.prototype, "toString")
                // or any other Object.prototype accessor
                if (notPrototypeOfObject) {
                    /* jshint ignore:start */
                    object.__proto__ = prototypeOfObject;
                    /* jshint ignore:end */
                }

                var getter = lookupGetter(object, property);
                var setter = lookupSetter(object, property);

                if (notPrototypeOfObject) {
                    // Once we have getter and setter we can put values back.
                    object.__proto__ = prototype; //jshint ignore:line
                }

                if (getter || setter) {
                    if (getter) {
                        descriptor.get = getter;
                    }
                    if (setter) {
                        descriptor.set = setter;
                    }
                    // If it was accessor property we"re done and return here
                    // in order to avoid adding `value` to the descriptor.
                    return descriptor;
                }
            }

            // If we got this far we know that object has an own property that is
            // not an accessor so we set it as a value and return descriptor.
            descriptor.value = object[property];
            descriptor.writable = true;
            return descriptor;
        };
/* eslint-enable no-proto */

shim.object.getOwnPropertyNames = Object.getOwnPropertyNames && isFuncNative(Object.getOwnPropertyNames) ?
    Object.getOwnPropertyNames :
    function getOwnPropertyNames(object) {
        return shim.object.keys(object);
    };

if (!Object.create || !isFuncNative(Object.create)) {

    // Contributed by Brandon Benvie, October, 2012
    var createEmpty;
    var supportsProto = !({__proto__: null} instanceof Object);//jshint ignore:line
    // the following produces false positives
    // in Opera Mini => not a reliable check
    // Object.prototype.__proto__ === null

    // Check for document.domain and active x support
    // No need to use active x approach when document.domain is not set
    // see https://github.com/es-shims/es5-shim/issues/150
    // variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
    /* global ActiveXObject */
    var shouldUseActiveX = function shouldUseActiveX() {
        // return early if document.domain not set
        if (!document.domain) {
            return false;
        }

        try {
            return !!new ActiveXObject("htmlfile");
        } catch (exception) {
            return false;
        }
    };

    // This supports IE8 when document.domain is used
    // see https://github.com/es-shims/es5-shim/issues/150
    // variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
    var getEmptyViaActiveX = function getEmptyViaActiveX() {
        var empty;
        var xDoc;

        xDoc = new ActiveXObject("htmlfile");

        xDoc.write("<script><\/script>");
        xDoc.close();

        empty = xDoc.parentWindow.Object.prototype;
        xDoc = null;

        return empty;
    };

    // The original implementation using an iframe
    // before the activex approach was added
    // see https://github.com/es-shims/es5-shim/issues/150
    var getEmptyViaIFrame = function getEmptyViaIFrame() {
        var iframe = document.createElement("iframe");
        var parent = document.body || document.documentElement;
        var empty;

        iframe.style.display = "none";
        parent.appendChild(iframe);
        /* jshint ignore:start */
        iframe.src = "javascript:";
        /* jshint ignore:end */

        empty = iframe.contentWindow.Object.prototype;
        parent.removeChild(iframe);
        iframe = null;

        return empty;
    };

    /* global document */
    if (supportsProto || typeof document === "undefined") {
        createEmpty = function () {
            return {__proto__: null}; //jshint ignore:line
        };
    } else {
        // In old IE __proto__ can"t be used to manually set `null`, nor does
        // any other method exist to make an object that inherits from nothing,
        // aside from Object.prototype itself. Instead, create a new global
        // object and *steal* its Object.prototype and strip it bare. This is
        // used as the prototype to create nullary objects.
        createEmpty = function () {
            // Determine which approach to use
            // see https://github.com/es-shims/es5-shim/issues/150
            var empty = shouldUseActiveX() ? getEmptyViaActiveX() : getEmptyViaIFrame();

            delete empty.constructor;
            delete empty.hasOwnProperty;
            delete empty.propertyIsEnumerable;
            delete empty.isPrototypeOf;
            delete empty.toLocaleString;
            delete empty.toString;
            delete empty.valueOf;

            var Empty = function Empty() {
            };
            Empty.prototype = empty;
            // short-circuit future calls
            createEmpty = function () {
                return new Empty();
            };
            return new Empty();
        };
    }

    shim.object.create = function create(prototype, properties) {

        var object;
        var Type = function Type() {
        }; // An empty constructor.

        if (prototype === null) {
            object = createEmpty();
        } else {
            if (typeof prototype !== "object" && typeof prototype !== "function") {
                // In the native implementation `parent` can be `null`
                // OR *any* `instanceof Object`  (Object|Function|Array|RegExp|etc)
                // Use `typeof` tho, b/c in old IE, DOM elements are not `instanceof Object`
                // like they are in modern browsers. Using `Object.create` on DOM elements
                // is...err...probably inappropriate, but the native version allows for it.
                throw new TypeError("Object prototype may only be an Object or null"); // same msg as Chrome
            }
            Type.prototype = prototype;
            object = new Type();
            // IE has no built-in implementation of `Object.getPrototypeOf`
            // neither `__proto__`, but this manually setting `__proto__` will
            // guarantee that `Object.getPrototypeOf` will work as expected with
            // objects created using `Object.create`
            /* eslint-disable no-proto */
            object.__proto__ = prototype;//jshint ignore:line
            /* eslint-enable no-proto */
        }

        if (properties !== void 0) {
            shim.object.defineProperties(object, properties);
        }

        return object;
    };
} else {
    shim.object.create = Object.create;
}

var doesDefinePropertyWork = function doesDefinePropertyWork(object) {
    try {
        Object.defineProperty(object, "sentinel", {});
        return "sentinel" in object;
    } catch (exception) {
        return false;
    }
};

// check whether defineProperty works if it"s given. Otherwise,
// shim partially.
var definePropertyFallback;
var definePropertiesFallback;
if (Object.defineProperty && isFuncNative(Object.defineProperty)) {
    var definePropertyWorksOnObject = doesDefinePropertyWork({});
    var definePropertyWorksOnDom = typeof document === "undefined" ||
        doesDefinePropertyWork(document.createElement("div"));
    if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
        definePropertyFallback = Object.defineProperty;
        definePropertiesFallback = Object.defineProperties;
    }
}

if (!Object.defineProperty || definePropertyFallback || !isFuncNative(Object.defineProperty)) {
    var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
    var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: ";
    var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined on this javascript engine";

    shim.object.defineProperty = function defineProperty(object, property, descriptor) {
        if ((typeof object !== "object" && typeof object !== "function") || object === null) {
            throw new TypeError(ERR_NON_OBJECT_TARGET + object);
        }
        if ((typeof descriptor !== "object" && typeof descriptor !== "function") || descriptor === null) {
            throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
        }
        // make a valiant attempt to use the real defineProperty
        // for I8"s DOM elements.
        if (definePropertyFallback) {
            try {
                return definePropertyFallback.call(Object, object, property, descriptor);
            } catch (exception) {
                // try the shim if the real one doesn't work
            }
        }

        // If it"s a data property.
        if ("value" in descriptor) {

            if (supportsAccessors && (lookupGetter(object, property) || lookupSetter(object, property))) {
                // As accessors are supported only on engines implementing
                // `__proto__` we can safely override `__proto__` while defining
                // a property to make sure that we don"t hit an inherited
                // accessor.
                /* jshint ignore:start */
                var prototype = object.__proto__;
                object.__proto__ = prototypeOfObject;
                // Deleting a property anyway since getter / setter may be
                // defined on object itself.
                delete object[property];
                object[property] = descriptor.value;
                // Setting original `__proto__` back now.
                object.__proto__ = prototype;
                /* jshint ignore:end */
            } else {
                object[property] = descriptor.value;
            }
        } else {
            if (!supportsAccessors && (("get" in descriptor) || ("set" in descriptor))) {
                throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
            }
            // If we got that far then getters and setters can be defined !!
            if ("get" in descriptor) {
                defineGetter(object, property, descriptor.get);
            }
            if ("set" in descriptor) {
                defineSetter(object, property, descriptor.set);
            }
        }
        return object;
    };
} else {
    shim.object.defineProperty = Object.defineProperty;
}

// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
shim.object.defineProperties = Object.defineProperties && definePropertiesFallback && isFuncNative(Object.defineProperties) ?
    Object.defineProperties :
    function defineProperties(object, properties) {
        // make a valiant attempt to use the real defineProperties
        if (definePropertiesFallback) {
            try {
                return definePropertiesFallback.call(Object, object, properties);
            } catch (exception) {
                // try the shim if the real one doesn't work
            }
        }

        array_forEach(shim.object.keys(properties), function (property) {
            if (property !== "__proto__") {
                shim.object.defineProperty(object, property, properties[property]);
            }
        });
        return object;
    };


// ES5 15.2.3.8
// http://es5.github.com/#x15.2.3.8
shim.object.seal = Object.seal && isFuncNative(Object.seal) ? Object.seal :
    function seal(object) {
        if (toObject(object) !== object) {
            throw new TypeError("Object.seal can only be called on Objects.");
        }
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };

// ES5 15.2.3.9
// http://es5.github.com/#x15.2.3.9
shim.object.freeze = Object.freeze && isFuncNative(Object.freeze) ? Object.freeze :
    function freeze(object) {
        if (toObject(object) !== object) {
            throw new TypeError("Object.freeze can only be called on Objects.");
        }
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };

// detect a Rhino bug and patch it
try {
    Object.freeze(function () {
    });
} catch (exception) {
    shim.object.freeze = (function (freezeObject) {
        return function freeze(object) {
            if (typeof object === "function") {
                return object;
            } else {
                return freezeObject(object);
            }
        };
    }(shim.object.freeze));
}

// ES5 15.2.3.10
// http://es5.github.com/#x15.2.3.10
shim.object.preventExtensions = Object.preventExtensions && isFuncNative(Object.preventExtensions) ?
    Object.preventExtensions : function preventExtensions(object) {
    if (toObject(object) !== object) {
        throw new TypeError("Object.preventExtensions can only be called on Objects.");
    }
    // this is misleading and breaks feature-detection, but
    // allows "securable" code to "gracefully" degrade to working
    // but insecure code.
    return object;
};

shim.object.isSealed = Object.isSealed && isFuncNative(Object.isSealed) ? Object.isSealed : function isSealed(object) {
    if (toObject(object) !== object) {
        throw new TypeError("Object.isSealed can only be called on Objects.");
    }
    return false;
};

// ES5 15.2.3.12
// http://es5.github.com/#x15.2.3.12
shim.object.isFrozen = Object.isFrozen && isFuncNative(Object.isFrozen) ? Object.isFrozen : function isFrozen(object) {
    if (toObject(object) !== object) {
        throw new TypeError("Object.isFrozen can only be called on Objects.");
    }
    return false;
};

// ES5 15.2.3.13
// http://es5.github.com/#x15.2.3.13
shim.object.isExtensible = Object.isExtensible && isFuncNative(Object.isExtensible) ? Object.isExtensible : function isExtensible(object) {
    // 1. If Type(O) is not Object throw a TypeError exception.
    if (toObject(object) !== object) {
        throw new TypeError("Object.isExtensible can only be called on Objects.");
    }
    // 2. Return the Boolean value of the [[Extensible]] internal property of O.
    var name = "";
    while (owns(object, name)) {
        name += "?";
    }
    object[name] = true;
    var returnValue = owns(object, name);
    delete object[name];
    return returnValue;
};

 (function(exports, Object, _){

var DependencyResolverException = function (message) {
  this.name = "DependencyResolverException";
  this.stack = null;
  this.message = message || "A dependency resolver exception has occurred.";
  var lines, i, tmp;
  if ((typeof navigator !== "undefined" && navigator.userAgent.indexOf("Chrome") !== -1) ||
    (typeof navigator === "undefined")) {
    lines = new Error().stack.split("\n");
    if (lines && lines.length > 2) {
      tmp = [];
      for (i = 2; i < lines.length; i++) {
        if (lines[i]) {
          tmp.push(lines[i].trim());
        }
      }
      this.stack = tmp.join("\n");
    }
  } else if (typeof navigator !== "undefined" && navigator.userAgent.indexOf("Firefox") !== -1) {
    lines = new Error().stack.split("\n");
    if (lines && lines.length > 1) {
      tmp = [];
      for (i = 1; i < lines.length; i++) {
        if (lines[i]) {
          tmp.push("at " + lines[i].trim().replace("@", " (") + ")");
        }
      }
      this.stack = tmp.join("\n");
    }
  } else if (typeof navigator !== "undefined" && navigator.userAgent.indexOf("Trident") !== -1) {
    try {
      throw new Error();
    } catch (error) {
      if ("stack" in error) {
        lines = error.stack.split("\n");
        if (lines && lines.length > 2) {
          tmp = [];
          for (i = 2; i < lines.length; i++) {
            if (lines[i]) {
              tmp.push(lines[i].trim());
            }
          }
          this.stack = tmp.join("\n");
        }
      } else {
        this.stack = "";
      }
    }
  } else {
    var error = new Error();
    if ("stack" in error) {
      this.stack = error.stack;
    } else {
      this.stack = "";
    }
  }
  Object.defineProperty(this, "name", { enumerable: true });
  Object.defineProperty(this, "message", { enumerable: true });
  Object.defineProperty(this, "stack", { enumerable: true });
  Object.seal(this);
};

DependencyResolverException.prototype = Object.create(Object.prototype, {
  toString: {
    value: function () {
      var msg = this.name + ": " + this.message;
      if (this.stack) {
        msg += "\n\t" + this.stack.replace(/\n/g, "\n\t");
      }
      return msg;
    },
    enumerable: true
  }

});

Object.seal(DependencyResolverException);
Object.seal(DependencyResolverException.prototype);

exports.DependencyResolverException = DependencyResolverException;

/* global DependencyResolverException */
var InstanceFactoryOptions = function (options) {
  this.name = null;
  this.type = null;
  this.parameters = null;
  if (options) {
    for (var propertyName in options) {
      if (propertyName in this) {
        this[propertyName] = options[propertyName];
      } else {
        throw new DependencyResolverException("Class \"InstanceFactoryOptions\" doesn\"t have a property \"" +
          propertyName + "\"");
      }
    }
  }
  Object.defineProperty(this, "name", { enumerable: true });
  Object.defineProperty(this, "type", { enumerable: true });
  Object.defineProperty(this, "parameters", { enumerable: true });
  Object.seal(this);
};

InstanceFactoryOptions.prototype = Object.create(Object.prototype, {
  toString: {
    value: function () {
      return "[object InstanceFactoryOptions]";
    },
    enumerable: true
  }

});

Object.seal(InstanceFactoryOptions);
Object.seal(InstanceFactoryOptions.prototype);

exports.InstanceFactoryOptions = InstanceFactoryOptions;


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

/* global DependencyResolverException */
var InstanceFactory = function () {
  Object.seal(this);
};

InstanceFactory.prototype = Object.create(Object.prototype, {

  create: {
    value: function (options) {
      if (!options) {
        throw new DependencyResolverException("Parameter \"options\" is not set");
      }
      if ("type" in options && !options.type) {
        throw new DependencyResolverException("Factory can't create object, because type is not set");
      }
      if (typeof options.type !== "function") {
        throw new DependencyResolverException("Factory can't create object, because given type is not a function");
      }
      if (options.type === Number || options.type === Date || options.type === Boolean || options.type === String ||
        options.type === Array || options.type === Function || options.type === RegExp) {
        throw new DependencyResolverException("Basic type can not be instantiated using a factory");
      }
      var instance = null;
      if (options.parameters && options.parameters.length > 0) {
        var ClassType = Function.bind.apply(options.type,[null].concat(options.parameters));
        instance = new ClassType();
      } else {
        instance = new options.type();
      }
      return instance;
    },
    enumerable: true
  },

  toString: {
    value: function () {
      return "[object InstanceFactory]";
    },
    enumerable: true
  }

});

Object.seal(InstanceFactory);
Object.seal(InstanceFactory.prototype);

exports.InstanceFactory = InstanceFactory;

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

/* global DependencyResolverException */
var NameTransformer = function () {
  Object.seal(this);
};

NameTransformer.prototype = Object.create(Object.prototype, {

  transform: {
    value: function (name) {
      if (!name) {
        throw new DependencyResolverException("Parameter \"name\" is not passed to the method \"transform\"");
      }
      return name;
    },
    enumerable: true
  },

  toString: {
    value: function () {
      return "[object NameTransformer]";
    },
    enumerable: true
  }

});

Object.seal(NameTransformer);
Object.seal(NameTransformer.prototype);

exports.NameTransformer = NameTransformer;

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

/* global DependencyResolverException, InstanceFactory, NameTransformer, InstanceFactoryOptions, debug, index, args */
var DependencyResolver = function (parent) {
    this.__parent = parent;
    this.__defaultFactory = null;
    this.__nameTransformer = null;
    this.__autowired = false;
    this.__container = null;
    this.__registration = null;
    this.__withProperties = false;
    this.__withConstructor = false;
    this.__parameter = null;
    this.__property = null;
    this.__function = null;
    if (parent) {
        this.__autowired = parent.isAutowired();
    }
    Object.defineProperty(this, "__parent", {enumerable: false});
    Object.defineProperty(this, "__defaultFactory", {enumerable: false});
    Object.defineProperty(this, "__nameTransformer", {enumerable: false});
    Object.defineProperty(this, "__autowired", {enumerable: false});
    Object.defineProperty(this, "__container", {enumerable: false});
    Object.defineProperty(this, "__registration", {enumerable: false});
    Object.defineProperty(this, "__withProperties", {enumerable: false});
    Object.defineProperty(this, "__withConstructor", {enumerable: false});
    Object.defineProperty(this, "__parameter", {enumerable: false});
    Object.defineProperty(this, "__property", {enumerable: false});
    Object.defineProperty(this, "__function", {enumerable: false});
    Object.seal(this);
};

DependencyResolver.prototype = Object.create(Object.prototype, {

    isAutowired: {
        value: function () {
            return this.__autowired;
        },
        enumerable: true
    },

    autowired: {
        value: function (value) {
            if (value === undefined || value === null) {
                value = true;
            }
            if (typeof value !== "boolean") {
                throw new DependencyResolverException("Parameter \"value\" passed to the method \"autowired\" has to " +
                    "be a \"boolean\"");
            }
            this.__autowired = value;
            return this;
        },
        enumerable: true
    },

    register: {
        value: function (name) {
            if (!name) {
                throw new DependencyResolverException("Parameter \"name\" is not passed to the method \"register\"");
            }
            if (typeof name !== "string") {
                throw new DependencyResolverException("Parameter \"name\" passed to the method \"register\" has to be " +
                    "a \"string\"");
            }
            if (!this.__container) {
                this.__container = Object.create(null);
            }
            this.__registration = {
                name: name,
                singleton: false,
                type: null,
                instance: null,
                factory: null,
                dependencies: null
            };
            if (!(name in this.__container)) {
                this.__container[name] = this.__registration;
            } else {
                if (!(this.__container[name] instanceof Array)) {
                    this.__container[name] = [this.__container[name]];
                }
                this.__container[name].push(this.__registration);
            }
            this.__withConstructor = false;
            this.__withProperties = false;
            this.__parameter = null;
            this.__property = null;
            return this;
        },
        enumerable: true
    },

    as: {
        value: function (type) {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!type) {
                throw new DependencyResolverException("Parameter \"type\" is not passed to the method \"as\" for " +
                    "registration \"" + this.__registration.name + "\"");
            }
            if (typeof type !== "function") {
                throw new DependencyResolverException("Parameter \"type\" passed to the method \"as\" has to be a \"function\" " +
                    "for registration \"" + this.__registration.name + "\"");
            }
            this.__registration.instance = null;
            this.__registration.type = type;
            this.__registration.singleton = false;
            this.__registration.dependencies = {
                parameters: [],
                properties: [],
                functions: []
            };
            if(type.$inject && type.$inject instanceof Array){
                this.__registration.dependencies.$inject = type.$inject;
            }
            this.__withConstructor = false;
            this.__withProperties = false;
            this.__parameter = null;
            this.__property = null;
            this.__function = null;
            return this;
        },
        enumerable: true
    },

    instance: {
        value: function (instance) {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (instance === null || instance === undefined) {
                throw new DependencyResolverException("Parameter \"instance\" is not passed to the method \"instance\" for " +
                    "registration \"" + this.__registration.name + "\"");
            }
            this.__registration.instance = instance;
            this.__registration.type = null;
            this.__registration.factory = null;
            this.__registration.singleton = true;
            this.__registration.dependencies = null;
            this.__withConstructor = false;
            this.__withProperties = false;
            this.__parameter = null;
            this.__property = null;
            this.__function = null;
            return this;
        },
        enumerable: true
    },

    asSingleton: {
        value: function () {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!this.__registration.type) {
                throw new DependencyResolverException("Type is not set for registration \"" +
                    this.__registration.name + "\"");
            }
            this.__registration.singleton = true;
            this.__withConstructor = false;
            this.__withProperties = false;
            this.__parameter = null;
            this.__property = null;
            this.__function = null;
            return this;
        },
        enumerable: true
    },

    withConstructor: {
        value: function () {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!this.__registration.type) {
                throw new DependencyResolverException("Type is not set for registration \"" +
                    this.__registration.name + "\"");
            }
            this.__withConstructor = true;
            this.__withProperties = false;
            this.__parameter = null;
            this.__property = null;
            this.__function = null;
            return this;
        },
        enumerable: true
    },

    param: {
        value: function (name) {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!this.__registration.type) {
                throw new DependencyResolverException("Type is not set for registration \"" + this.__registration.name + "\"");
            }
            var parameters = null,
                parameter = null,
                index;
            if (this.__withConstructor) {
                parameters = this.__registration.dependencies.parameters;
                if (this.__autowired && (name === undefined || name === null)) {
                    throw new DependencyResolverException("Parameter \"name\" has to be passed to the method, when dependency " +
                        "container has option \"autowired\" enabled");
                }
                parameter = this.__findParameter(name, parameters, this.__registration);
            } else if (this.__withProperties) {
                if (!this.__function) {
                    throw new DependencyResolverException("Function is not defined");
                }
                parameters = this.__function.parameters;
                parameter = this.__findParameter(name, this.__function.parameters, this.__registration);
            } else {
                throw new DependencyResolverException("Invocation of method \"withConstructor\" or \"withProperties\" " +
                    "is missing for registration \"" + this.__registration.name + "\"");
            }
            if (!parameter) {
                parameter = {
                    index: index,
                    name: name,
                    value: undefined,
                    reference: undefined
                };
                parameters.push(parameter);
            }
            this.__parameter = parameter;
            this.__property = null;
            return this;
        },
        enumerable: true
    },

    withProperties: {
        value: function () {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!this.__registration.type) {
                throw new DependencyResolverException("Type is not set for registration \"" + this.__registration.name + "\"");
            }
            this.__withProperties = true;
            this.__withConstructor = false;
            this.__parameter = null;
            this.__property = null;
            this.__function = null;
            return this;
        },
        enumerable: true
    },

    prop: {
        value: function (name) {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!name) {
                throw new DependencyResolverException("Parameter \"name\" is not passed to the method \"prop\" for " +
                    "registration \"" + this.__registration.name + "\"");
            }
            if (typeof name !== "string") {
                throw new DependencyResolverException("Parameter \"name\" passed to the method \"prop\" has to be" +
                    " a \"string\" for registration \"" + this.__registration.name + "\"");
            }
            if (!this.__registration.type) {
                throw new DependencyResolverException("Type is not set for registration \"" + this.__registration.name + "\"");
            }
            if (!this.__withProperties) {
                throw new DependencyResolverException("Invocation of method \"withProperties\" is missing for " +
                    "registration \"" + this.__registration.name + "\"");
            }
            var properties = this.__registration.dependencies.properties,
                property = null;
            for (var i = 0; i < properties.length; i++) {
                if (properties[i].name === name) {
                    property = properties[i];
                    break;
                }
            }
            if (!property) {
                property = {
                    name: name,
                    value: undefined,
                    reference: undefined
                };
                properties.push(property);
            }
            this.__parameter = null;
            this.__property = property;
            this.__function = null;
            return this;
        },
        enumerable: true
    },

    func: {
        value: function (name) {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!name) {
                throw new DependencyResolverException("Parameter \"name\" is not passed to the method \"func\" for " +
                    "registration \"" + this.__registration.name + "\"");
            }
            if (typeof name !== "string") {
                throw new DependencyResolverException("Parameter \"name\" passed to the method \"func\" has to be" +
                    " a \"string\" for registration \"" + this.__registration.name + "\"");
            }
            if (!this.__registration.type) {
                throw new DependencyResolverException("Type is not set for registration \"" + this.__registration.name + "\"");
            }
            if (!this.__withProperties) {
                throw new DependencyResolverException("Invocation of method \"withProperties\" is missing for " +
                    "registration \"" + this.__registration.name + "\"");
            }
            var functions = this.__registration.dependencies.functions,
                func = null;
            for (var i = 0; i < functions.length; i++) {
                if (functions[i].name === name) {
                    func = functions[i];
                    break;
                }
            }
            if (!func) {
                func = {
                    name: name,
                    parameters: []
                };
                functions.push(func);
            }
            this.__parameter = null;
            this.__property = null;
            this.__function = func;
            return this;
        },
        enumerable: true
    },

    val: {
        value: function (instance) {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (instance === null || instance === undefined) {
                throw new DependencyResolverException("Parameter \"instance\" is not passed to the method \"val\"");
            }
            if (!this.__withProperties && !this.__withConstructor) {
                throw new DependencyResolverException("Invocation of method withConstructor\" or \"withProperties\" " +
                    "is missing");
            }
            if (this.__withConstructor && !this.__parameter) {
                throw new DependencyResolverException("Parameter is not defined");
            }
            if (this.__withProperties && !this.__parameter && !this.__property) {
                throw new DependencyResolverException("Parameter or property is not defined");
            }
            if (this.__parameter) {
                this.__parameter.value = instance;
                this.__parameter.reference = undefined;
            } else if (this.__property) {
                this.__property.value = instance;
                this.__property.reference = undefined;
            }
            return this;
        },
        enumerable: true
    },

    ref: {
        value: function (name) {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!name) {
                throw new DependencyResolverException("Parameter \"name\" is not passed to the method \"ref\" for " +
                    "registration \"" + this.__registration.name + "\"");
            }
            if (typeof name !== "string") {
                throw new DependencyResolverException("Parameter \"name\" passed to the method \"ref\" has to " +
                    "be a \"string\" for registration \"" + this.__registration.name + "\"");
            }
            if (!this.__withProperties && !this.__withConstructor) {
                throw new DependencyResolverException("Invocation of method \"withConstructor\" or \"withProperties\" " +
                    "is missing for registration \"" + this.__registration.name + "\"");
            }
            if (this.__withConstructor && !this.__parameter) {
                throw new DependencyResolverException("Parameter is not defined");
            }
            if (this.__withProperties && !this.__parameter && !this.__property) {
                throw new DependencyResolverException("Parameter or property is not defined");
            }
            if (!this.contains(name)) {
                throw new DependencyResolverException("Type or instance is not registered with name \"" + name + "\"");
            }
            if (this.__parameter) {
                this.__parameter.value = undefined;
                this.__parameter.reference = name;
            } else if (this.__property) {
                this.__property.value = undefined;
                this.__property.reference = name;
            }
            return this;
        },
        enumerable: true
    },

    setFactory: {
        value: function (factory) {
            if (!this.__registration) {
                throw new DependencyResolverException("Registration's name is not defined");
            }
            if (!factory) {
                throw new DependencyResolverException("Parameter \"factory\" is not passed to the method \"setFactory\"");
            }
            if (typeof factory !== "function" && typeof factory !== "object") {
                throw new DependencyResolverException("Parameter \"factory\" passed to the method \"setFactory\" has to be " +
                    "a \"function\" or \"object\"");
            }
            if (typeof factory === "object" && !("create" in factory)) {
                throw new DependencyResolverException("Factory's instance passed to the method \"setFactory\" has to have " +
                    "a method \"create\"");
            }
            if (!this.__registration.type) {
                throw new DependencyResolverException("Type is not set for registration \"" + this.__registration.name);
            }
            this.__registration.factory = factory;
            this.__withConstructor = false;
            this.__withProperties = false;
            this.__parameter = null;
            this.__property = null;
            this.__function = null;
            return this;
        },
        enumerable: true
    },

    create: {
        value: function () {
            return new DependencyResolver(this);
        },
        enumerable: true
    },

    inject: {
        value: function (func) {
            if (!func) {
                throw new DependencyResolverException("Parameter \"func\" is not passed to method \"inject\"");
            }
            var i,
                parameters = [],
                context = {resolving: []};
            if (func instanceof Array) {
                if (func.length === 0) {
                    throw new DependencyResolverException("The array passed to the method \"inject\" can't be empty");
                }
                for (i = 0; i < func.length - 1; i++) {
                    parameters.push(func[i]);
                }
                func = func[func.length - 1];
                if (typeof func !== "function") {
                    throw new DependencyResolverException("The last item of the array passed to the method \"inject\" has " +
                        "to be a \"function\"");
                }
                for (i = 0; i < parameters.length; i++) {
                    if (typeof parameters[i] === "string" && this.contains(parameters[i])) {
                        parameters[i] = this.__resolve(parameters[i], context);
                    }
                }
                func.apply(null, parameters);
            } else {
                var registration = null;
                if (arguments.length === 2 && typeof arguments[1] === "string") {
                    var name = arguments[1];
                    if (!this.contains(name)) {
                        throw new DependencyResolverException("Type with name \"" + name + "\" is not registered");
                    }
                    registration = this.getRegistration(name);
                }
                var dependencyName;
                if (typeof func === "function") {
                    if (registration) {
                        parameters = this.__getConstructorParameters(registration, context);
                    } else {
                        var args = this.__getFunctionArguments(func);
                        for (i = 0; i < args.length; i++) {
                            dependencyName = this.__resolveDependencyName(args[i]);
                            if (this.contains(dependencyName)) {
                                parameters.push(this.__resolve(dependencyName, context));
                            } else {
                                parameters.push(null);
                            }
                        }
                    }
                    func.apply(null, parameters);
                } else if (typeof func === "object") {
                    if (registration) {
                        this.__setProperties(func, registration, context);
                        this.__invokeFunctions(func, registration, context);
                    } else {
                        for (var propertyName in func) {//eslint-disable-line guard-for-in
                            dependencyName = this.__resolveDependencyName(propertyName);
                            if (this.contains(dependencyName)) {
                                parameters.push({
                                    name: propertyName,
                                    value: this.__resolve(dependencyName, context)
                                });
                            }
                        }
                        if (parameters.length > 0) {
                            for (i = 0; i < parameters.length; i++) {
                                func[parameters[i].name] = parameters[i].value;
                            }
                        }
                    }
                } else {
                    throw new DependencyResolverException("Invalid parameter has been passed to the method \"inject\"");
                }
            }
            return this;
        },
        enumerable: true
    },

    contains: {
        value: function (name) {
            if (!name) {
                throw new DependencyResolverException("Parameter \"name\" is not passed to the method \"contains\"");
            }
            if (typeof name !== "string") {
                throw new DependencyResolverException("Parameter \"name\" passed to the  has to be a \"string\"");
            }
            var has = false;
            if (this.__container) {
                if (name in this.__container) {
                    has = true;
                }
            }
            if (!has && this.__parent) {
                if (!("contains" in this.__parent)) {
                    throw new DependencyResolverException("Dependency resolver's parent doesn't have a method \"contains\"");
                }
                has = this.__parent.contains(name);
            }
            return has;
        },
        enumerable: true
    },

    resolve: {
        value: function (name) {
            return this.__resolve(name, {
                resolving: []
            });
        },
        enumerable: true
    },

    getDefaultFactory: {
        value: function () {
            var factory = null;
            if (this.__defaultFactory) {
                factory = this.__defaultFactory;
            } else if (this.__parent) {
                if (!("getDefaultFactory" in this.__parent)) {
                    throw new DependencyResolverException("Dependency resolver's parent doesn't have a " +
                        "method \"getDefaultFactory\"");
                }
                factory = this.__parent.getDefaultFactory();
            } else {
                factory = new InstanceFactory();
            }
            return factory;
        },
        enumerable: true
    },

    setDefaultFactory: {
        value: function (factory) {
            if (!factory) {
                throw new DependencyResolverException("Parameter \"factory\" is not passed to the method " +
                    "\"setDefaultFactory\"");
            }
            if (typeof factory !== "function" && typeof factory !== "object") {
                throw new DependencyResolverException("Parameter \"factory\" passed to the method \"setDefaultFactory\" has " +
                    " to be a \"function\" or \"object\"");
            }
            if (typeof factory === "object" && !("create" in factory)) {
                throw new DependencyResolverException("Factory's instance passed to the method \"setDefaultFactory\" has " +
                    "to have a method \"create\"");
            }
            this.__defaultFactory = factory;
            return this;
        },
        enumerable: true
    },

    getNameTransformer: {
        value: function () {
            var transformer = null;
            if (this.__nameTransformer) {
                transformer = this.__nameTransformer;
            } else if (this.__parent) {
                if (!("getNameTransformer" in this.__parent)) {
                    throw new DependencyResolverException("Dependency resolver's parent doesn't have a " +
                        "method \"getNameTransformer\"");
                }
                transformer = this.__parent.getNameTransformer();
            } else {
                transformer = new NameTransformer();
            }
            return transformer;
        },
        enumerable: true
    },

    setNameTransformer: {
        value: function (transformer) {
            if (!transformer) {
                throw new DependencyResolverException("Parameter \"transformer\" is not passed to the method " +
                    "\"setNameTransformer\"");
            }
            if (typeof transformer !== "function" && typeof transformer !== "object") {
                throw new DependencyResolverException("Parameter \"transformer\" passed to the method \"setNameTransformer\" " +
                    "has to be a \"function\" or \"object\"");
            }
            if (typeof transformer === "object" && !("transform" in transformer)) {
                throw new DependencyResolverException("Transformers's instance passed to the method \"setNameTransformer\" " +
                    "has to have a method \"transform\"");
            }
            this.__nameTransformer = transformer;
            return this;
        },
        enumerable: true
    },

    getRegistration: {
        value: function (name) {
            var registration = null;
            if (this.__container && name in this.__container) {
                registration = this.__container[name];
            } else if (this.__parent) {
                if (!("getRegistration" in this.__parent)) {
                    throw new DependencyResolverException("Dependency resolver\"s parent doesn't have a " +
                        "method \"getRegistration\"");
                }
                registration = this.__parent.getRegistration(name);
            }
            return registration;
        },
        enumerable: true
    },

    dispose: {
        value: function () {
            var registration = null,
                i = 0;
            if (this.__container) {
                for (var name in this.__container) {
                    if (!(this.__container[name] instanceof Array)) {
                        registration = this.__container[name];
                        if (registration.instance && ("dispose" in registration.instance)) {
                            registration.instance.dispose();
                        }
                        registration.instance = null;
                        registration.factory = null;
                    } else {
                        var registrations = this.__container[name];
                        for (i = 0; i < registrations.length; i++) {
                            registration = registrations[i];
                            if (registration.instance && ("dispose" in registration.instance)) {
                                registration.instance.dispose();
                            }
                            registration.instance = null;
                            registration.factory = null;
                        }
                    }
                }
            }
            this.__parent = null;
            this.__defaultFactory = null;
            this.__nameTransformer = null;
            this.__autowired = false;
            this.__container = null;
            this.__registration = null;
            this.__withProperties = false;
            this.__withConstructor = false;
            this.__parameter = null;
            this.__property = null;
            this.__function = null;
        },
        enumerable: true
    },

    toString: {
        value: function () {
            return "[object DependencyResolver]";
        },
        enumerable: true
    },

    __getFunctionArguments: {
        value: function (func) {
            if (func && typeof func === "function" && "toString" in func) {
                var str = null;
                var result = _.function_toString.call(func)
                    .match(/^[\s\(]*function[^(]*\(([^)]*)\)/);
                if (result && result.length > 1) {
                    str = result[1]
                        .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, "")
                        .replace(/\s+/g, "");
                }
                if (str) {
                    return str.split(",");
                }
            }
            return [];
        }
    },

    __isClass: {
        value: function (func) {
            return func && typeof func === 'function' && 'toString' in func
                && /^class\s/.test(func.toString());
        }
    },

    __getClassConstructorArguments: {
        value: function (constr) {
            if (constr && typeof constr === 'function' && 'toString' in constr) {
                var str = null;
                var result = constr
                    .toString()
                    .match(/^class[\s\S]*constructor[\s]*\(([^)]*)\)/);
                if (result && result.length > 1) {
                    str = result[1]
                        .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
                        .replace(/\s+/g, '');
                }
                if (str) {
                    return str.split(',');
                }
            }
            return [];
        }
    },

    __resolve: {
        value: function (name, context) {
            if (!name) {
                throw new DependencyResolverException("Parameter \"name\" is not passed to the method \"resolve\"");
            }
            if (typeof name !== "string") {
                throw new DependencyResolverException("Parameter \"name\" passed to the method \"resolve\" has to be " +
                    "a \"string\"");
            }
            if (debug && console && "log" in console) {
                var message = "-> \"" + name + "\"";
                for (var j = 0; j < context.resolving.length; j++) {
                    message = "  " + message;
                }
                console.log(message);
            }
            if (!this.contains(name)) {
                throw new DependencyResolverException("Type or instance with name \"" + name + "\" is not registered");
            }
            var index = _.indexOf(context.resolving, name);
            if (index !== -1) {
                throw new DependencyResolverException("Can not resolve circular dependency \"" + name + "\"");
            }
            context.resolving.push(name);
            var instance = null,
                registration = this.getRegistration(name);
            if (!(registration instanceof Array)) {
                instance = this.__resolveInstance(registration, context);
            } else {
                instance = [];
                for (var i = 0; i < registration.length; i++) {
                    instance.push(this.__resolveInstance(registration[i], context));
                }
            }
            index = _.indexOf(context.resolving, name);
            if (index > -1) {
                context.resolving.splice(index, 1);
            }
            return instance;
        }
    },

    __resolveInstance: {
        value: function (registration, context) {
            var instance = null;
            if (registration.instance !== null && registration.instance !== undefined) {
                instance = registration.instance;
            } else {
                instance = this.__createInstance(registration, context);
                this.__setProperties(instance, registration, context);
                this.__invokeFunctions(instance, registration, context);
                if (instance && registration.singleton) {
                    registration.instance = instance;
                }
                if (!instance) {
                    throw new DependencyResolverException("Failed to resolve instance by name \"" + registration.name + "\"");
                }
            }
            return instance;
        }
    },

    __resolveDependencyName: {
        value: function (name) {
            var transform = this.getNameTransformer();
            if (typeof transform === "function") {
                name = transform(name);
            } else {
                name = transform.transform(name);
            }
            if (!name) {
                throw new DependencyResolverException("Failed to resolve dependency name");
            }
            return name;
        }
    },

    __createInstance: {
        value: function (registration, context) {
            var i,//eslint-disable-line no-unused-vars
                instance;
            var parameters = this.__getConstructorParameters(registration, context);
            var options = new InstanceFactoryOptions({
                name: registration.name,
                type: registration.type,
                parameters: parameters
            });
            var factory = null;
            if (registration.factory) {
                factory = registration.factory;
            } else {
                factory = this.getDefaultFactory();
            }
            if (factory) {
                if (typeof factory === "function") {
                    instance = factory.call(null, options);
                } else {
                    instance = factory.create(options);
                }
            } else {
                throw new DependencyResolverException("Default factory is not defined");
            }
            return instance;
        }
    },

    __getConstructorParameters: {
        value: function (registration, context) {
            var parameters = [];
            if (registration && registration.dependencies) {
                var i,
                    parameter,
                    value,
                    args,
                    index;
                if (this.__autowired) {
                    args = this.__isClass(registration.type) ?
                        this.__getClassConstructorArguments(registration.type) : this.__getFunctionArguments(registration.type);
                    if(registration.dependencies.$inject){
                        if(registration.dependencies.$inject.length !== args.length){
                            throw new DependencyResolverException("Constructor in registration \"" + registration.name +
                                "\" have $inject property with wrong arguments length.");
                        }
                        args = registration.dependencies.$inject;
                    }
                    var dependencyName;
                    for (i = 0; i < args.length; i++) {
                        dependencyName = this.__resolveDependencyName(args[i]);
                        if (this.contains(dependencyName)) {
                            parameters.push(this.__resolve(dependencyName, context));
                        } else {
                            parameters.push(null);
                        }
                    }
                }
                for (i = 0; i < registration.dependencies.parameters.length; i++) {
                    parameter = registration.dependencies.parameters[i];
                    if (parameter.value !== undefined) {
                        value = parameter.value;
                    } else if (parameter.reference !== undefined) {
                        value = this.__resolve(parameter.reference, context);
                    } else {
                        value = null;
                    }
                    if (parameter.index !== undefined && parameter.index !== null) {
                        parameters[parameter.index] = value;
                    } else if (parameter.name) {
                        if (!args) {
                            args = this.__getFunctionArguments(registration.type);
                        }
                        index = _.indexOf(args, parameter.name);
                        if (index === -1) {
                            throw new DependencyResolverException("Constructor in registration \"" + registration.name +
                                "\" doesn't have defined parameter \"" + parameter.name + "\"");
                        }
                        parameters[index] = value;
                    } else {
                        parameters.push(value);
                    }
                }
            }
            return parameters;
        }
    },

    __hasProperty: {
        value: function (registration, name) {
            var has = false;
            if (registration.dependencies) {
                var property;
                for (var i = 0; i < registration.dependencies.properties.length; i++) {
                    property = registration.dependencies.properties[i];
                    if (property.name === name) {
                        has = true;
                        break;
                    }
                }
            }
            return has;
        }
    },

    __findParameter: {
        value: function (name, parameters, registration) {
            var parameter = null;
            if (name !== null && name !== undefined && registration !== null) {
                if (typeof name === "number") {
                    index = name;
                    name = undefined;
                    if (index < 0) {
                        throw new DependencyResolverException("Parameter \"name\" passed to the method \"param\" is out of " +
                            "range for registration \"" + registration.name + "\"");
                    }
                    if (index < parameters.length) {
                        parameter = parameters[index];
                    }
                } else if (typeof name === "string") {
                    for (var i = 0; i < parameters.length; i++) {
                        if (parameters[i].name === name) {
                            parameter = parameters[i];
                            break;
                        }
                    }
                } else {
                    throw new DependencyResolverException("Parameter \"name\" passed to the method \"param\" has to " +
                        "be a \"number\" or a \"string\" for registration \"" + registration.name + "\"");
                }
            }
            return parameter;
        }
    },

    __setProperties: {
        value: function (instance, registration, context) {
            if (registration.dependencies) {
                if (this.__autowired) {
                    for (var propertyName in instance) {//eslint-disable-line guard-for-in
                        var dependencyName = this.__resolveDependencyName(propertyName);
                        if (!this.__hasProperty(registration, propertyName) && this.contains(dependencyName)) {
                            instance[propertyName] = this.__resolve(dependencyName, context);
                        }
                    }
                }
                for (var i = 0; i < registration.dependencies.properties.length; i++) {
                    var property = registration.dependencies.properties[i];
                    if (!(property.name in instance)) {
                        throw new DependencyResolverException("Resolved object \"" + registration.name +
                            "\" doesn't have property \"" + property.name + "\"");
                    }
                    if (property.value !== undefined) {
                        instance[property.name] = property.value;
                    } else if (property.reference !== undefined) {
                        instance[property.name] = this.__resolve(property.reference, context);
                    }
                }
            }
        }
    },

    __invokeFunctions: {
        value: function (instance, registration, context) {
            if (registration.dependencies) {
                var i,
                    j,
                    parameter,
                    value;
                for (i = 0; i < registration.dependencies.functions.length; i++) {
                    var func = registration.dependencies.functions[i];
                    if (!(func.name in instance)) {
                        throw new DependencyResolverException("Resolved object \"" + registration.name +
                            "\" doesn't have function \"" + func.name + "\"");
                    }
                    var parameters = [];
                    for (j = 0; j < func.parameters.length; j++) {
                        parameter = func.parameters[j];
                        if (parameter.value !== undefined) {
                            value = parameter.value;
                        } else if (parameter.reference !== undefined) {
                            value = this.__resolve(parameter.reference, context);
                        } else {
                            value = null;
                        }
                        if (parameter.index !== undefined && parameter.index !== null) {
                            parameters[parameter.index] = value;
                        } else if (parameter.name) {
                            if (!args) {
                                args = this.__getFunctionArguments(instance[func.name]);//eslint-disable-line
                            }
                            index = _.indexOf(args, parameter.name);
                            if (index === -1) {
                                throw new DependencyResolverException("Function doesn't have defined parameter \"" +
                                    parameter.name + "\"");
                            }
                            parameters[index] = value;
                        } else {
                            parameters.push(value);
                        }
                    }
                    instance[func.name].apply(instance, parameters);
                }
            }
        }
    }

});

Object.seal(DependencyResolver);
Object.seal(DependencyResolver.prototype);

exports.DependencyResolver = DependencyResolver;

/* global DependencyResolver*/
var defaultDependencyResolver = null,
    debug = false;

Object.defineProperty(exports, "getDefaultDependencyResolver", {
  value: function () {
    if (!defaultDependencyResolver) {
      defaultDependencyResolver = new DependencyResolver();
    }
    return defaultDependencyResolver;
  },
  enumerable: true
});

Object.defineProperty(exports, "setDefaultDependencyResolver", {
  value: function (value) {
    defaultDependencyResolver = value;
  },
  enumerable: true
});

Object.defineProperty(exports, "isAutowired", {
  value: function () {
    return exports
      .getDefaultDependencyResolver()
      .isAutowired();
  },
  enumerable: true
});

Object.defineProperty(exports, "autowired", {
  value: function (value) {
    return exports
      .getDefaultDependencyResolver()
      .autowired(value);
  },
  enumerable: true
});

Object.defineProperty(exports, "register", {
  value: function (name) {
    return exports
      .getDefaultDependencyResolver()
      .register(name);
  },
  enumerable: true
});

Object.defineProperty(exports, "as", {
  value: function (type) {
    return exports
      .getDefaultDependencyResolver()
      .as(type);
  },
  enumerable: true
});

Object.defineProperty(exports, "instance", {
  value: function (instance) {
    return exports
      .getDefaultDependencyResolver()
      .instance(instance);
  },
  enumerable: true
});

Object.defineProperty(exports, "asSingleton", {
  value: function () {
    return exports
      .getDefaultDependencyResolver()
      .asSingleton();
  },
  enumerable: true
});

Object.defineProperty(exports, "withConstructor", {
  value: function () {
    return exports
      .getDefaultDependencyResolver()
      .withConstructor();
  },
  enumerable: true
});

Object.defineProperty(exports, "param", {
  value: function (name) {
    return exports
      .getDefaultDependencyResolver()
      .param(name);
  },
  enumerable: true
});

Object.defineProperty(exports, "withProperties", {
  value: function () {
    return exports
      .getDefaultDependencyResolver()
      .withProperties();
  },
  enumerable: true
});

Object.defineProperty(exports, "prop", {
  value: function (name) {
    return exports
      .getDefaultDependencyResolver()
      .prop(name);
  }
});

Object.defineProperty(exports, "func", {
  value: function (name) {
    return exports
      .getDefaultDependencyResolver()
      .func(name);
  }
});

Object.defineProperty(exports, "val", {
  value: function (instance) {
    return exports
      .getDefaultDependencyResolver()
      .val(instance);
  },
  enumerable: true
});

Object.defineProperty(exports, "ref", {
  value: function (name) {
    return exports
      .getDefaultDependencyResolver()
      .ref(name);
  },
  enumerable: true
});

Object.defineProperty(exports, "setFactory", {
  value: function (factory) {
    return exports
      .getDefaultDependencyResolver()
      .setFactory(factory);
  },
  enumerable: true
});

Object.defineProperty(exports, "create", {
  value: function () {
    return exports
      .getDefaultDependencyResolver()
      .create();
  },
  enumerable: true
});

Object.defineProperty(exports, "inject", {
  value: function (func, name) {
    return exports
      .getDefaultDependencyResolver()
      .inject(func, name);
  },
  enumerable: true
});

Object.defineProperty(exports, "contains", {
  value: function (name) {
    return exports
      .getDefaultDependencyResolver()
      .contains(name);
  },
  enumerable: true
});

Object.defineProperty(exports, "resolve", {
  value: function (name) {
    return exports
      .getDefaultDependencyResolver()
      .resolve(name);
  },
  enumerable: true
});

Object.defineProperty(exports, "getDefaultFactory", {
  value: function () {
    return exports
      .getDefaultDependencyResolver()
      .getDefaultFactory();
  },
  enumerable: true
});

Object.defineProperty(exports, "setDefaultFactory", {
  value: function (factory) {
    return exports
      .getDefaultDependencyResolver()
      .setDefaultFactory(factory);
  },
  enumerable: true
});

Object.defineProperty(exports, "getNameTransformer", {
  value: function () {
    return exports
      .getDefaultDependencyResolver()
      .getNameTransformer();
  },
  enumerable: true
});

Object.defineProperty(exports, "setNameTransformer", {
  value: function (transformer) {
    return exports
      .getDefaultDependencyResolver()
      .setNameTransformer(transformer);
  },
  enumerable: true
});

Object.defineProperty(exports, "getRegistration", {
  value: function (name) {
    return exports
      .getDefaultDependencyResolver()
      .getRegistration(name);
  },
  enumerable: true
});

Object.defineProperty(exports, "debug", {
  value:debug,
  enumerable: true
});

Object.defineProperty(exports, "dispose", {
  value: function () {
    return exports
      .getDefaultDependencyResolver()
      .dispose();
  },
  enumerable: true
});

	} (exports, shim.object, shim._));

module.exports = exports;