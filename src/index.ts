import { resolve as pathResolve } from 'node:path';
const addon = require('../build/Release/node_win_file_attrib.node');

export default { getAttributes, setAttributes, queryDirectory };

export enum FILE_ATTRIBUTE {
  FILE_ATTRIBUTE_READONLY = 0x1,
  FILE_ATTRIBUTE_HIDDEN = 0x2,
  FILE_ATTRIBUTE_SYSTEM = 0x4,
  FILE_ATTRIBUTE_FAT_VOLUME = 0x8,
  FILE_ATTRIBUTE_DIRECTORY = 0x10,
  FILE_ATTRIBUTE_ARCHIVE = 0x20,
  FILE_ATTRIBUTE_DEVICE = 0x40,
  FILE_ATTRIBUTE_NORMAL = 0x80,
  FILE_ATTRIBUTE_TEMPORARY = 0x100,
  FILE_ATTRIBUTE_SPARSE_FILE = 0x200,
  FILE_ATTRIBUTE_REPARSE_POINT = 0x400,
  FILE_ATTRIBUTE_COMPRESSED = 0x800,
  FILE_ATTRIBUTE_OFFLINE = 0x1000,
  FILE_ATTRIBUTE_NOT_CONTENT_INDEXED = 0x2000,
  FILE_ATTRIBUTE_ENCRYPTED = 0x4000,
  FILE_ATTRIBUTE_INTEGRITY_STREAM = 0x8000,
  FILE_ATTRIBUTE_VIRTUAL = 0x10000,
  FILE_ATTRIBUTE_NO_SCRUB_DATA = 0x20000,
  FILE_ATTRIBUTE_EA = 0x40000,
  FILE_ATTRIBUTE_PINNED = 0x80000,
  FILE_ATTRIBUTE_UNPINNED = 0x100000,
  FILE_ATTRIBUTE_RECALL_ON_OPEN = 0x40000,
  FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS = 0x400000,
}

const NOT_DIR =
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_DEVICE |
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_REPARSE_POINT;
const NOT_FILE =
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_DEVICE |
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_REPARSE_POINT |
  FILE_ATTRIBUTE.FILE_ATTRIBUTE_DIRECTORY;

abstract class AttributeHelper {
  abstract attributes: number;
  isDirectory() {
    return (
      this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_DIRECTORY &&
      !(this.attributes & NOT_DIR)
    );
  }
  isFile() {
    return Boolean(
      this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_NORMAL ||
        !(this.attributes & NOT_FILE)
    );
  }
  isSymbolicLink() {
    return Boolean(
      this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_REPARSE_POINT
    );
  }
  isHidden() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_HIDDEN);
  }
  isSystem() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_SYSTEM);
  }
  isReadOnly() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_READONLY);
  }
  isTemporary() {
    return Boolean(this.attributes & FILE_ATTRIBUTE.FILE_ATTRIBUTE_TEMPORARY);
  }
}
class GetResult extends AttributeHelper {
  size: number;
  attributes: number;
  ctimeMs: number;
  mtimeMs: number;
}
export function getAttributes(
  path: string,
  done: (err: Error | null, result: GetResult) => void
) {
  const full = '\\??\\' + pathResolve(path);
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
export function setAttributes(
  path: string,
  attributes: number,
  done?: (err: Error | null) => void
) {
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
class WindowsDirent extends AttributeHelper {
  name: string;
  size: number;
  attributes: number;
  ctimeMs: number;
  mtimeMs: number;
}
export function queryDirectory(
  path: string,
  done: (err: Error | null, files: WindowsDirent[]) => void
) {
  const full = '\\\\?\\' + pathResolve(path);
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
function _addErrorCode(error: any) {
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
