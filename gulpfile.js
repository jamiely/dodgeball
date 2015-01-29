var gulp = require('gulp'),
  to5 = require("gulp-6to5"),
  sourcemaps = require("gulp-sourcemaps"),
  concat = require("gulp-concat"),
  connect = require('gulp-connect'),
  rename = require('gulp-rename'),
  inject = require('gulp-inject'),
  usemin = require('gulp-usemin'),
  uglify = require('gulp-uglify'),
  minifyHtml = require('gulp-minify-html'),
  minifyCss = require('gulp-minify-css'),
  rev = require('gulp-rev'),
  bowerFiles = require('main-bower-files'),
  del = require('del');

var config = {
  jsDir: "src/**/*.*",
  indexPath: 'app/index.html'
};

gulp.task('clean:dist', function(cb) {
  del('dist', cb);
});

gulp.task('clean:es6js', function(cb) {
  del([
    'app/js/**.es6.js',
    'app/js/**.es6.js.map'
  ], cb);
});

gulp.task('connect', function() {
  connect.server({
    root: 'app',
    livereload: {
      port: 35749
    },
    port: 8090
  });
});

gulp.task('connect:dist', ['dist'], function() {
  connect.server({
    root: 'dist',
    port: 8091
  });
});

gulp.task('dist', ['usemin']);

gulp.task('usemin', function () {
  return gulp.src('app/*.html')
      .pipe(usemin({
        css: [minifyCss(), 'concat'],
        html: [minifyHtml({empty: true})],
        js: [uglify(), rev()]
      }))
      .pipe(gulp.dest('dist'));
});

gulp.task('build', ['build:es6']);

gulp.task('build:es6', ['clean:es6js'], function() {
  return gulp.src('src/**/*.es6')
    .pipe(sourcemaps.init())
    .pipe(to5())
    .pipe(sourcemaps.write("."))
    // remove the subdirectories
    .pipe(rename(function(path) {
        path.extname = path.extname.replace('.es6', '.es6.js');
        path.basename = path.basename.replace('.es6', '.es6.js');
    }))
    .pipe(gulp.dest("app/js"));
});



gulp.task('inject:local', function() {
  var target = gulp.src(config.indexPath);
  // It's not necessary to read the files (will speed up things), we're only after their paths:
  var sources = gulp.src([
    './app/js/**/*.js',
    '!app/js/{bower_components,bower_components/**}'
  ], {read: false});

  return target.pipe(inject(sources, {relative: true}))
    .pipe(gulp.dest('./app'));
});

gulp.task('inject:bower', function() {
  return gulp.src(config.indexPath)
    .pipe(inject(gulp.src(bowerFiles(), {read: false}), {name: 'bower', relative: true}))
    .pipe(gulp.dest('./app'));
});

gulp.task('inject', ['inject:bower', 'inject:local']);

gulp.task('default', ['connect', 'watch']);

gulp.task('build-reload', ['build'], function() {
  return gulp.src(config.jsDir)
    .pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.start('build-reload');

  gulp.watch(config.jsDir, ['build-reload']);
});

gulp.task('watch:dist', function() {
  gulp.watch('app/**/*', ['dist']);
});
