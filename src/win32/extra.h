#pragma once
#include <windows.h>
#include <winternl.h>

typedef struct _UNICODE_STRING {
  USHORT Length;
  USHORT MaximumLength;
  PWSTR Buffer;
} UNICODE_STRING, *PUNICODE_STRING;

constexpr NTSTATUS STATUS_NO_MORE_FILES = 0x80000006;
constexpr NTSTATUS STATUS_NO_SUCH_FILE = 0xC000000F;

typedef struct _FILE_DIRECTORY_INFORMATION {
  ULONG NextEntryOffset;
  ULONG FileIndex;
  LARGE_INTEGER CreationTime;
  LARGE_INTEGER LastAccessTime;
  LARGE_INTEGER LastWriteTime;
  LARGE_INTEGER ChangeTime;
  LARGE_INTEGER EndOfFile;
  LARGE_INTEGER AllocationSize;
  ULONG FileAttributes;
  ULONG FileNameLength;
  WCHAR FileName[1];
} FILE_DIRECTORY_INFORMATION;

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

extern "C" {
BOOL WINAPI GetFileInformationByName(
    PCWSTR FileName, FILE_INFO_BY_NAME_CLASS FileInformationClass,
    PVOID FileInfoBuffer, ULONG FileInfoBufferSize);

NTSYSCALLAPI NTSTATUS NTAPI NtQueryDirectoryFileEx(
    HANDLE FileHandle, HANDLE Event, PVOID ApcRoutine, PVOID ApcContext,
    PIO_STATUS_BLOCK IoStatusBlock, PVOID FileInformation, ULONG Length,
    DWORD FileInformationClass, ULONG QueryFlags, PUNICODE_STRING FileName);
}

#pragma comment(lib, "api-ms-win-core-file-l2-1-4.dll")
