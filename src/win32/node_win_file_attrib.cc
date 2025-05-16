#include <napi.h>

#define WIN32_LEAN_AND_MEAN
#define NTDDI_VERSION NTDDI_WIN7
#include <windows.h>

using namespace Napi;

static std::wstring stringToWString(const std::string& str) {
  if (str.empty()) return std::wstring();

  const int size_needed = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, nullptr, 0);
  std::wstring ret(size_needed, 0);
  MultiByteToWideChar(CP_UTF8, 0, ret.c_str(), -1, &ret[0], size_needed);
  return ret;
}

class SetWorker : public AsyncWorker {
public:
  SetWorker(const Function &callback, const std::string &path,
              const int attributes)
      : AsyncWorker(callback, "setAttributes"), _path(path),
        _attributes(flags), _errno(0) {}

  ~SetWorker() {}
  void Execute() override {
    const wstr = stringToWString(this._path);
    const auto success = SetFileAttributesW(wstr.c_str(), this->_attributes);
    if (!success) {
      this._errno = GetLastError();
      SetError("Failed");
    }
  }
  void OnError(const Napi::Error &error) override {
    HandleScope scope(Env());
    error.Set("errno", Number::New(Env(), this->_errno));
    error.Set("code", String::New(Env(), _errorToCode(this->_errno)));
    AsyncWorker::OnError(error);
  }

private:
  std::string _path;
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
Object Init(Napi::Env env, Object exports) {
  exports.Set("setAttributes", Function::New(env, SetAttributes));
  return exports;
}
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
