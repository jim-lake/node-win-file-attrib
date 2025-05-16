'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getAttributes = getAttributes;
exports.setAttributes = setAttributes;
exports.queryDirectory = queryDirectory;
const addon = require('../build/Release/node_win_file_attrib.node');
exports.default = { getAttributes, setAttributes, queryDirectory };
function getAttributes(path, done) {
  const error = addon.getAttributes(path, done);
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
