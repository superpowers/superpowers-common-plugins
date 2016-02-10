const gulp = require("gulp");
const tasks = [];

// Browserify
const browserify = require("browserify");
const source = require("vinyl-source-stream");

function makeBrowserify(src, dest, output) {
  gulp.task(`${output}-browserify`, () => {
    return browserify(src, { standalone: "SupTHREE" })
      .transform("brfs").bundle()
      .pipe(source(`${output}.js`))
      .pipe(gulp.dest(dest));
  });
  tasks.push(`${output}-browserify`);
}

makeBrowserify("./main/main.js", "./public/", "main");


// All
gulp.task("default", tasks);
