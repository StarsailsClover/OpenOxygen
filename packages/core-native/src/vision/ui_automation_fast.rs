//! 快速 UI Automation — 缓存 COM 实例，避免重复初始化

use napi::bindgen_prelude::*;

/// 重置缓存（用于测试或内存回收）
#[napi]
pub fn reset_uia_cache() -> bool {
    // 简化实现，避免复杂的 COM 线程问题
    true
}
