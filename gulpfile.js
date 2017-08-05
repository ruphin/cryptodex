'use strict';

// Include Gulp & tools we'll use
const gulp = require('gulp');
const fs = require('fs');
const replace = require('gulp-replace');
const del = require('del');
const browserSync = require('browser-sync');
const path = require('path');
const historyApiFallback = require('connect-history-api-fallback');


const AUTOPREFIXER_BROWSERS = [
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

const SOURCE = 'src';
const source = function(...subpaths) {
  return subpaths.length == 0 ? SOURCE : path.join(SOURCE, ...subpaths);
};

const TMP = '.tmp'
const tmp = function(...subpaths) {
  return subpaths.length == 0 ? TMP : path.join(TMP, ...subpaths);
};

const DIST = 'dist'
const dist = function(...subpaths) {
  return subpaths.length == 0 ? DIST : path.join(DIST, ...subpaths);
};

// Serve from source
gulp.task('serve', function() {
  browserSync({
    port: 5000,
    notify: false,
    open: false,
    logPrefix: 'APP',
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
    open: false,
    logPrefix: 'APP',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    server: {
      baseDir: [dist(), 'bower_components', ''],
      middleware: [historyApiFallback()]
    }
  });
  gulp.watch(source('**/*'), ['default', browserSync.reload]);
  gulp.watch('index.html', browserSync.reload);
});

// Build production files
gulp.task('default', function(cb) {
  del(dist('*'));
  return gulp.src(source('**/*.html'), { base: source() })
  .pipe(replace(/<link rel="stylesheet" href="([^"]*)"\s*>/, function(_, fileName) {
      let style = fs.readFileSync(path.join(this.file.path.replace(/\/[^\/]*$/, '/'), '..', fileName), 'utf8');
      return '<style>\n' + style + '</style>';
  }))
  .pipe(replace(/<script src="([^"]*)"\s*><\/script>/, function(_, fileName) {
      let script = fs.readFileSync(path.join(this.file.path.replace(/\/[^\/]*$/, '/'), fileName), 'utf8');
      return '<script>\n' + script + '</script>';
  }))
  .pipe(gulp.dest(dist()));
});
