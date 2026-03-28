// OpenOxygen Security Module - Rust
//
// 安全模块：沙箱、审计、加密

mod sandbox;
mod audit;

pub use sandbox::{Sandbox, SandboxConfig};
pub use audit::{AuditLogger, SecurityEvent, init_logger, log_event};

use neon::prelude::*;

/// Initialize security module
fn init_security(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let log_path = cx.argument::<JsString>(0)?.value(&mut cx);
    audit::init_logger(&log_path);
    Ok(cx.boolean(true))
}

/// Check if command is safe
fn is_command_safe(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let command = cx.argument::<JsString>(0)?.value(&mut cx);
    
    let sandbox = sandbox::Sandbox::new(sandbox::SandboxConfig::default());
    let is_safe = sandbox.is_command_safe(&command);
    
    Ok(cx.boolean(is_safe))
}

/// Log security event
fn log_security_event(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let event_type = cx.argument::<JsString>(0)?.value(&mut cx);
    let details = cx.argument::<JsString>(1)?.value(&mut cx);
    let user = cx.argument::<JsString>(2)?.value(&mut cx);
    
    let event = match event_type.as_str() {
        "command" => SecurityEvent::CommandExecuted { 
            command: details.clone(), 
            user: user.clone() 
        },
        "file" => SecurityEvent::FileAccessed { 
            path: details.clone(), 
            operation: "access".to_string() 
        },
        "network" => SecurityEvent::NetworkRequest { 
            url: details.clone(), 
            method: "GET".to_string() 
        },
        _ => SecurityEvent::PermissionDenied { 
            action: event_type, 
            reason: details 
        },
    };
    
    log_event(event, &user);
    Ok(cx.boolean(true))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("initSecurity", init_security)?;
    cx.export_function("isCommandSafe", is_command_safe)?;
    cx.export_function("logSecurityEvent", log_security_event)?;
    Ok(())
}
