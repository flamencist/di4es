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