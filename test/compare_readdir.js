const async = require('async');
const fs = require('node:fs');
const FileAttrib = require('../dist/index.js');

const PATH_LIST = [
  'C:\\',
  'C:\\foobar',
  'C:\\pagefile.sys',
  'D:\\',
  'C:\\System Volume Information',
  'C:\\Windows',
  'C:\\Windows\\system32',
  'C:\\Windows\\system32\\notepad.exe',
  'K:\\',
  '\\.\\illegal',
  'C:/',
  'C:/foobar',
  'C:/pagefile.sys',
  'D:/',
  'C:/Windows',
  'C:/Windows/system32',
  'C:/Windows/system32/notepad.exe',
  'K:/',
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
            dir,
            'fail error mismatch:',
            a_err.code,
            '!=',
            fs_err.code,
            '0x' + a_err?.errno?.toString?.(16)
          );
          fail = true;
        }
      } else if (a_err && !fs_err) {
        console.error(dir, 'failed:', a_err);
        fail = true;
      } else if (!a_err && fs_err) {
        console.error(dir, 'failed:', fs_err);
        fail = true;
      } else {
        if (fs_results.length !== a_results.length) {
          console.log(
            dir,
            'fail length mismatch:',
            a_results.length,
            '!=',
            fs_results.length
          );
          fail = true;
        } else {
          fs_results.forEach((fs_dirent) => {
            const a_dirent = a_results.find((a) => a.name === fs_dirent.name);
            if (a_dirent) {
              if (!!fs_dirent.isDirectory() !== !!a_dirent.isDirectory()) {
                console.log(
                  dir,
                  'dir mismatch',
                  fs_dirent.name,
                  fs_dirent.isDirectory(),
                  a_dirent.isDirectory()
                );
                fail = true;
              }
              if (!!fs_dirent.isFile() !== !!a_dirent.isFile()) {
                console.log(
                  dir,
                  'file mismatch',
                  fs_dirent.name,
                  fs_dirent.isFile(),
                  a_dirent.isFile()
                );
                fail = true;
              }
              if (
                !!fs_dirent.isSymbolicLink() !== !!a_dirent.isSymbolicLink()
              ) {
                console.log(
                  dir,
                  'symlink mismatch',
                  fs_dirent.name,
                  fs_dirent.isSymbolicLink(),
                  a_dirent.isSymbolicLink()
                );
                fail = true;
              }
            } else {
              console.log(dir, 'missing dirent:', fs_dirent);
              fail = true;
            }
          });
        }
      }
      if (fail) {
        fail_count++;
        console.log(dir, 'failed');
        console.log('    a:', a_err, a_results?.length);
        console.log('    fs:', fs_err, fs_results?.length);
      } else {
        success_count++;
        console.log(dir, 'success', a_err?.code, a_results?.length);
      }
      console.log('--------');
      done();
    }
  );
}
