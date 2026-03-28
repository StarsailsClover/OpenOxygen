#include "../include/oxygen_input.h"
#include <vector>

namespace Oxygen {
namespace Input {

bool MouseController::MoveTo(int x, int y) {
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    
    INPUT input = {0};
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
    input.mi.dx = (x * 65535) / screenWidth;
    input.mi.dy = (y * 65535) / screenHeight;
    
    return SendInput(1, &input, sizeof(INPUT)) == 1;
}

bool MouseController::Click(MouseButton button) {
    INPUT inputs[2] = {0};
    inputs[0].type = INPUT_MOUSE;
    inputs[1].type = INPUT_MOUSE;
    
    DWORD flagDown = 0, flagUp = 0;
    switch (button) {
        case MouseButton::LEFT:
            flagDown = MOUSEEVENTF_LEFTDOWN;
            flagUp = MOUSEEVENTF_LEFTUP;
            break;
        case MouseButton::RIGHT:
            flagDown = MOUSEEVENTF_RIGHTDOWN;
            flagUp = MOUSEEVENTF_RIGHTUP;
            break;
        case MouseButton::MIDDLE:
            flagDown = MOUSEEVENTF_MIDDLEDOWN;
            flagUp = MOUSEEVENTF_MIDDLEUP;
            break;
    }
    
    inputs[0].mi.dwFlags = flagDown;
    inputs[1].mi.dwFlags = flagUp;
    
    return SendInput(2, inputs, sizeof(INPUT)) == 2;
}

bool MouseController::GetPosition(int& x, int& y) {
    POINT pt;
    if (GetCursorPos(&pt)) {
        x = pt.x;
        y = pt.y;
        return true;
    }
    return false;
}

bool KeyboardController::KeyPress(int keyCode) {
    INPUT inputs[2] = {0};
    inputs[0].type = INPUT_KEYBOARD;
    inputs[1].type = INPUT_KEYBOARD;
    inputs[0].ki.wVk = keyCode;
    inputs[1].ki.wVk = keyCode;
    inputs[1].ki.dwFlags = KEYEVENTF_KEYUP;
    
    return SendInput(2, inputs, sizeof(INPUT)) == 2;
}

bool KeyboardController::TypeText(const std::string& text) {
    std::vector<INPUT> inputs;
    for (char c : text) {
        INPUT down = {0}, up = {0};
        down.type = INPUT_KEYBOARD;
        up.type = INPUT_KEYBOARD;
        down.ki.dwFlags = KEYEVENTF_UNICODE;
        down.ki.wScan = c;
        up.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
        up.ki.wScan = c;
        inputs.push_back(down);
        inputs.push_back(up);
    }
    return SendInput(static_cast<UINT>(inputs.size()), inputs.data(), sizeof(INPUT)) == inputs.size();
}

} // namespace Input
} // namespace Oxygen
