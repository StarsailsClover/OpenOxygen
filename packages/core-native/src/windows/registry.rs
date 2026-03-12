//! 注册表操作 — RegOpenKeyEx / RegQueryValueEx / RegSetValueEx

use napi::bindgen_prelude::*;

#[cfg(windows)]
use windows::Win32::System::Registry::*;
#[cfg(windows)]
use windows::core::PCWSTR;

use crate::input::InputResult;

/// 读取注册表字符串值
#[napi]
pub fn registry_read_string(key_path: String, value_name: String) -> Result<Option<String>> {
    #[cfg(windows)]
    {
        registry_read_string_impl(&key_path, &value_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
    #[cfg(not(windows))]
    {
        Ok(None)
    }
}

/// 写入注册表字符串值
#[napi]
pub fn registry_write_string(key_path: String, value_name: String, value: String) -> InputResult {
    #[cfg(windows)]
    {
        match registry_write_string_impl(&key_path, &value_name, &value) {
            Ok(()) => InputResult { success: true, error: None },
            Err(e) => InputResult { success: false, error: Some(e.to_string()) },
        }
    }
    #[cfg(not(windows))]
    {
        InputResult { success: false, error: Some("Requires Windows".into()) }
    }
}

#[cfg(windows)]
fn parse_hkey(path: &str) -> anyhow::Result<(HKEY, String)> {
    let parts: Vec<&str> = path.splitn(2, '\\').collect();
    if parts.len() < 2 {
        return Err(anyhow::anyhow!("Invalid registry path: {}", path));
    }

    let root = match parts[0].to_uppercase().as_str() {
        "HKLM" | "HKEY_LOCAL_MACHINE" => HKEY_LOCAL_MACHINE,
        "HKCU" | "HKEY_CURRENT_USER" => HKEY_CURRENT_USER,
        "HKCR" | "HKEY_CLASSES_ROOT" => HKEY_CLASSES_ROOT,
        "HKU" | "HKEY_USERS" => HKEY_USERS,
        _ => return Err(anyhow::anyhow!("Unknown registry root: {}", parts[0])),
    };

    Ok((root, parts[1].to_string()))
}

#[cfg(windows)]
fn registry_read_string_impl(key_path: &str, value_name: &str) -> anyhow::Result<Option<String>> {
    let (root, sub_key) = parse_hkey(key_path)?;

    unsafe {
        let sub_key_wide: Vec<u16> = sub_key.encode_utf16().chain(std::iter::once(0)).collect();
        let value_name_wide: Vec<u16> = value_name.encode_utf16().chain(std::iter::once(0)).collect();

        let mut hkey = HKEY::default();
        let status = RegOpenKeyExW(
            root,
            PCWSTR(sub_key_wide.as_ptr()),
            0,
            KEY_READ,
            &mut hkey,
        );

        if status.0 != 0 {
            return Ok(None);
        }

        let mut data_type = REG_VALUE_TYPE::default();
        let mut data_size = 0u32;

        let _ = RegQueryValueExW(
            hkey,
            PCWSTR(value_name_wide.as_ptr()),
            None,
            Some(&mut data_type),
            None,
            Some(&mut data_size),
        );

        if data_size == 0 {
            let _ = RegCloseKey(hkey);
            return Ok(None);
        }

        let mut buffer = vec![0u8; data_size as usize];
        let status = RegQueryValueExW(
            hkey,
            PCWSTR(value_name_wide.as_ptr()),
            None,
            Some(&mut data_type),
            Some(buffer.as_mut_ptr()),
            Some(&mut data_size),
        );

        let _ = RegCloseKey(hkey);

        if status.0 != 0 {
            return Ok(None);
        }

        let wide_slice = std::slice::from_raw_parts(
            buffer.as_ptr() as *const u16,
            data_size as usize / 2,
        );
        let len = wide_slice.iter().position(|&c| c == 0).unwrap_or(wide_slice.len());
        Ok(Some(String::from_utf16_lossy(&wide_slice[..len])))
    }
}

#[cfg(windows)]
fn registry_write_string_impl(key_path: &str, value_name: &str, value: &str) -> anyhow::Result<()> {
    let (root, sub_key) = parse_hkey(key_path)?;

    unsafe {
        let sub_key_wide: Vec<u16> = sub_key.encode_utf16().chain(std::iter::once(0)).collect();
        let value_name_wide: Vec<u16> = value_name.encode_utf16().chain(std::iter::once(0)).collect();
        let value_wide: Vec<u16> = value.encode_utf16().chain(std::iter::once(0)).collect();

        let mut hkey = HKEY::default();
        let mut disposition = REG_CREATE_KEY_DISPOSITION::default();

        let status = RegCreateKeyExW(
            root,
            PCWSTR(sub_key_wide.as_ptr()),
            0,
            None,
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut hkey,
            Some(&mut disposition),
        );

        if status.0 != 0 {
            return Err(anyhow::anyhow!("RegCreateKeyExW failed: {}", status.0));
        }

        let data = std::slice::from_raw_parts(
            value_wide.as_ptr() as *const u8,
            value_wide.len() * 2,
        );

        let status = RegSetValueExW(
            hkey,
            PCWSTR(value_name_wide.as_ptr()),
            0,
            REG_SZ,
            Some(data),
        );

        let _ = RegCloseKey(hkey);

        if status.0 != 0 {
            return Err(anyhow::anyhow!("RegSetValueExW failed: {}", status.0));
        }

        Ok(())
    }
}
