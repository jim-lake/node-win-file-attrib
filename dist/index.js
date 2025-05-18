'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.FILE_ATTRIBUTE = void 0;
exports.getAttributes = getAttributes;
exports.setAttributes = setAttributes;
exports.queryDirectory = queryDirectory;
const node_path_1 = require('node:path');
const addon = require('../build/Release/node_win_file_attrib.node');
exports.default = { getAttributes, setAttributes, queryDirectory };
var FILE_ATTRIBUTE;
(function (FILE_ATTRIBUTE) {
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_READONLY'] = 1)] =
    'FILE_ATTRIBUTE_READONLY';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_HIDDEN'] = 2)] =
    'FILE_ATTRIBUTE_HIDDEN';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_SYSTEM'] = 4)] =
    'FILE_ATTRIBUTE_SYSTEM';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_FAT_VOLUME'] = 8)] =
    'FILE_ATTRIBUTE_FAT_VOLUME';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_DIRECTORY'] = 16)] =
    'FILE_ATTRIBUTE_DIRECTORY';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_ARCHIVE'] = 32)] =
    'FILE_ATTRIBUTE_ARCHIVE';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_DEVICE'] = 64)] =
    'FILE_ATTRIBUTE_DEVICE';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_NORMAL'] = 128)] =
    'FILE_ATTRIBUTE_NORMAL';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_TEMPORARY'] = 256)] =
    'FILE_ATTRIBUTE_TEMPORARY';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_SPARSE_FILE'] = 512)] =
    'FILE_ATTRIBUTE_SPARSE_FILE';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_REPARSE_POINT'] = 1024)] =
    'FILE_ATTRIBUTE_REPARSE_POINT';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_COMPRESSED'] = 2048)] =
    'FILE_ATTRIBUTE_COMPRESSED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_OFFLINE'] = 4096)] =
    'FILE_ATTRIBUTE_OFFLINE';
  FILE_ATTRIBUTE[
    (FILE_ATTRIBUTE['FILE_ATTRIBUTE_NOT_CONTENT_INDEXED'] = 8192)
  ] = 'FILE_ATTRIBUTE_NOT_CONTENT_INDEXED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_ENCRYPTED'] = 16384)] =
    'FILE_ATTRIBUTE_ENCRYPTED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_INTEGRITY_STREAM'] = 32768)] =
    'FILE_ATTRIBUTE_INTEGRITY_STREAM';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_VIRTUAL'] = 65536)] =
    'FILE_ATTRIBUTE_VIRTUAL';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_NO_SCRUB_DATA'] = 131072)] =
    'FILE_ATTRIBUTE_NO_SCRUB_DATA';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_EA'] = 262144)] =
    'FILE_ATTRIBUTE_EA';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_PINNED'] = 524288)] =
    'FILE_ATTRIBUTE_PINNED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_UNPINNED'] = 1048576)] =
    'FILE_ATTRIBUTE_UNPINNED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FILE_ATTRIBUTE_RECALL_ON_OPEN'] = 262144)] =
    'FILE_ATTRIBUTE_RECALL_ON_OPEN';
  FILE_ATTRIBUTE[
    (FILE_ATTRIBUTE['FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS'] = 4194304)
  ] = 'FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS';
})(FILE_ATTRIBUTE || (exports.FILE_ATTRIBUTE = FILE_ATTRIBUTE = {}));
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
const NOT_DIR =
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_DEVICE |
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_REPARSE_POINT;
const NOT_FILE =
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_DEVICE |
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_REPARSE_POINT |
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_DIRECTORY;
class WindowsDirent {
  isDirectory() {
    return (
      this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_DIRECTORY &&
      !(this.attributes & NOT_DIR)
    );
  }
  isFile() {
    return (
      this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_NORMAL ||
      !(this.attributes & NOT_FILE)
    );
  }
}
function queryDirectory(path, done) {
  const full = '\\\\?\\' + (0, node_path_1.resolve)(path);
  const error = addon.queryDirectory(full, (err, files) => {
    if (err) {
      _addErrorCode(err);
    } else {
      const len = files.length;
      for (let i = 0; i < len; i++) {
        files[i].__proto__ = WindowsDirent.prototype;
      }
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
