const async = require('async');
const fs = require('node:fs');
const { dirname, basename, join: pathJoin } = require('node:path');
const FileAttrib = require('../dist/index.js');

const start_path = process.argv[2];

if (!start_path) {
  console.log('Usage: compare_path <start_path>');
  process.exit(-1);
}
console.log('start_path:', start_path);
console.log('');

let success_count = 0;
let fail_count = 0;

_queryDirectory(start_path, (err, path_list) => {
  if (err) {
    console.log('query err:', err);
  } else {
    async.eachSeries(path_list, test, () => {
      console.log('done: success:', success_count, 'fail:', fail_count);
    });
  }
});

function _queryDirectory(begin, done) {
  const dir_list = [begin];
  const result_list = [];
  async.forever(
    (done) => {
      const path = dir_list.pop();
      if (!path) {
        done('stop');
      } else {
        FileAttrib.queryDirectory(path, (err, results) => {
          if (err) {
            console.error('err:', err, path);
          } else {
            results.forEach((result) => {
              if (result.isDirectory()) {
                dir_list.push(pathJoin(path, result.name));
              } else if (result.isFile()) {
                result_list.push(pathJoin(path, result.name));
              }
            });
          }
          done(err);
        });
      }
    },
    (err) => {
      if (err === 'stop') {
        err = null;
      }
      done(err, result_list);
    }
  );
}

function test(path, done) {
  let a_err;
  let a_result;
  let b_result;
  let fs_err;
  let fs_result;
  async.parallel(
    [
      (done) => {
        FileAttrib.getAttributes(path, (err, result) => {
          a_err = err;
          a_result = result;
          done();
        });
      },
      (done) => {
        const dir = dirname(path);
        const filename = basename(path).toLowerCase();
        if (path == dir) {
          done();
        } else {
          FileAttrib.queryDirectory(dir, (err, results) => {
            b_result = results?.find?.(
              (r) => r.name.toLowerCase() === filename
            );
            if (results && !b_result) {
              console.log('no b:', dir, filename);
            }
            done();
          });
        }
      },
      (done) => {
        fs.stat(path, (err, result) => {
          fs_err = err;
          fs_result = result;
          done();
        });
      },
    ],
    () => {
      let fail = false;
      if (a_err && fs_err) {
        if (a_err.code !== fs_err.code) {
          console.log(
            path,
            'fail error mismatch:',
            a_err.code,
            '!=',
            fs_err.code,
            '0x' + a_err?.errno?.toString?.(16)
          );
          fail = true;
        }
      } else if (a_err && !fs_err) {
        console.error('failed:', path, a_err);
        fail = true;
      } else if (!a_err && fs_err) {
        console.error('failed:', path, fs_err);
        fail = true;
      } else {
        if (!fs_result.isDirectory() && a_result.size !== fs_result.size) {
          console.log(
            path,
            'fail size mismatch:',
            a_result.size,
            '!=',
            fs_result.size
          );
          fail = true;
        }
        if (
          _isDiffTime(a_result.ctimeMs, fs_result.ctimeMs, b_result?.ctimeMs)
        ) {
          console.log(
            path,
            'fail ctime mismatch:',
            a_result.ctimeMs,
            '!=',
            fs_result.ctimeMs
          );
          fail = true;
        }
        if (
          _isDiffTime(a_result.mtimeMs, fs_result.mtimeMs, b_result?.mtimeMs)
        ) {
          console.log(
            path,
            'fail mtime mismatch:',
            a_result.mtimeMs,
            '!=',
            fs_result.mtimeMs
          );
          fail = true;
        }
      }
      if (fail) {
        fail_count++;
        console.log(path, 'failed');
        console.log('    a:', a_err, a_result);
        console.log('    fs:', fs_err, fs_result);
      } else {
        success_count++;
        console.log(path, 'success');
      }
      console.log('--------');

      done();
    }
  );
}
function _isDiffTime(a, fs, b) {
  const delta_fs = Math.abs(fs - a);
  if (delta_fs) {
    console.log('diff_fs:', a, fs);
  }
  if (b) {
    const delta_ab = Math.abs(b - a);
    if (delta_ab) {
      console.log('diff_ab:', a, b);
    }
  }
  return delta_fs > 0.01;
}
