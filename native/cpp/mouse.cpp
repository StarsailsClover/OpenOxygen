/**
 * OpenOxygen Native - Mouse Control (C++)
 * 
 * High-performance Windows mouse control
 * Compiled to mouse.dll with Node-API bindings
 */

#include <windows.h>
#include <node_api.h>

// Mouse button constants
#define MOUSE_BUTTON_LEFT   0x01
#define MOUSE_BUTTON_RIGHT  0x02
#define MOUSE_BUTTON_MIDDLE 0x04

/**
 * Move mouse to absolute coordinates
 */
BOOL MouseMove(int x, int y) {
    // Convert to normalized coordinates (0-65535)
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    
    int normalizedX = (x * 65535) / screenWidth;
    int normalizedY = (y * 65535) / screenHeight;
    
    INPUT input = {0};
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
    input.mi.dx = normalizedX;
    input.mi.dy = normalizedY;
    
    return SendInput(1, &input, sizeof(INPUT));
}

/**
 * Click mouse button
 */
BOOL MouseClick(int button) {
    INPUT inputDown = {0};
    INPUT inputUp = {0};
    
    inputDown.type = INPUT_MOUSE;
    inputUp.type = INPUT_MOUSE;
    
    switch (button) {
        case MOUSE_BUTTON_LEFT:
            inputDown.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
            inputUp.mi.dwFlags = MOUSEEVENTF_LEFTUP;
            break;
        case MOUSE_BUTTON_RIGHT:
            inputDown.mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;
            inputUp.mi.dwFlags = MOUSEEVENTF_RIGHTUP;
            break;
        case MOUSE_BUTTON_MIDDLE:
            inputDown.mi.dwFlags = MOUSEEVENTF_MIDDLEDOWN;
            inputUp.mi.dwFlags = MOUSEEVENTF_MIDDLEUP;
            break;
        default:
            return FALSE;
    }
    
    SendInput(1, &inputDown, sizeof(INPUT));
    Sleep(50);
    return SendInput(1, &inputUp, sizeof(INPUT));
}

/**
 * Double click
 */
BOOL MouseDoubleClick(int button) {
    if (!MouseClick(button)) return FALSE;
    Sleep(50);
    return MouseClick(button);
}

/**
 * Drag mouse
 */
BOOL MouseDrag(int startX, int startY, int endX, int endY, int button) {
    // Move to start
    MouseMove(startX, startY);
    Sleep(100);
    
    // Press button
    INPUT inputDown = {0};
    inputDown.type = INPUT_MOUSE;
    if (button == MOUSE_BUTTON_LEFT) inputDown.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
    else if (button == MOUSE_BUTTON_RIGHT) inputDown.mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;
    else if (button == MOUSE_BUTTON_MIDDLE) inputDown.mi.dwFlags = MOUSEEVENTF_MIDDLEDOWN;
    SendInput(1, &inputDown, sizeof(INPUT));
    
    Sleep(100);
    
    // Move to end
    MouseMove(endX, endY);
    Sleep(100);
    
    // Release button
    INPUT inputUp = {0};
    inputUp.type = INPUT_MOUSE;
    if (button == MOUSE_BUTTON_LEFT) inputUp.mi.dwFlags = MOUSEEVENTF_LEFTUP;
    else if (button == MOUSE_BUTTON_RIGHT) inputUp.mi.dwFlags = MOUSEEVENTF_RIGHTUP;
    else if (button == MOUSE_BUTTON_MIDDLE) inputUp.mi.dwFlags = MOUSEEVENTF_MIDDLEUP;
    return SendInput(1, &inputUp, sizeof(INPUT));
}

/**
 * Scroll mouse wheel
 */
BOOL MouseScroll(int delta) {
    INPUT input = {0};
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_WHEEL;
    input.mi.mouseData = delta;
    
    return SendInput(1, &input, sizeof(INPUT));
}

/**
 * Get current mouse position
 */
BOOL GetMousePosition(int* x, int* y) {
    POINT pt;
    if (!GetCursorPos(&pt)) return FALSE;
    
    *x = pt.x;
    *y = pt.y;
    return TRUE;
}

// Node-API bindings
napi_value MouseMoveJS(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    int32_t x, y;
    napi_get_value_int32(env, args[0], &x);
    napi_get_value_int32(env, args[1], &y);
    
    BOOL result = MouseMove(x, y);
    
    napi_value returnVal;
    napi_get_boolean(env, result, &returnVal);
    return returnVal;
}

napi_value MouseClickJS(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    int32_t button;
    napi_get_value_int32(env, args[0], &button);
    
    BOOL result = MouseClick(button);
    
    napi_value returnVal;
    napi_get_boolean(env, result, &returnVal);
    return returnVal;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        { "mouseMove", nullptr, MouseMoveJS, nullptr, nullptr, nullptr, napi_default, nullptr },
        { "mouseClick", nullptr, MouseClickJS, nullptr, nullptr, nullptr, napi_default, nullptr },
    };
    
    napi_define_properties(env, exports, 2, desc);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
