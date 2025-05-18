const FileAttrib = require('../dist/index.js');
const async = require('async');
const { join: pathJoin } = require('path');
const fs = require('node:fs');

const start_path = process.argv[2];

if (!start_path) {
  console.log('Usage: benchmark <start_path>');
  process.exit(-1);
}
console.log('start_path:', start_path);
console.log('');

const BENCHMARKS = {
  'readdir without stat call': _readDir,
  queryDirectory: _queryDirectory,
};
async.eachSeries(
  _shuffle(Object.keys(BENCHMARKS)),
  (name, done) => {
    const func = BENCHMARKS[name];
    console.time(name);
    func((err, count) => {
      console.timeEnd(name);
      if (err) {
        console.error(name, 'err:', err);
      } else {
        console.log(name, 'count:', count);
      }
      console.log('');
      done();
    });
  },
  () => {
    console.log('done done');
  }
);

function _readDir(done) {
  const dir_list = [start_path];
  let count = 0;
  async.forever(
    (done) => {
      const path = dir_list.pop();
      if (!path) {
        done('stop');
      } else {
        fs.readdir(path, { withFileTypes: true }, (err, results) => {
          if (err) {
            console.error('err:', err, path);
          } else {
            results.forEach((result) => {
              if (result.isDirectory()) {
                dir_list.push(pathJoin(path, result.name));
              } else if (result.isFile()) {
                count++;
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
      done(err, count);
    }
  );
}
function _queryDirectory(done) {
  const dir_list = [start_path];
  let count = 0;
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
              if (result.attributes & 0x40) {
                // device
              } else if (result.attributes & 0x400) {
                // reparse
              } else if (result.attributes & 0x10) {
                dir_list.push(pathJoin(path, result.name));
              } else {
                count++;
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
      done(err, count);
    }
  );
}
function _shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}
