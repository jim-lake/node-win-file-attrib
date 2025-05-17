#define WIN32_LEAN_AND_MEAN
#define NTDDI_VERSION NTDDI_WIN7

#include "extra.h"
#include <napi.h>
#include <windows.h>

#define NSEC_PER_TICK 100
#define TICKS_PER_MSEC 10000
#define TICKS_PER_SEC ((int64_t)1e9 / NSEC_PER_TICK)
static const int64_t WIN_TO_UNIX_TICK_OFFSET = 11644473600 * TICKS_PER_SEC;

static inline double _filetimeToUnixMs(int64_t filetime) {
  filetime -= WIN_TO_UNIX_TICK_OFFSET;
  return double(filetime) / TICKS_PER_MSEC;
}

static sGetFileInformationByName pGetFileInformationByName = NULL;

using namespace Napi;

typedef struct {
  std::u16string name;
  uint64_t size;
  int attributes;
  double cTimeMs;
  double mTimeMs;
} WindowsDirent;

class SetWorker : public AsyncWorker {
public:
  SetWorker(const Function &callback, const std::u16string &path,
            const int attributes)
      : AsyncWorker(callback, "setAttributes"), _path(path),
        _attributes(attributes), _errno(0) {}

  ~SetWorker() {}
  void Execute() override {
    const auto success = SetFileAttributesW(
        reinterpret_cast<LPCWSTR>(this->_path.c_str()), this->_attributes);
    if (!success) {
      this->_errno = GetLastError();
      SetError("Failed");
    }
  }
  void OnError(const Napi::Error &error) override {
    HandleScope scope(Env());
    error.Set("errno", Number::New(Env(), this->_errno));
    AsyncWorker::OnError(error);
  }

private:
  std::u16string _path;
  int _attributes;
  int _errno;
};
class GetWorker : public AsyncWorker {
public:
  GetWorker(const Function &callback, const std::u16string &path)
      : AsyncWorker(callback, "getAttributes"), _path(path), _errno(0) {}

  ~GetWorker() {}
  void Execute() override {
    OBJECT_ATTRIBUTES attribs{};
    const auto len = this->_path.length();
    const auto Length = static_cast<USHORT>(len * sizeof(wchar_t));
    UNICODE_STRING ustring{
        .Length = Length,
        .MaximumLength = Length + sizeof(wchar_t),
        .Buffer = (LPWSTR)(this->_path.data()),
    };
    InitializeObjectAttributes(&attribs, &ustring, OBJ_CASE_INSENSITIVE, NULL,
                               NULL);

    IO_STATUS_BLOCK io_status{0};
    FILE_STAT_INFORMATION info;
    const NTSTATUS status =
        NtQueryInformationByName(&attribs, &io_status, &info, sizeof(info),
                                 (FILE_INFORMATION_CLASS)FileStatInformation);
    printf("status: 0x%x\n", status);
    if (NT_SUCCESS(status)) {
      this->_size = info.EndOfFile.QuadPart;
      this->_attributes = info.FileAttributes;
      this->_cTimeMs = _filetimeToUnixMs(info.ChangeTime.QuadPart);
      this->_mTimeMs = _filetimeToUnixMs(info.LastWriteTime.QuadPart);
    } else {
      this->_errno = status;
      SetError("Query Failed");
    }

    /*
    if (pGetFileInformationByName == NULL) {
      HANDLE h_file = CreateFileW(
          reinterpret_cast<LPCWSTR>(this->_path.c_str()), GENERIC_READ,
          FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);

      if (h_file != INVALID_HANDLE_VALUE) {
        BY_HANDLE_FILE_INFORMATION info;
        const auto success = GetFileInformationByHandle(h_file, &info);
        if (success) {
          this->_dev = info.dwVolumeSerialNumber;
          this->_size = info.nFileSizeHigh;
          this->_size <<= 32;
          this->_size += info.nFileSizeLow;
          this->_attributes = info.dwFileAttributes;
          this->_mTimeMs =
              _filetimeToUnixMs(*((int64_t *)&info.ftLastWriteTime));
          this->_cTimeMs = this->_mTimeMs;
        } else {
          this->_errno = GetLastError();
          SetError("Failed");
        }
        CloseHandle(h_file);
      } else {
        this->_errno = GetLastError();
        SetError("Open Failed");
      }
    } else {
      FILE_STAT_BASIC_INFORMATION info;
      const auto success = pGetFileInformationByName(
          reinterpret_cast<LPCWSTR>(this->_path.c_str()),
          FileStatBasicByNameInfo, &info, sizeof(info));
      if (success) {
        this->_dev = info.VolumeSerialNumber.QuadPart;
        this->_size = info.EndOfFile.QuadPart;
        this->_attributes = info.FileAttributes;
        this->_cTimeMs = _filetimeToUnixMs(info.ChangeTime.QuadPart);
        this->_mTimeMs = _filetimeToUnixMs(info.LastWriteTime.QuadPart);
      } else {
        this->_errno = GetLastError();
        SetError("Failed");
      }
    }*/
  }
  void OnOK() override {
    HandleScope scope(Env());
    const auto obj = Object::New(Env());
    obj.Set("dev", Number::New(Env(), this->_dev));
    obj.Set("size", Number::New(Env(), this->_size));
    obj.Set("attributes", Number::New(Env(), this->_attributes));
    obj.Set("cTimeMs", Number::New(Env(), this->_cTimeMs));
    obj.Set("mTimeMs", Number::New(Env(), this->_mTimeMs));
    Callback().Call({Env().Null(), obj});
  }
  void OnError(const Napi::Error &error) override {
    HandleScope scope(Env());
    error.Set("errno", Number::New(Env(), this->_errno));
    AsyncWorker::OnError(error);
  }

private:
  std::u16string _path;
  int64_t _dev;
  uint64_t _size;
  int _attributes;
  double _cTimeMs;
  double _mTimeMs;
  int _errno;
};

