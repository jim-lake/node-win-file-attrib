declare const _default: {
  getAttributes: typeof getAttributes;
  setAttributes: typeof setAttributes;
  queryDirectory: typeof queryDirectory;
};
export default _default;
export declare enum FILE_ATTRIBUTE {
  FILE_ATTRIBUTE_READONLY = 1,
  FILE_ATTRIBUTE_HIDDEN = 2,
  FILE_ATTRIBUTE_SYSTEM = 4,
  FILE_ATTRIBUTE_FAT_VOLUME = 8,
  FILE_ATTRIBUTE_DIRECTORY = 16,
  FILE_ATTRIBUTE_ARCHIVE = 32,
  FILE_ATTRIBUTE_DEVICE = 64,
  FILE_ATTRIBUTE_NORMAL = 128,
  FILE_ATTRIBUTE_TEMPORARY = 256,
  FILE_ATTRIBUTE_SPARSE_FILE = 512,
  FILE_ATTRIBUTE_REPARSE_POINT = 1024,
  FILE_ATTRIBUTE_COMPRESSED = 2048,
  FILE_ATTRIBUTE_OFFLINE = 4096,
  FILE_ATTRIBUTE_NOT_CONTENT_INDEXED = 8192,
  FILE_ATTRIBUTE_ENCRYPTED = 16384,
  FILE_ATTRIBUTE_INTEGRITY_STREAM = 32768,
  FILE_ATTRIBUTE_VIRTUAL = 65536,
  FILE_ATTRIBUTE_NO_SCRUB_DATA = 131072,
  FILE_ATTRIBUTE_EA = 262144,
  FILE_ATTRIBUTE_PINNED = 524288,
  FILE_ATTRIBUTE_UNPINNED = 1048576,
  FILE_ATTRIBUTE_RECALL_ON_OPEN = 262144,
  FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS = 4194304,
}
type GetResult = {
  size: number;
  attributes: number;
  ctimeMs: number;
  mtimeMs: number;
};
export declare function getAttributes(
  path: string,
  done: (err: Error | null, result: GetResult) => void
): void;
export declare function setAttributes(
  path: string,
  attributes: number,
  done?: (err: Error | null) => void
): void;
declare class WindowsDirent {
  name: string;
  size: number;
  attributes: number;
  ctimeMs: number;
  mtimeMs: number;
  isDirectory(): boolean;
  isFile(): number | boolean;
}
export declare function queryDirectory(
  path: string,
  done: (err: Error | null, files: WindowsDirent[]) => void
): void;
