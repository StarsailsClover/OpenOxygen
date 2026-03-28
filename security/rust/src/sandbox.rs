// Rust Security Module - Sandbox
// 
// 安全沙箱，隔离危险操作
// 基于 Rust 的内存安全特性

use std::process::Command;
use std::path::Path;

/// Sandbox configuration
pub struct SandboxConfig {
    pub allowed_paths: Vec<String>,
    pub blocked_commands: Vec<String>,
    pub max_memory_mb: usize,
    pub max_cpu_time_secs: u64,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        SandboxConfig {
            allowed_paths: vec![
                "C:\\Users\\*\\Documents".to_string(),
                "C:\\Users\\*\\Downloads".to_string(),
            ],
            blocked_commands: vec![
                "format".to_string(),
                "fdisk".to_string(),
                "del /f /s /q C:\\".to_string(),
                "rm -rf /".to_string(),
                "shutdown".to_string(),
                "restart-computer".to_string(),
            ],
            max_memory_mb: 512,
            max_cpu_time_secs: 300,
        }
    }
}

/// Security sandbox
pub struct Sandbox {
    config: SandboxConfig,
}

impl Sandbox {
    pub fn new(config: SandboxConfig) -> Self {
        Sandbox { config }
    }
    
    /// Check if command is safe
    pub fn is_command_safe(&self, command: &str) -> bool {
        let cmd_lower = command.to_lowercase();
        
        for blocked in &self.config.blocked_commands {
            if cmd_lower.contains(&blocked.to_lowercase()) {
                return false;
            }
        }
        
        true
    }
    
    /// Check if path is allowed
    pub fn is_path_allowed(&self, path: &str) -> bool {
        // Simplified check - would use proper path matching
        for allowed in &self.config.allowed_paths {
            if path.starts_with(&allowed.replace("*", "")) {
                return true;
            }
        }
        false
    }
    
    /// Execute command in sandbox
    pub fn execute(&self, command: &str, args: &[&str]) -> Result<String, String> {
        if !self.is_command_safe(command) {
            return Err("Command blocked by sandbox".to_string());
        }
        
        // Would implement actual sandboxing using Windows Job Objects
        // For now, just validate
        Ok(format!("Would execute: {} {:?}", command, args))
    }
}

/// Node-API export
#[no_mangle]
pub extern "C" fn sandbox_create() -> *mut Sandbox {
    Box::into_raw(Box::new(Sandbox::new(SandboxConfig::default())))
}

#[no_mangle]
pub extern "C" fn sandbox_is_safe(sandbox: *mut Sandbox, command: *const u8, len: usize) -> bool {
    unsafe {
        let slice = std::slice::from_raw_parts(command, len);
        let cmd = String::from_utf8_lossy(slice);
        (*sandbox).is_command_safe(&cmd)
    }
}
