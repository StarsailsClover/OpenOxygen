//! 键盘与鼠标输入 — 使用 SendInput API
//!
//! 比 SendKeys / mouse_event 更可靠，支持 Unicode 直接输入。

use napi::bindgen_prelude::*;

#[cfg(windows)]
use windows::Win32::UI::Input::KeyboardAndMouse::*;
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::*;

#[napi(object)]
pub struct InputResult {
    pub success: bool,
    pub error: Option<String>,
}

/// 移动鼠标到绝对坐标并点击
#[napi]
pub fn mouse_click(x: i32, y: i32, button: String) -> InputResult {
    #[cfg(windows)]
    {
        match mouse_click_impl(x, y, &button) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

/// 鼠标双击
#[napi]
pub fn mouse_double_click(x: i32, y: i32) -> InputResult {
    #[cfg(windows)]
    {
        if let Err(e) = mouse_click_impl(x, y, "left") {
            return InputResult { success: false, error: Some(e.to_string()) };
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
        match mouse_click_impl(x, y, "left") {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

/// 移动鼠标到绝对坐标（不点击）
#[napi]
pub fn mouse_move(x: i32, y: i32) -> InputResult {
    #[cfg(windows)]
    {
        match mouse_move_impl(x, y) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

/// 鼠标滚轮
#[napi]
pub fn mouse_scroll(delta: i32) -> InputResult {
    #[cfg(windows)]
    {
        match mouse_scroll_impl(delta) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

/// 发送 Unicode 文本（直接输入，不依赖键盘布局）
#[napi]
pub fn type_text(text: String) -> InputResult {
    #[cfg(windows)]
    {
        match type_text_impl(&text) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

/// 发送按键组合（如 "ctrl+c", "alt+tab"）
#[napi]
pub fn send_hotkey(keys: String) -> InputResult {
    #[cfg(windows)]
    {
        match send_hotkey_impl(&keys) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

// ─── Win32 Implementations ─────────────────────────────────────────────────

#[cfg(windows)]
fn mouse_move_impl(x: i32, y: i32) -> anyhow::Result<()> {
    unsafe {
        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);
        let abs_x = (x as f64 / screen_w as f64 * 65535.0) as i32;
        let abs_y = (y as f64 / screen_h as f64 * 65535.0) as i32;

        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: abs_x,
                    dy: abs_y,
                    dwFlags: MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
                    ..Default::default()
                },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        Ok(())
    }
}

#[cfg(windows)]
fn mouse_click_impl(x: i32, y: i32, button: &str) -> anyhow::Result<()> {
    mouse_move_impl(x, y)?;
    std::thread::sleep(std::time::Duration::from_millis(10));

    unsafe {
        let (down_flag, up_flag) = match button {
            "right" => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            "middle" => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
            _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
        };

        let inputs = [
            INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: INPUT_0 {
                    mi: MOUSEINPUT { dwFlags: down_flag, ..Default::default() },
                },
            },
            INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: INPUT_0 {
                    mi: MOUSEINPUT { dwFlags: up_flag, ..Default::default() },
                },
            },
        ];
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        Ok(())
    }
}

#[cfg(windows)]
fn mouse_scroll_impl(delta: i32) -> anyhow::Result<()> {
    unsafe {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    mouseData: (delta * 120) as u32,
                    dwFlags: MOUSEEVENTF_WHEEL,
                    ..Default::default()
                },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        Ok(())
    }
}

#[cfg(windows)]
fn type_text_impl(text: &str) -> anyhow::Result<()> {
    unsafe {
        let mut inputs = Vec::new();
        for ch in text.encode_utf16() {
            // Key down
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wScan: ch,
                        dwFlags: KEYEVENTF_UNICODE,
                        ..Default::default()
                    },
                },
            });
            // Key up
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wScan: ch,
                        dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        ..Default::default()
                    },
                },
            });
        }
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        Ok(())
    }
}

#[cfg(windows)]
fn send_hotkey_impl(keys: &str) -> anyhow::Result<()> {
    let parts: Vec<&str> = keys.split('+').map(|s| s.trim().to_lowercase().leak() as &str).collect();
    let mut vkeys = Vec::new();

    for part in &parts {
        let vk = match *part {
            "ctrl" | "control" => VK_CONTROL,
            "alt" => VK_MENU,
            "shift" => VK_SHIFT,
            "win" | "super" => VK_LWIN,
            "tab" => VK_TAB,
            "enter" | "return" => VK_RETURN,
            "esc" | "escape" => VK_ESCAPE,
            "space" => VK_SPACE,
            "backspace" => VK_BACK,
            "delete" | "del" => VK_DELETE,
            "home" => VK_HOME,
            "end" => VK_END,
            "pageup" => VK_PRIOR,
            "pagedown" => VK_NEXT,
            "up" => VK_UP,
            "down" => VK_DOWN,
            "left" => VK_LEFT,
            "right" => VK_RIGHT,
            "f1" => VK_F1, "f2" => VK_F2, "f3" => VK_F3, "f4" => VK_F4,
            "f5" => VK_F5, "f6" => VK_F6, "f7" => VK_F7, "f8" => VK_F8,
            "f9" => VK_F9, "f10" => VK_F10, "f11" => VK_F11, "f12" => VK_F12,
            s if s.len() == 1 => VIRTUAL_KEY(s.chars().next().unwrap().to_ascii_uppercase() as u16),
            _ => continue,
        };
        vkeys.push(vk);
    }

    unsafe {
        let mut inputs = Vec::new();
        // Press all keys
        for &vk in &vkeys {
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk,
                        ..Default::default()
                    },
                },
            });
        }
        // Release all keys (reverse order)
        for &vk in vkeys.iter().rev() {
            inputs.push(INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk,
                        dwFlags: KEYEVENTF_KEYUP,
                        ..Default::default()
                    },
                },
            });
        }
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
    Ok(())
}
