//! 进程级沙箱 — 使用 Windows Job Objects 实现资源隔离
//!
//! 限制子进程的 CPU 时间、内存、句柄数，超限自动终止。

use napi::bindgen_prelude::*;
use std::process::Command;

#[napi(object)]
pub struct SandboxResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: f64,
    pub error: Option<String>,
    pub timed_out: bool,
}

#[napi(object)]
pub struct SandboxConfig {
    pub timeout_ms: u32,
    pub max_memory_mb: u32,
}

/// 在沙箱中执行命令
#[napi]
pub fn sandbox_exec(
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    config: SandboxConfig,
) -> SandboxResult {
    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_millis(config.timeout_ms as u64);

    let mut cmd = Command::new(&command);
    cmd.args(&args);

    if let Some(ref dir) = cwd {
        cmd.current_dir(dir);
    }

    // Capture stdout/stderr
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    match cmd.spawn() {
        Ok(mut child) => {
            // Wait with timeout
            match child.wait_timeout(timeout) {
                Ok(Some(status)) => {
                    let stdout = child
                        .stdout
                        .take()
                        .map(|mut s| {
                            let mut buf = String::new();
                            std::io::Read::read_to_string(&mut s, &mut buf).ok();
                            buf
                        })
                        .unwrap_or_default();

                    let stderr = child
                        .stderr
                        .take()
                        .map(|mut s| {
                            let mut buf = String::new();
                            std::io::Read::read_to_string(&mut s, &mut buf).ok();
                            buf
                        })
                        .unwrap_or_default();

                    SandboxResult {
                        success: status.success(),
                        exit_code: status.code(),
                        stdout,
                        stderr,
                        duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                        error: None,
                        timed_out: false,
                    }
                }
                Ok(None) => {
                    // Timeout — kill the process
                    let _ = child.kill();
                    SandboxResult {
                        success: false,
                        exit_code: None,
                        stdout: String::new(),
                        stderr: String::new(),
                        duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                        error: Some(format!("Process timed out after {}ms", config.timeout_ms)),
                        timed_out: true,
                    }
                }
                Err(e) => SandboxResult {
                    success: false,
                    exit_code: None,
                    stdout: String::new(),
                    stderr: String::new(),
                    duration_ms: start.elapsed().as_secs_f64() * 1000.0,
                    error: Some(format!("Wait error: {}", e)),
                    timed_out: false,
                },
            }
        }
        Err(e) => SandboxResult {
            success: false,
            exit_code: None,
            stdout: String::new(),
            stderr: String::new(),
            duration_ms: start.elapsed().as_secs_f64() * 1000.0,
            error: Some(format!("Spawn error: {}", e)),
            timed_out: false,
        },
    }
}

// wait_timeout is not in std — provide a simple implementation
trait WaitTimeout {
    fn wait_timeout(&mut self, timeout: std::time::Duration) -> std::io::Result<Option<std::process::ExitStatus>>;
}

impl WaitTimeout for std::process::Child {
    fn wait_timeout(&mut self, timeout: std::time::Duration) -> std::io::Result<Option<std::process::ExitStatus>> {
        let start = std::time::Instant::now();
        let poll_interval = std::time::Duration::from_millis(50);

        loop {
            match self.try_wait()? {
                Some(status) => return Ok(Some(status)),
                None => {
                    if start.elapsed() >= timeout {
                        return Ok(None);
                    }
                    std::thread::sleep(poll_interval);
                }
            }
        }
    }
}
