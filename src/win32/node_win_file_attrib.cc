#include <napi.h>

#define WIN32_LEAN_AND_MEAN
#define NTDDI_VERSION NTDDI_WIN7
#include <windows.h>
#include "extra.h"

#define NSEC_PER_TICK 100
#define TICKS_PER_MSEC 10000
#define TICKS_PER_SEC ((int64_t)1e9 / NSEC_PER_TICK)
static const int64_t WIN_TO_UNIX_TICK_OFFSET = 11644473600 * TICKS_PER_SEC;

static inline uint64_t _filetimeToUnixMs(int64_t filetime) {
  filetime -= WIN_TO_UNIX_TICK_OFFSET;
  return filetime / TICKS_PER_MSEC;
}

using namespace Napi;

typedef struct {
  std::wstring filename;
  uint64_t size;
  int attributes;
  uint64_t cTimeMs;
  uint64_t mTimeMs;
} WindowsDirent;

static std::wstring stringToWString(const std::string &str) {
  if (str.empty())
    return std::wstring();

  const int needed =
      MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
  std::wstring ret(needed, L'\0');
  MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &ret[0], needed);
  return ret;
}

class SetWorker : public AsyncWorker {
public:
  SetWorker(const Function &callback, const std::wstring &path,
            const int attributes)
      : AsyncWorker(callback, "setAttributes"), _path(path),
        _attributes(attributes), _errno(0) {}

  ~SetWorker() {}
  void Execute() override {
    const auto success =
        SetFileAttributesW(this->_path.c_str(), this->_attributes);
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
  std::wstring _path;
  int _attributes;
  int _errno;
};
class GetWorker : public AsyncWorker {
public:
  GetWorker(const Function &callback, const std::wstring &path)
      : AsyncWorker(callback, "getAttributes"), _path(path), _errno(0) {}

  ~GetWorker() {}
  void Execute() override {
    FILE_STAT_BASIC_INFORMATION info;
    const auto success = GetFileInformationByName(
        this->_path.c_str(), FileStatBasicByNameInfo, &info, sizeof(info));
    if (success) {
      this->_dev = info.VolumeSerialNumber;
      this->_size = info.EndOfFile;
      this->_attributes = info.FileAttributes;
      this->_mTimeMs = _filetimeToUnixMs(info.LastWriteTime);
      this->_cTimeMs = _filetimeToUnixMs(info.ChangeTime);
    } else {
      this->_errno = GetLastError();
      SetError("Failed");
    }
  }
  void OnOK() override {
    HandleScope scope(Env());
    const auto obj = Object::New(Env());
    obj.Set("dev", Number::New(env, this->_dev));
    obj.Set("size", Number::New(env, this->_size));
    obj.Set("attributes", Number::New(env, this->_attributes));
    obj.Set("mTimeMs", Number::New(env, this->_mTimeMs));
    obj.Set("cTimeMs", Number::New(env, this->_cTimeMs));
    Callback().Call({Env().Null(), obj});
  }
  void OnError(const Napi::Error &error) override {
    HandleScope scope(Env());
    error.Set("errno", Number::New(Env(), this->_errno));
    AsyncWorker::OnError(error);
  }

private:
  std::wstring _path;
  int64_t _dev;
  uint64_t _size;
  int _attributes;
  uint64_t _mTimeMs;
  uint64_t _cTimeMs;
  int _errno;
};

class QueryWorker : public AsyncWorker {
public:
  QueryWorker(const Function &callback, const std::wstring &path)
      : AsyncWorker(callback, "queryDirectory"), _path(path), _errno(0) {}

  ~QueryWorker() {}
  void Execute() override {
    const auto wdir = stringToWString(this->_path);

    HANDLE h_dir = CreateFileW(
        wdir.c_str(), FILE_LIST_DIRECTORY,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr,
        OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, nullptr);

    if (h_dir == INVALID_HANDLE_VALUE) {
      SetError("Open Failed");
    } else {
      char buffer[8192];
      IO_STATUS_BLOCK ioStatus = {0};
      const NTSTATUS start = NtQueryDirectoryFileEx(
          h_dir, 0, nullptr, nullptr, &ioStatus, buffer, sizeof(buffer),
          FileDirectoryInformation, SL_RESTART_SCAN, nullptr);

      if (start != 0) {
        SetError("NtQueryDirectoryFileEx failed");
      } else {
        int fileCount = 0;
        char *curr = buffer;
        while (true) {
          FILE_DIRECTORY_INFORMATION *info =
              reinterpret_cast<FILE_DIRECTORY_INFORMATION *>(curr);

          if (info->NextEntryOffset != 0) {
            curr += info->NextEntryOffset;
          } else {
            const NTSTATUS status = NtQueryDirectoryFileEx(
                h_dir, 0, nullptr, nullptr, &ioStatus, buffer, sizeof(buffer),
                FileDirectoryInformation, 0, nullptr);
            if (status == STATUS_NO_MORE_FILES) {
              break;
            } else if (!NT_SUCCESS(status)) {
              SetError('Continue Failed') break;
            } else {
              curr = buffer;
            }
          }
        }
      }
      CloseHandle(h_dir);
    }
  }
  void OnOK() override {
    HandleScope scope(Env());
    Callback().Call({Env().Null(), Number::New(Env(), this->_attributes)});
  }
  void OnError(const Napi::Error &error) override {
    HandleScope scope(Env());
    error.Set("errno", Number::New(Env(), this->_errno));
    AsyncWorker::OnError(error);
  }

private:
  std::wstring _path;
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
  exports.Set("setAttributes", Function::New(env, SetAttributes));
  exports.Set("getAttributes", Function::New(env, GetAttributes));
  exports.Set("queryDirectory", Function::New(env, QueryDirectory));
  return exports;
}
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
