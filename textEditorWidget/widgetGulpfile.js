const gulp = require("gulp");
const tasks = [ "stylus", "copy-cm-modes", "copy-cm-themes" ];

// Stylus
const stylus = require("gulp-stylus");
const concatCss = require("gulp-concat-css");

gulp.task("stylus", () => gulp.src("./widget/widget.styl").pipe(stylus({ errors: true, compress: true })).pipe(concatCss("widget.css")).pipe(gulp.dest("./public/")));

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");

function makeBrowserify(src, dest, output) {
  gulp.task(`${output}-browserify`, () => {
    return browserify(src, { standalone: "TextEditorWidget" })
      .transform("brfs").bundle()
      .pipe(source(`${output}.js`))
      .pipe(gulp.dest(dest));
  });
  tasks.push(`${output}-browserify`);
}

makeBrowserify("./widget/widget.js", "./public/", "widget");

// Copy CodeMirror modes
gulp.task("copy-cm-modes", () => gulp.src([ "node_modules/codemirror/mode/**/*" ]).pipe(gulp.dest("public/codemirror/mode")));

// Copy CodeMirror themes
gulp.task("copy-cm-themes", () => gulp.src([ "node_modules/codemirror/theme/**/*" ]).pipe(gulp.dest("public/codemirror/theme")));

// All
gulp.task("default", gulp.parallel(tasks));
