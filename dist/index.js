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
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['READONLY'] = 1)] = 'READONLY';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['HIDDEN'] = 2)] = 'HIDDEN';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['SYSTEM'] = 4)] = 'SYSTEM';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['FAT_VOLUME'] = 8)] = 'FAT_VOLUME';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['DIRECTORY'] = 16)] = 'DIRECTORY';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['ARCHIVE'] = 32)] = 'ARCHIVE';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['DEVICE'] = 64)] = 'DEVICE';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['NORMAL'] = 128)] = 'NORMAL';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['TEMPORARY'] = 256)] = 'TEMPORARY';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['SPARSE_FILE'] = 512)] = 'SPARSE_FILE';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['REPARSE_POINT'] = 1024)] = 'REPARSE_POINT';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['COMPRESSED'] = 2048)] = 'COMPRESSED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['OFFLINE'] = 4096)] = 'OFFLINE';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['NOT_CONTENT_INDEXED'] = 8192)] =
    'NOT_CONTENT_INDEXED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['ENCRYPTED'] = 16384)] = 'ENCRYPTED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['INTEGRITY_STREAM'] = 32768)] =
    'INTEGRITY_STREAM';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['VIRTUAL'] = 65536)] = 'VIRTUAL';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['NO_SCRUB_DATA'] = 131072)] = 'NO_SCRUB_DATA';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['EA'] = 262144)] = 'EA';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['PINNED'] = 524288)] = 'PINNED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['UNPINNED'] = 1048576)] = 'UNPINNED';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['RECALL_ON_OPEN'] = 262144)] =
    'RECALL_ON_OPEN';
  FILE_ATTRIBUTE[(FILE_ATTRIBUTE['RECALL_ON_DATA_ACCESS'] = 4194304)] =
    'RECALL_ON_DATA_ACCESS';
})(FILE_ATTRIBUTE || (exports.FILE_ATTRIBUTE = FILE_ATTRIBUTE = {}));
const NOT_DIR = FILE_ATTRIBUTE.DEVICE | FILE_ATTRIBUTE.REPARSE_POINT;
const NOT_FILE =
  FILE_ATTRIBUTE.DEVICE |
  FILE_ATTRIBUTE.REPARSE_POINT |
  FILE_ATTRIBUTE.DIRECTORY;
class AttributeHelper {
  isDirectory() {
    return (
      this.attributes & FILE_ATTRIBUTE.DIRECTORY && !(this.attributes & NOT_DIR)
    );
  }
  isFile() {
    return Boolean(
      this.attributes & FILE_ATTRIBUTE.NORMAL || !(this.attributes & NOT_FILE)
    );
  }
  isSymbolicLink() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.REPARSE_POINT);
  }
  isHidden() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.HIDDEN);
  }
  isSystem() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.SYSTEM);
  }
  isReadOnly() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.READONLY);
  }
  isTemporary() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.TEMPORARY);
  }
}
class GetResult extends AttributeHelper {}
function getAttributes(path, done) {
  const full = '\\??\\' + (0, node_path_1.resolve)(path);
  const error = addon.getAttributes(full, (err, result) => {
    if (err) {
      _addErrorCode(err);
    } else {
      result.__proto__ = GetResult.prototype;
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
class WindowsDirent extends AttributeHelper {}
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
    case 0x2:
    case 0x3:
    case 0xc0000034:
    case 0xc000003a:
      error.code = 'ENOENT';
      break;
    case 0x20:
    case 0xc0000043:
      error.code = 'EBUSY';
      break;
    case 0xc000000d:
      error.code = 'ENOTDIR';
      break;
  }
}
//# sourceMappingURL=index.js.map
