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