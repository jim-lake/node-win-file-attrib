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
  const error = addon.getAttributes(full, done);
  if (error) {
    throw new Error(error);
  }
}
function setAttributes(path, attributes, done) {
  const error = addon.setAttributes(path, attributes, (err) => done?.(err));
  if (error) {
    throw new Error(error);
  }
}
function queryDirectory(path, done) {
  const error = addon.queryDirectory(path, done);
  if (error) {
    throw new Error(error);
  }
}
//# sourceMappingURL=index.js.map
