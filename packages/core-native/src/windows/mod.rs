//! Windows 系统控制模块
//!
//! 直接调用 Win32 API，零 FFI 开销（windows-rs 是编译期绑定）。
//! 涵盖：屏幕截图、键鼠输入、窗口枚举、进程管理、注册表、剪贴板。

pub mod capture;
pub mod clipboard;
pub mod input;
pub mod process;
pub mod registry;
pub mod window;
