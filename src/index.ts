import { resolve as pathResolve } from 'node:path';
const addon = require('../build/Release/node_win_file_attrib.node');

export default { getAttributes, setAttributes, queryDirectory };

export enum FILE_ATTRIBUTE {
  READONLY = 0x1,
  HIDDEN = 0x2,
  SYSTEM = 0x4,
  FAT_VOLUME = 0x8,
  DIRECTORY = 0x10,
  ARCHIVE = 0x20,
  DEVICE = 0x40,
  NORMAL = 0x80,
  TEMPORARY = 0x100,
  SPARSE_FILE = 0x200,
  REPARSE_POINT = 0x400,
  COMPRESSED = 0x800,
  OFFLINE = 0x1000,
  NOT_CONTENT_INDEXED = 0x2000,
  ENCRYPTED = 0x4000,
  INTEGRITY_STREAM = 0x8000,
  VIRTUAL = 0x10000,
  NO_SCRUB_DATA = 0x20000,
  EA = 0x40000,
  PINNED = 0x80000,
  UNPINNED = 0x100000,
  RECALL_ON_OPEN = 0x40000,
  RECALL_ON_DATA_ACCESS = 0x400000,
}

const NOT_DIR = FILE_ATTRIBUTE.DEVICE | FILE_ATTRIBUTE.REPARSE_POINT;
const NOT_FILE =
  FILE_ATTRIBUTE.DEVICE |
  FILE_ATTRIBUTE.REPARSE_POINT |
  FILE_ATTRIBUTE.DIRECTORY;

abstract class AttributeHelper {
  abstract attributes: number;
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
export class GetResult extends AttributeHelper {
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
export class WindowsDirent extends AttributeHelper {
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
