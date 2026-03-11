//! 进程管理 — 枚举、启动、终止

use napi::bindgen_prelude::*;

#[cfg(windows)]
use windows::Win32::System::Threading::*;
#[cfg(windows)]
use windows::Win32::System::ProcessStatus::*;
#[cfg(windows)]
use windows::Win32::Foundation::*;

#[napi(object)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub memory_bytes: i64,
}

/// 列出所有进程
#[napi]
pub fn list_processes() -> Vec<ProcessInfo> {
    #[cfg(windows)]
    {
        list_processes_impl().unwrap_or_default()
    }
    #[cfg(not(windows))]
    {
        vec![]
    }
}

/// 终止进程
#[napi]
pub fn kill_process(pid: u32) -> bool {
    #[cfg(windows)]
    unsafe {
        let handle = OpenProcess(PROCESS_TERMINATE, false, pid);
        match handle {
            Ok(h) => {
                let result = TerminateProcess(h, 1).is_ok();
                let _ = CloseHandle(h);
                result
            }
            Err(_) => false,
        }
    }
    #[cfg(not(windows))]
    {
        false
    }
}

#[cfg(windows)]
fn list_processes_impl() -> anyhow::Result<Vec<ProcessInfo>> {
    unsafe {
        let mut pids = vec![0u32; 4096];
        let mut bytes_returned = 0u32;
        EnumProcesses(
            pids.as_mut_ptr(),
            (pids.len() * std::mem::size_of::<u32>()) as u32,
            &mut bytes_returned,
        )?;

        let count = bytes_returned as usize / std::mem::size_of::<u32>();
        let mut result = Vec::new();

        for &pid in &pids[..count] {
            if pid == 0 { continue; }

            let handle = OpenProcess(
                PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                false,
                pid,
            );

            if let Ok(h) = handle {
                let mut name_buf = [0u16; 260];
                let mut pmc = PROCESS_MEMORY_COUNTERS::default();
                pmc.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;

                let mut module = HMODULE::default();
                let mut needed = 0u32;

                let name = if EnumProcessModules(
                    h,
                    &mut module,
                    std::mem::size_of::<HMODULE>() as u32,
                    &mut needed,
                ).is_ok() {
                    GetModuleBaseNameW(h, module, &mut name_buf);
                    let len = name_buf.iter().position(|&c| c == 0).unwrap_or(name_buf.len());
                    String::from_utf16_lossy(&name_buf[..len])
                } else {
                    String::from("<unknown>")
                };

                let memory = if GetProcessMemoryInfo(
                    h,
                    &mut pmc as *mut _ as *mut _,
                    std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
                ).is_ok() {
                    pmc.WorkingSetSize as i64
                } else {
                    0
                };

                let _ = CloseHandle(h);

                result.push(ProcessInfo {
                    pid,
                    name,
                    memory_bytes: memory,
                });
            }
        }

        Ok(result)
    }
}
