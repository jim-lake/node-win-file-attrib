declare const _default: {
  getAttributes: typeof getAttributes;
  setAttributes: typeof setAttributes;
  queryDirectory: typeof queryDirectory;
  _slowApi: typeof _slowApi;
};
export default _default;
type GetResult = {
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  attributes: number;
};
export declare function getAttributes(
  path: string,
  done: (err: Error | null, attributes: GetResult) => void
): void;
export declare function setAttributes(
  path: string,
  attributes: number,
  done?: (err: Error | null) => void
): void;
type WindowsDirent = {
  name: string;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  attributes: number;
};
export declare function queryDirectory(
  path: string,
  done: (err: Error | null, files: WindowsDirent[]) => void
): void;
export declare function _slowApi(): any;
