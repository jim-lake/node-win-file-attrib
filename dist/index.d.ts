declare const _default: {
  getAttributes: typeof getAttributes;
  setAttributes: typeof setAttributes;
  queryDirectory: typeof queryDirectory;
};
export default _default;
export declare function getAttributes(
  path: string,
  done: (err: Error | null, attributes: number) => void
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
