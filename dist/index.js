'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getAttributes = getAttributes;
exports.setAttributes = setAttributes;
exports.queryDirectory = queryDirectory;
const node_path_1 = require('node:path');
const addon = require('../build/Release/node_win_file_attrib.node');
exports.default = { getAttributes, setAttributes, queryDirectory };
function getAttributes(path, done) {
  const full = '\\??\\' + (0, node_path_1.resolve)(path);
  const error = addon.getAttributes(full, (err, result) => {
    if (err) {
      _addErrorCode(err);
    }
    done(err, result);
  });
  if (error) {
    throw new Error(error);
  }
}
function setAttributes(path, attributes, done) {
  const error = addon.setAttributes(path, attributes, (err) => {
    if (err && done) {
      _addErrorCode(err);
    }
    done?.(err);
  });
  if (error) {
    throw new Error(error);
  }
}
function queryDirectory(path, done) {
  const full = '\\\\?\\' + (0, node_path_1.resolve)(path);
  const error = addon.queryDirectory(full, (err, files) => {
    if (err) {
      _addErrorCode(err);
    }
    done(err, files);
  });
  if (error) {
    throw new Error(error);
  }
}
function _addErrorCode(error) {
  switch (error?.errno) {
    case 0xc0000034:
    case 0xc000003a:
      error.code = 'ENOENT';
      break;
    case 0xc0000043:
      error.code = 'EBUSY';
      break;
  }
}
//# sourceMappingURL=index.js.map
