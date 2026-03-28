#include <napi.h>
#include "oxygen_input.h"

using namespace Napi;

Value MouseMove(const CallbackInfo& info) {
    Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        TypeError::New(env, "Expected (x, y) coordinates").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int x = info[0].As<Number>().Int32Value();
    int y = info[1].As<Number>().Int32Value();
    
    bool result = Oxygen::Input::MouseController::MoveTo(x, y);
    return Boolean::New(env, result);
}

Value MouseClick(const CallbackInfo& info) {
    Env env = info.Env();
    
    int button = 0;
    if (info.Length() > 0 && info[0].IsNumber()) {
        button = info[0].As<Number>().Int32Value();
    }
    
    bool result = Oxygen::Input::MouseController::Click(
        static_cast<Oxygen::Input::MouseButton>(button));
    return Boolean::New(env, result);
}

Value MouseGetPosition(const CallbackInfo& info) {
    Env env = info.Env();
    
    int x, y;
    if (Oxygen::Input::MouseController::GetPosition(x, y)) {
        Object pos = Object::New(env);
        pos.Set("x", x);
        pos.Set("y", y);
        return pos;
    }
    
    return env.Null();
}

Value KeyPress(const CallbackInfo& info) {
    Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        TypeError::New(env, "Expected key code").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int keyCode = info[0].As<Number>().Int32Value();
    bool result = Oxygen::Input::KeyboardController::KeyPress(keyCode);
    return Boolean::New(env, result);
}

Value TypeText(const CallbackInfo& info) {
    Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        TypeError::New(env, "Expected text string").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string text = info[0].As<String>().Utf8Value();
    bool result = Oxygen::Input::KeyboardController::TypeText(text);
    return Boolean::New(env, result);
}

Object Init(Env env, Object exports) {
    exports.Set("mouseMove", Function::New(env, MouseMove));
    exports.Set("mouseClick", Function::New(env, MouseClick));
    exports.Set("mouseGetPosition", Function::New(env, MouseGetPosition));
    exports.Set("keyPress", Function::New(env, KeyPress));
    exports.Set("typeText", Function::New(env, TypeText));
    
    return exports;
}

NODE_API_MODULE(openoxygen_native, Init)
