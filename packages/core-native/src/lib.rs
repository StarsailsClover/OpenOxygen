//! OpenOxygen Core Native — Rust 核心模块
//!
//! 通过 NAPI-RS 暴露给 Node.js/TypeScript 层：
//! - input: 高级输入系统（SendInput + 虚拟驱动 + 平滑移动 + 提权）
//! - windows: Win32 API 系统控制（截图、窗口、进程、注册表、剪贴板）
//! - vision: 三层视觉管道（UI Automation + 图像处理 + 视觉模型接口）
//! - memory: SIMD 加速向量检索
//! - sandbox: 进程级隔离执行

#[macro_use]
extern crate napi_derive;

pub mod db;
pub mod inference;
pub mod input;
pub mod memory;
pub mod sandbox;
pub mod vision;

#[cfg(windows)]
pub mod windows;

use napi::bindgen_prelude::*;

/// 返回 native 模块版本信息
#[napi]
pub fn native_version() -> String {
    format!(
        "openoxygen-core-native v{} (rustc {}, {})",
        env!("CARGO_PKG_VERSION"),
        rustc_version(),
        std::env::consts::ARCH,
    )
}

/// 返回系统信息
#[napi(object)]
pub struct SystemInfo {
    pub platform: String,
    pub arch: String,
    pub cpu_count: u32,
    pub total_memory_mb: i64,
    pub free_memory_mb: i64,
}

#[napi]
pub fn get_system_info() -> SystemInfo {
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_all();

    SystemInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        cpu_count: sys.cpus().len() as u32,
        total_memory_mb: (sys.total_memory() / 1024 / 1024) as i64,
        free_memory_mb: (sys.available_memory() / 1024 / 1024) as i64,
    }
}

fn rustc_version() -> &'static str {
    // Compile-time constant
    "1.82+"
}
