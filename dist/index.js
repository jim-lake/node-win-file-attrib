'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getAttributes = getAttributes;
exports.setAttributes = setAttributes;
exports.queryDirectory = queryDirectory;
const addon = require('../build/Release/node_win_file_attrib.node');
exports.default = { getAttributes, setAttributes, queryDirectory };
function getAttributes(path, done) {
  return addon.getAttributes(path, done);
}
function setAttributes(path, attributes, done) {
  return addon.setAttributes(path, attributes, (err) => done?.(err));
}
function queryDirectory(path, done) {
  return addon.queryDirectory(path, done);
}
//# sourceMappingURL=index.js.map
