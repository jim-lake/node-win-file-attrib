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

function test(dir, done) {
  let a_err;
  let a_results;
  let fs_err;
  let fs_results;
  async.parallel(
    [
      (done) => {
        FileAttrib.queryDirectory(dir, (err, results) => {
          a_err = err;
          a_results = results;
          done();
        });
      },
      (done) => {
        fs.readdir(dir, { withFileTypes: true }, (err, results) => {
          fs_err = err;
          fs_results = results;
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
        if (fs_results.length !== a_results.length) {
          console.log(
            path,
            'fail length mismatch:',
            a_result.length,
            '!=',
            fs_result.length
          );
          fail = true;
        } else {
          fs_results.forEach((fs_dirent) => {
            const a_dirent = a_results.find((a) => a.name === fs_dirent.name);
            if (a_dirent) {
              if (fs_dirent.isDirectory() !== a_dirent.isDirectory()) {
                console.log(path, 'dir mismatch', fs_dirent, a_dirent);
                fail = true;
              }
              if (fs_dirent.isFile() !== a_dirent.isFile()) {
                console.log(path, 'file mismatch', fs_dirent, a_dirent);
                fail = true;
              }
              if (fs_dirent.isSymbolicLink() !== a_dirent.isSymbolicLink()) {
                console.log(path, 'symlink mismatch', fs_dirent, a_dirent);
                fail = true;
              }
            } else {
              console.log(path, 'missing dirent:', fs_dirent);
              fail = true;
            }
          });
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
