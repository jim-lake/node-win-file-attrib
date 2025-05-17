const addon = require('../build/Release/node_win_file_attrib.node');

export default { getAttributes, setAttributes, queryDirectory, _slowApi };

type GetResult = {
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  attributes: number;
};

export function getAttributes(
  path: string,
  done: (err: Error | null, attributes: GetResult) => void
) {
  const error = addon.getAttributes(path, done);
  if (error) {
    throw new Error(error);
  }
}
export function setAttributes(
  path: string,
  attributes: number,
  done?: (err: Error | null) => void
) {
  const error = addon.setAttributes(path, attributes, (err) => done?.(err));
  if (error) {
    throw new Error(error);
  }
}
type WindowsDirent = {
  name: string;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  attributes: number;
};
export function queryDirectory(
  path: string,
  done: (err: Error | null, files: WindowsDirent[]) => void
) {
  const error = addon.queryDirectory(path, done);
  if (error) {
    throw new Error(error);
  }
}
export function _slowApi() {
  return addon?._slowApi;
}
