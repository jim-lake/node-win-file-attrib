declare const _default: {
  getAttributes: typeof getAttributes;
  setAttributes: typeof setAttributes;
  queryDirectory: typeof queryDirectory;
};
export default _default;
export declare enum FILE_ATTRIBUTE {
  READONLY = 1,
  HIDDEN = 2,
  SYSTEM = 4,
  FAT_VOLUME = 8,
  DIRECTORY = 16,
  ARCHIVE = 32,
  DEVICE = 64,
  NORMAL = 128,
  TEMPORARY = 256,
  SPARSE_FILE = 512,
  REPARSE_POINT = 1024,
  COMPRESSED = 2048,
  OFFLINE = 4096,
  NOT_CONTENT_INDEXED = 8192,
  ENCRYPTED = 16384,
  INTEGRITY_STREAM = 32768,
  VIRTUAL = 65536,
  NO_SCRUB_DATA = 131072,
  EA = 262144,
  PINNED = 524288,
  UNPINNED = 1048576,
  RECALL_ON_OPEN = 262144,
  RECALL_ON_DATA_ACCESS = 4194304,
}
declare abstract class AttributeHelper {
  abstract attributes: number;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
  isHidden(): boolean;
  isSystem(): boolean;
  isReadOnly(): boolean;
  isTemporary(): boolean;
}
export declare class GetResult extends AttributeHelper {
  size: number;
  attributes: number;
  ctimeMs: number;
  mtimeMs: number;
}
export declare function getAttributes(
  path: string,
  done: (err: NodeJS.ErrnoException | null, result: GetResult) => void
): void;
export declare function setAttributes(
  path: string,
  attributes: number,
  done?: (err: NodeJS.ErrnoException | null) => void
): void;
export declare class WindowsDirent extends AttributeHelper {
  name: string;
  size: number;
  attributes: number;
  ctimeMs: number;
  mtimeMs: number;
}
export declare function queryDirectory(
  path: string,
  done: (err: NodeJS.ErrnoException | null, files: WindowsDirent[]) => void
): void;
