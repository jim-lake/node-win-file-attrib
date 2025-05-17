#pragma once
#include <windows.h>
#include <winternl.h>

typedef struct _IO_STATUS_BLOCK {
  union {
    NTSTATUS Status;
    PVOID Pointer;
  };
  ULONG_PTR Information;
} IO_STATUS_BLOCK, *PIO_STATUS_BLOCK;

typedef enum _FILE_INFORMATION_CLASS {
  FileDirectoryInformation = 1
} FILE_INFORMATION_CLASS;

typedef enum _NT_DIRECTORY_QUERY_FLAGS {
  SL_RESTART_SCAN = 0x01,
  SL_RETURN_SINGLE_ENTRY = 0x02,
  SL_INDEX_SPECIFIED = 0x04
} NT_DIRECTORY_QUERY_FLAGS;

typedef struct _FILE_STAT_BASIC_INFORMATION {
  LARGE_INTEGER FileId;
  LARGE_INTEGER CreationTime;
  LARGE_INTEGER LastAccessTime;
  LARGE_INTEGER LastWriteTime;
  LARGE_INTEGER ChangeTime;
  LARGE_INTEGER AllocationSize;
  LARGE_INTEGER EndOfFile;
  ULONG FileAttributes;
  ULONG ReparseTag;
  ULONG NumberOfLinks;
  ULONG DeviceType;
  ULONG DeviceCharacteristics;
  ULONG Reserved;
  LARGE_INTEGER VolumeSerialNumber;
  FILE_ID_128 FileId128;
} FILE_STAT_BASIC_INFORMATION, *PFILE_STAT_BASIC_INFORMATION;

typedef enum _FILE_INFO_BY_NAME_CLASS {
  FileStatByNameInfo,
  FileStatLxByNameInfo,
  FileCaseSensitiveByNameInfo,
  FileStatBasicByNameInfo,
  MaximumFileInfoByNameClass
} FILE_INFO_BY_NAME_CLASS;

typedef BOOL(WINAPI *sGetFileInformationByName)(
    PCWSTR FileName, FILE_INFO_BY_NAME_CLASS FileInformationClass,
    PVOID FileInfoBuffer, ULONG FileInfoBufferSize);

extern sGetFileInformationByName GetFileInformationByName;
#pragma comment(lib, "api-ms-win-core-file-l2-1-4.dll")
