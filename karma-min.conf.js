/* global module */
module.exports = function(config) {
  config.set({
    browsers:  ["PhantomJS"],
    frameworks: ["jasmine"],
    files: [
      "di4es.min.js",
      "./spec/di.spec.js"
    ]
  });};