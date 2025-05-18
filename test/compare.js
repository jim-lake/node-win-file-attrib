const async = require('async');
const fs = require('node:fs');
const { dirname, basename } = require('node:path');
const FileAttrib = require('../dist/index.js');

const PATH_LIST = [
  'C:\\',
  'C:\\foobar',
  'C:\\pagefile.sys',
  'D:\\',
  'C:\\Windows',
  'C:\\Windows\\system32',
  'C:\\Windows\\system32\\notepad.exe',
  'K:\\',
  '\\.\\illegal',
];

let success_count = 0;
let fail_count = 0;

async.eachSeries(PATH_LIST, test, () => {
  console.log('done: success:', success_count, 'fail:', fail_count);
});

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
