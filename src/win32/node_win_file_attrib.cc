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

using namespace Napi;

typedef struct {
  std::u16string name;
  uint64_t size;
  unsigned int attributes;
  double ctimeMs;
  double mtimeMs;
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
  unsigned int _attributes;
  unsigned int _errno;
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
    if (NT_SUCCESS(status)) {
      this->_size = info.EndOfFile.QuadPart;
      this->_attributes = info.FileAttributes;
      this->_ctimeMs = _filetimeToUnixMs(info.ChangeTime.QuadPart);
      this->_mtimeMs = _filetimeToUnixMs(info.LastWriteTime.QuadPart);
    } else if (status == 0xc000000d) {
      HANDLE h_file = CreateFileW(
          reinterpret_cast<LPCWSTR>(this->_path.c_str()), FILE_READ_ATTRIBUTES,
          FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, NULL,
          OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, NULL);

      if (h_file != INVALID_HANDLE_VALUE) {
        BY_HANDLE_FILE_INFORMATION info;
        const auto success = GetFileInformationByHandle(h_file, &info);
        if (success) {
          this->_size = info.nFileSizeHigh;
          this->_size <<= 32;
          this->_size += info.nFileSizeLow;
          this->_attributes = info.dwFileAttributes;
          this->_mtimeMs =
              _filetimeToUnixMs(*((int64_t *)&info.ftLastWriteTime));
          this->_ctimeMs = this->_mtimeMs;
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
      this->_errno = status;
      SetError("Query Failed");
    }
  }
  void OnOK() override {
    HandleScope scope(Env());
    const auto obj = Object::New(Env());
    obj.Set("size", Number::New(Env(), this->_size));
    obj.Set("attributes", Number::New(Env(), this->_attributes));
    obj.Set("ctimeMs", Number::New(Env(), this->_ctimeMs));
    obj.Set("mtimeMs", Number::New(Env(), this->_mtimeMs));
    Callback().Call({Env().Null(), obj});
  }
  void OnError(const Napi::Error &error) override {
    HandleScope scope(Env());
    error.Set("errno", Number::New(Env(), this->_errno));
    AsyncWorker::OnError(error);
  }

private:
  std::u16string _path;
  uint64_t _size;
  unsigned int _attributes;
  double _ctimeMs;
  double _mtimeMs;
  unsigned int _errno;
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
      constexpr size_t BUFFER_SIZE = 64 * 4096;
      char *pbuf = new char[BUFFER_SIZE];
      IO_STATUS_BLOCK ioStatus = {0};
      const NTSTATUS start_status = NtQueryDirectoryFileEx(
          h_dir, 0, nullptr, nullptr, &ioStatus, pbuf, BUFFER_SIZE,
          FileDirectoryInformation, SL_RESTART_SCAN, nullptr);

      if (!NT_SUCCESS(start_status)) {
        this->_errno = start_status;
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
                .attributes = pinfo->FileAttributes,
                .ctimeMs = _filetimeToUnixMs(pinfo->ChangeTime.QuadPart),
                .mtimeMs = _filetimeToUnixMs(pinfo->LastWriteTime.QuadPart),
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
              this->_errno = status;
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
      obj.Set("ctimeMs", Number::New(Env(), this->_results[i].ctimeMs));
      obj.Set("mtimeMs", Number::New(Env(), this->_results[i].mtimeMs));
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
  unsigned int _attributes;
  unsigned int _errno;
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
