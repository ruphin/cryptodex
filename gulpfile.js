'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var inline = require('gulp-inline');
var jsmin = require('gulp-jsmin')
var minifyCss = require('gulp-minify-css')
var autoprefixer = require('gulp-autoprefixer');
var del = require('del');
// var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var path = require('path');
var historyApiFallback = require('connect-history-api-fallback');


var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var SOURCE = 'src';
var source = function(...subpaths) {
  return subpaths.length == 0 ? SOURCE : path.join(SOURCE, ...subpaths);
};

// Watch files for changes & reload
gulp.task('serve', function() {
  browserSync({
    port: 5000,
    notify: false,
    open: false,
    logPrefix: 'APP',
    files: [source('*'), 'index.html'],
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    server: {
      baseDir: [source(), 'bower_components', ''],
      middleware: [historyApiFallback()]
    }
  });

  gulp.watch(source('**/*'), browserSync.reload);
  gulp.watch('index.html', browserSync.reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function() {
  browserSync({
    port: 5000,
    notify: false,
    logPrefix: 'APP',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: [dist()],
      middleware: [historyApiFallback()]
    }
  });
});

// Build production files, the default task
gulp.task('default', function(cb) {
  // Uncomment 'cache-config' if you are going to use service workers.
  gulp.src(source('*.html'))
  .pipe(inline({
    base: source(),
    js: jsmin,
    css: [minifyCss, autoprefixer({ browsers: AUTOPREFIXER_BROWSERS })],
    disabledTypes: ['svg', 'img'], // Only inline css files
    ignore: ['../gluonjs/gluon.min.js']
  }))
  .pipe(gulp.dest('.'));
});

// Load tasks for web-component-tester
// Adds tasks for `gulp test:local` and `gulp test:remote`
//require('web-component-tester').gulp.init(gulp);
