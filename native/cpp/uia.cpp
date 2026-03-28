/**
 * OpenOxygen Native - UIA (UI Automation) (C++)
 * 
 * Windows UIA 元素定位与操作
 */

#include <windows.h>
#include <uiautomation.h>
#include <node_api.h>
#include <string>
#include <vector>

#pragma comment(lib, "uiautomationcore.lib")

IUIAutomation* g_pAutomation = nullptr;

/**
 * Initialize UIA
 */
BOOL UIA_Initialize() {
    if (g_pAutomation) return TRUE;
    
    HRESULT hr = CoInitializeEx(NULL, COINIT_MULTITHREADED);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
        return FALSE;
    }
    
    hr = CoCreateInstance(CLSID_CUIAutomation, NULL, CLSCTX_INPROC_SERVER, 
        IID_IUIAutomation, (void**)&g_pAutomation);
    
    return SUCCEEDED(hr);
}

/**
 * Find element by name
 */
BOOL UIA_FindElementByName(const char* name, long* x, long* y, long* width, long* height) {
    if (!g_pAutomation && !UIA_Initialize()) return FALSE;
    
    IUIAutomationElement* pRoot = nullptr;
    HRESULT hr = g_pAutomation->GetRootElement(&pRoot);
    if (FAILED(hr) || !pRoot) return FALSE;
    
    // Convert name to BSTR
    int wlen = MultiByteToWideChar(CP_UTF8, 0, name, -1, NULL, 0);
    BSTR bstrName = SysAllocStringLen(NULL, wlen);
    MultiByteToWideChar(CP_UTF8, 0, name, -1, bstrName, wlen);
    
    // Create condition
    IUIAutomationCondition* pCondition = nullptr;
    VARIANT varName;
    varName.vt = VT_BSTR;
    varName.bstrVal = bstrName;
    
    hr = g_pAutomation->CreatePropertyCondition(UIA_NamePropertyId, varName, &pCondition);
    SysFreeString(bstrName);
    
    if (FAILED(hr) || !pCondition) {
        pRoot->Release();
        return FALSE;
    }
    
    // Find element
    IUIAutomationElement* pElement = nullptr;
    hr = pRoot->FindFirst(TreeScope_Descendants, pCondition, &pElement);
    pCondition->Release();
    pRoot->Release();
    
    if (FAILED(hr) || !pElement) return FALSE;
    
    // Get bounding rectangle
    RECT rect;
    hr = pElement->CurrentBoundingRectangle(&rect);
    pElement->Release();
    
    if (FAILED(hr)) return FALSE;
    
    *x = rect.left;
    *y = rect.top;
    *width = rect.right - rect.left;
    *height = rect.bottom - rect.top;
    
    return TRUE;
}

/**
 * Click element by name
 */
BOOL UIA_ClickElement(const char* name) {
    long x, y, width, height;
    if (!UIA_FindElementByName(name, &x, &y, &width, &height)) return FALSE;
    
    // Move mouse to center
    INPUT input[2] = {0};
    
    // Move
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    
    input[0].type = INPUT_MOUSE;
    input[0].mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
    input[0].mi.dx = ((x + width/2) * 65535) / screenWidth;
    input[0].mi.dy = ((y + height/2) * 65535) / screenHeight;
    
    // Click
    input[1].type = INPUT_MOUSE;
    input[1].mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
    
    SendInput(2, input, sizeof(INPUT));
    
    Sleep(50);
    
    input[1].mi.dwFlags = MOUSEEVENTF_LEFTUP;
    SendInput(1, input, sizeof(INPUT));
    
    return TRUE;
}

/**
 * Get element text
 */
BOOL UIA_GetElementText(const char* name, char* buffer, int bufferSize) {
    if (!g_pAutomation && !UIA_Initialize()) return FALSE;
    
    // Simplified - would need full implementation
    strcpy_s(buffer, bufferSize, "UIA text");
    return TRUE;
}

// Node-API
napi_value UIA_FindElementJS(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    char name[256];
    size_t nameLen;
    napi_get_value_string_utf8(env, args[0], name, 256, &nameLen);
    
    long x, y, width, height;
    BOOL found = UIA_FindElementByName(name, &x, &y, &width, &height);
    
    napi_value obj;
    napi_create_object(env, &obj);
    
    napi_value foundVal, xVal, yVal, wVal, hVal;
    napi_get_boolean(env, found, &foundVal);
    napi_create_int32(env, x, &xVal);
    napi_create_int32(env, y, &yVal);
    napi_create_int32(env, width, &wVal);
    napi_create_int32(env, height, &hVal);
    
    napi_set_named_property(env, obj, "found", foundVal);
    napi_set_named_property(env, obj, "x", xVal);
    napi_set_named_property(env, obj, "y", yVal);
    napi_set_named_property(env, obj, "width", wVal);
    napi_set_named_property(env, obj, "height", hVal);
    
    return obj;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        { "findElement", nullptr, UIA_FindElementJS, nullptr, nullptr, nullptr, napi_default, nullptr },
    };
    
    napi_define_properties(env, exports, 1, desc);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
