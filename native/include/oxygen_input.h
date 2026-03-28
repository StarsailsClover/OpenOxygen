#ifndef OXYGEN_INPUT_H
#define OXYGEN_INPUT_H

#include "oxygen_core.h"
#include <windows.h>

namespace Oxygen {
namespace Input {

enum class MouseButton {
    LEFT = 0x01,
    RIGHT = 0x02,
    MIDDLE = 0x04
};

class MouseController {
public:
    static bool MoveTo(int x, int y);
    static bool Click(MouseButton button = MouseButton::LEFT);
    static bool GetPosition(int& x, int& y);
};

class KeyboardController {
public:
    static bool KeyPress(int keyCode);
    static bool TypeText(const std::string& text);
};

} // namespace Input
} // namespace Oxygen

#endif