class QueryWorker : public AsyncWorker {
public:
  QueryWorker(const Function &callback, const std::u16string &path)
      : AsyncWorker(callback, "queryDirectory"), _path(path), _errno(0) {}

  ~QueryWorker() {}
  void Execute() override {

    HANDLE h_dir = CreateFileW(
        reinterpret_cast<LPCWSTR>(this->_path.c_str()), FILE_LIST_DIRECTORY,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr,
        OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, nullptr);

    if (h_dir == INVALID_HANDLE_VALUE) {
      this->_errno = GetLastError();
      SetError("Open Failed");
    } else {
      constexpr size_t BUFFER_SIZE = 16 * 4096;
      char *pbuf = new char[BUFFER_SIZE];
      IO_STATUS_BLOCK ioStatus = {0};
      const NTSTATUS start = NtQueryDirectoryFileEx(
          h_dir, 0, nullptr, nullptr, &ioStatus, pbuf, BUFFER_SIZE,
          FileDirectoryInformation, SL_RESTART_SCAN, nullptr);

      if (start != 0) {
        this->_errno = GetLastError();
        SetError("Start failed");
      } else {
        char *pcurr = pbuf;
        while (true) {
          FILE_DIRECTORY_INFORMATION *pinfo =
              reinterpret_cast<FILE_DIRECTORY_INFORMATION *>(pcurr);
          if (!((pinfo->FileAttributes & FILE_ATTRIBUTE_DIRECTORY) &&
                ((pinfo->FileNameLength == 4 && pinfo->FileName[0] == L'.' &&
                  pinfo->FileName[1] == L'.') ||
                 (pinfo->FileNameLength == 2 && pinfo->FileName[0] == L'.')))) {
            this->_results.push_back({
                .name = std::u16string(
                    reinterpret_cast<const char16_t *>(pinfo->FileName),
                    pinfo->FileNameLength / 2),
                .size = (uint64_t)pinfo->EndOfFile.QuadPart,
                .attributes = (int)pinfo->FileAttributes,
                .cTimeMs = _filetimeToUnixMs(pinfo->ChangeTime.QuadPart),
                .mTimeMs = _filetimeToUnixMs(pinfo->LastWriteTime.QuadPart),
            });
          }
          if (pinfo->NextEntryOffset != 0) {
            pcurr += pinfo->NextEntryOffset;
          } else {
            const NTSTATUS status = NtQueryDirectoryFileEx(
                h_dir, 0, nullptr, nullptr, &ioStatus, pbuf, BUFFER_SIZE,
                FileDirectoryInformation, 0, nullptr);
            if (status == STATUS_NO_MORE_FILES) {
              break;
            } else if (!NT_SUCCESS(status)) {
              this->_errno = GetLastError();
              SetError("Continue Failed");
              break;
            } else {
              pcurr = pbuf;
            }
          }
        }
      }
      delete pbuf;
      CloseHandle(h_dir);
    }
  }
  void OnOK() override {
    HandleScope scope(Env());
    const auto size = this->_results.size();
    const auto array = Array::New(Env(), size);
    for (int i = 0; i < size; i++) {
      const auto obj = Object::New(Env());
      obj.Set("name", String::New(Env(), this->_results[i].name));
      obj.Set("size", Number::New(Env(), this->_results[i].size));
      obj.Set("attributes", Number::New(Env(), this->_results[i].attributes));
      obj.Set("cTimeMs", Number::New(Env(), this->_results[i].cTimeMs));
      obj.Set("mTimeMs", Number::New(Env(), this->_results[i].mTimeMs));
      array.Set(i, obj);
    }
    Callback().Call({Env().Null(), array});
  }
  void OnError(const Napi::Error &error) override {
    HandleScope scope(Env());
    error.Set("errno", Number::New(Env(), this->_errno));
    AsyncWorker::OnError(error);
  }

private:
  std::u16string _path;
  std::vector<WindowsDirent> _results;
  int _attributes;
  int _errno;
};
Value SetAttributes(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 3) {
    ret = String::New(env, "Expected 3 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else if (!info[1].IsNumber()) {
    ret = String::New(env, "Expected number arg 1");
  } else if (!info[2].IsFunction()) {
    ret = String::New(env, "Expected function arg 2");
  } else {
    const auto path = info[0].As<String>();
    const auto attributes = info[1].As<Number>().Int32Value();
    const auto cb = info[2].As<Function>();
    const auto worker = new SetWorker(cb, path, attributes);
    worker->Queue();
  }
  return ret;
}
Value GetAttributes(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 2) {
    ret = String::New(env, "Expected 2 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else if (!info[1].IsFunction()) {
    ret = String::New(env, "Expected function arg 1");
  } else {
    const auto path = info[0].As<String>();
    const auto cb = info[1].As<Function>();
    const auto worker = new GetWorker(cb, path);
    worker->Queue();
  }
  return ret;
}
Value QueryDirectory(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() != 2) {
    ret = String::New(env, "Expected 2 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else if (!info[1].IsFunction()) {
    ret = String::New(env, "Expected function arg 1");
  } else {
    const auto path = info[0].As<String>();
    const auto cb = info[1].As<Function>();
    const auto worker = new QueryWorker(cb, path);
    worker->Queue();
  }
  return ret;
}
Object Init(Napi::Env env, Object exports) {
  HMODULE api_win_core_file_module =
      GetModuleHandleA("api-ms-win-core-file-l2-1-4.dll");
  if (api_win_core_file_module != NULL) {
    pGetFileInformationByName = (sGetFileInformationByName)GetProcAddress(
        api_win_core_file_module, "GetFileInformationByName");
  }

  exports.Set("setAttributes", Function::New(env, SetAttributes));
  exports.Set("getAttributes", Function::New(env, GetAttributes));
  exports.Set("queryDirectory", Function::New(env, QueryDirectory));

  if (pGetFileInformationByName == NULL) {
    exports.Set("_slowApi", Napi::Boolean::New(env, true));
  }
  return exports;
}
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
