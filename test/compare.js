const async = require('async');
const fs = require('node:fs');
const FileAttrib = require('../dist/index.js');

const PATH_LIST = [
  'C:\\',
  'C:\\foobar',
  'C:\\pagefile.sys',
  'D:\\',
  'C:\\Windows\\system32\\notepad.exe',
  'K:\\',
  '\\.\\illegal',
];

async.eachSeries(PATH_LIST, test, () => {
  console.log();
});

function test(path, done) {
  let a_err;
  let fs_err;
  let a_result;
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
        fs.stat(path, (err, result) => {
          fs_err = err;
          fs_result = result;
          done();
        });
      },
    ],
    () => {
      if (a_err && fs_err) {
        if (a_err.code === fs_err.code) {
          console.log(path, 'success with error:', a_err.code);
        } else {
          console.log(
            path,
            'fail error mismatch:',
            a_err.code,
            '!=',
            fs_err.code,
            '0x' + a_err?.errno?.toString?.(16)
          );
        }
      } else if (a_err && !fs_err) {
        console.error('failed:', path, a_err);
      } else if (!a_err && fs_err) {
        console.error('failed:', path, fs_err);
      } else {
        if (a_result.size !== fs_result.size) {
          console.log(
            path,
            'fail size mismatch:',
            a_result.size,
            '!=',
            fs_result.size
          );
        }
        if (a_result.ctimeMs !== fs_result.ctimeMs) {
          console.log(
            path,
            'fail ctime mismatch:',
            a_result.ctimeMs,
            '!=',
            fs_result.ctimeMs
          );
        }
        if (a_result.mtimeMs !== fs_result.mtimeMs) {
          console.log(
            path,
            'fail mtime mismatch:',
            a_result.mtimeMs,
            '!=',
            fs_result.mtimeMs
          );
        }
      }
      done();
    }
  );
}
