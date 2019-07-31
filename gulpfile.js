const gulp = require("gulp");
const eslint = require("gulp-eslint");
const del = require("del");
const concat = require("gulp-concat-util");
const pkg = require("./package.json");
const os = require("os");
const fs = require("fs");
const uglify = require("gulp-uglify");
const sourcemaps = require("gulp-sourcemaps");
const rename = require("gulp-rename");
const Server = require("karma").Server;
const gulpSync = require("gulp-sync")(gulp);
const shim = "./src/shim.js";
const jasmine = require("gulp-jasmine");
const src = [
    "./src/DependencyResolverException.js",
    "./src/InstanceFactoryOptions.js",
    "./src/IInstanceFactory.js",
    "./src/InstanceFactory.js",
    "./src/INameTransformer.js",
    "./src/NameTransformer.js",
    "./src/IDependencyResolver.js",
    "./src/DependencyResolver.js",
    "./src/DefaultDependencyResolver.js"
];
gulp.task("eslint:src", function () {
    return gulp.src(src)
        .pipe(eslint({
            useEslintrc: true
        }))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});
gulp.task("eslint:spec", function () {
    return gulp.src("./spec/**/*.spec.js")
        .pipe(eslint({
            useEslintrc: true
        }))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});
gulp.task("clean:browser-lib", function () {
    return del([
        "./" + pkg.name + ".js",
        "./" + pkg.name + ".min.js",
        "./" + pkg.name + ".map"
    ]);
});
gulp.task("clean:node-lib", function () {
    return del([
        "./lib/" + pkg.name + ".js"
    ]);
});
gulp.task("concat:browser-lib", function () {
    return gulp.src(src.concat(["./src/noConflict.js"]))
        .pipe(concat(pkg.name + '.js', {
            sep: os.EOL + os.EOL,
            process: function (src, filepath) {
                var lines = src.split(os.EOL);
                for (var i = 0; i < lines.length; i++) {
                    lines[i] = '	 ' + lines[i];
                }
                return lines.join(os.EOL);
            }
        }))
        .pipe(concat.header("/* di4js (ver. " + pkg.version + "). https://github.com/flamencist/di4es */" + os.EOL + os.EOL +
            "(function () {" + os.EOL + os.EOL +
            "  \"use strict\";" + os.EOL + os.EOL +
            "  var exports = {};" + os.EOL + os.EOL +
            "  if (!(\"version\" in exports)) {" + os.EOL +
            "    exports.version = \"" + pkg.version + "\";" + os.EOL +
            "  }" + os.EOL + os.EOL +
            "  " + fs.readFileSync(shim) + os.EOL + os.EOL +
            " (function(exports, Object, _){"
            + os.EOL + os.EOL))
        .pipe(concat.footer(os.EOL + os.EOL +
            "	} (exports, shim.object, shim._));" +
            os.EOL + os.EOL +
            " window.di = exports;" +
            os.EOL + os.EOL +
            "} ());" +
            os.EOL + os.EOL))
        .pipe(gulp.dest("./"));
});
gulp.task("concat:node-lib", function () {
    return gulp.src(src)
        .pipe(concat(pkg.name + ".js", {
            sep: os.EOL + os.EOL
        }))
        .pipe(concat.header("'use strict';" + os.EOL + os.EOL +
            "var exports = {};" + os.EOL + os.EOL +
            "exports.version = '" + pkg.version + "';" + os.EOL + os.EOL +
            "  " + fs.readFileSync(shim) + os.EOL + os.EOL +
            " (function(exports, Object, _){"
            + os.EOL + os.EOL))
        .pipe(concat.footer(
            os.EOL + os.EOL +
            "	} (exports, shim.object, shim._));" +
            os.EOL + os.EOL +
            "module.exports = exports;"
        ))
        .pipe(gulp.dest("./lib/"))
});
gulp.task("spec", function (done) {
    new Server({
        configFile: __dirname + "/karma.conf.js",
        singleRun: true
    }, done).start();
});
gulp.task("spec-min", function (done) {
    new Server({
        configFile: __dirname + "/karma-min.conf.js",
        singleRun: true
    }, done).start();
});
gulp.task("spec-node", function () {
    return gulp.src("./spec/*.spec.js")
        .pipe(jasmine());
});
gulp.task("uglify", function () {
    gulp.src("./" + pkg.name + ".js")
        .pipe(sourcemaps.init())
        .pipe(sourcemaps.write("./", {
            mapFile: function (mapFilePath) {
                return mapFilePath.replace('.js.map', '.map');
            }
        }))
        .pipe(gulp.dest("./"));
    return gulp.src("./" + pkg.name + ".js")
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify({
            mangle: true,
            compress: true,
            outSourceMap: true
        }))
        .pipe(gulp.dest("./"));
});
gulp.task("default",function(){
    return gulpSync.sync([
        ["eslint:src","eslint:spec"],
        ["clean:browser-lib","clean:node-lib"],
        ["concat:browser-lib","concat:node-lib"],
        "uglify",
        ["spec","spec-min","spec-node"]
    ]);
});