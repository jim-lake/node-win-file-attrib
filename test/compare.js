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
        FileAttrib.getAttribute(path, (err, result) => {
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
    (err) => {
      if (a_err && fs_err) {
        if (a_err.code === fs_err.code) {
          console.log(path, 'success with error:', a_err.code);
        } else {
          console.log(
            path,
            'fail error mismatch:',
            a_err.code,
            '!=',
            fs_err.code
          );
        }
      } else if (a_err && !fs_err) {
        console.error('failed:', path, err);
      } else if (!a_err && fs_err) {
        console.error('failed:', path, err);
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
        if (a_result.cTimeMs !== fs_result.cTimeMs) {
          console.log(
            path,
            'fail cTime mismatch:',
            a_result.cTimeMs,
            '!=',
            fs_result.cTimeMs
          );
        }
        if (a_result.mTimeMs !== fs_result.mTimeMs) {
          console.log(
            path,
            'fail mTime mismatch:',
            a_result.mTimeMs,
            '!=',
            fs_result.mTimeMs
          );
        }
      }
      done();
    }
  );
}
