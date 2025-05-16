const addon = require('../build/Release/node_win_file_attrib.node');

export default { getAttributes, setAttributes, queryDirectory };

export function getAttributes(
  path: string,
  done: (err: Error | null, attributes: number) => void
) {
  return addon.getAttributes(path, done);
}
export function setAttributes(
  path: string,
  attributes: number,
  done?: (err: Error | null) => void
) {
  return addon.setAttributes(path, attributes, (err) => done?.(err));
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
  return addon.queryDirectory(path, done);
}
