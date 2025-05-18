import { resolve as pathResolve } from 'node:path';
const addon = require('../build/Release/node_win_file_attrib.node');

export default { getAttributes, setAttributes, queryDirectory };

type GetResult = {
  size: number;
  attributes: number;
  ctimeMs: number;
  mtimeMs: number;
};
export function getAttributes(
  path: string,
  done: (err: Error | null, result: GetResult) => void
) {
  const full = '\\??\\' + pathResolve(path);
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
type WindowsDirent = {
  name: string;
  size: number;
  attributes: number;
  ctimeMs: number;
  mtimeMs: number;
};
export function queryDirectory(
  path: string,
  done: (err: Error | null, files: WindowsDirent[]) => void
) {
  const error = addon.queryDirectory(path, (err, files) => {
    if (err) {
      _addErrorCode(err);
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
