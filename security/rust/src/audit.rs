// Rust Security Module - Audit
//
// 审计日志，记录所有操作

use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use chrono::Local;

/// Audit log entry
#[derive(Debug)]
pub struct AuditEntry {
    pub timestamp: String,
    pub level: String,
    pub category: String,
    pub action: String,
    pub user: String,
    pub details: String,
}

/// Audit logger
pub struct AuditLogger {
    log_path: String,
    entries: Mutex<Vec<AuditEntry>>,
}

impl AuditLogger {
    pub fn new(log_path: &str) -> Self {
        AuditLogger {
            log_path: log_path.to_string(),
            entries: Mutex::new(Vec::new()),
        }
    }
    
    /// Log an action
    pub fn log(&self, level: &str, category: &str, action: &str, user: &str, details: &str) {
        let entry = AuditEntry {
            timestamp: Local::now().to_rfc3339(),
            level: level.to_string(),
            category: category.to_string(),
            action: action.to_string(),
            user: user.to_string(),
            details: details.to_string(),
        };
        
        // Add to memory buffer
        if let Ok(mut entries) = self.entries.lock() {
            entries.push(entry);
            
            // Flush to disk every 100 entries
            if entries.len() >= 100 {
                let _ = self.flush();
            }
        }
    }
    
    /// Flush to disk
    pub fn flush(&self) -> Result<(), String> {
        let entries = self.entries.lock()
            .map_err(|e| e.to_string())?;
        
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)
            .map_err(|e| e.to_string())?;
        
        for entry in entries.iter() {
            let line = format!(
                "[{}] [{}] [{}] {} - {}: {}\n",
                entry.timestamp, entry.level, entry.user,
                entry.category, entry.action, entry.details
            );
            file.write_all(line.as_bytes())
                .map_err(|e| e.to_string())?;
        }
        
        Ok(())
    }
    
    /// Query audit log
    pub fn query(&self, category: Option<&str>, start_time: Option<&str>, end_time: Option<&str>) -> Vec<&AuditEntry> {
        // Simplified query - would implement proper filtering
        if let Ok(entries) = self.entries.lock() {
            entries.iter()
                .filter(|e| category.map_or(true, |c| e.category == c))
                .collect()
        } else {
            Vec::new()
        }
    }
}

/// Security events
pub enum SecurityEvent {
    CommandExecuted { command: String, user: String },
    FileAccessed { path: String, operation: String },
    NetworkRequest { url: String, method: String },
    Authentication { user: String, success: bool },
    PermissionDenied { action: String, reason: String },
}

impl SecurityEvent {
    pub fn to_audit_entry(&self) -> (String, String, String, String) {
        match self {
            SecurityEvent::CommandExecuted { command, user } => (
                "INFO".to_string(),
                "COMMAND".to_string(),
                "EXECUTED".to_string(),
                format!("Command: {}, User: {}", command, user)
            ),
            SecurityEvent::FileAccessed { path, operation } => (
                "INFO".to_string(),
                "FILE".to_string(),
                operation.to_uppercase(),
                format!("Path: {}", path)
            ),
            SecurityEvent::NetworkRequest { url, method } => (
                "INFO".to_string(),
                "NETWORK".to_string(),
                method.to_uppercase(),
                format!("URL: {}", url)
            ),
            SecurityEvent::Authentication { user, success } => (
                if *success { "INFO" } else { "WARN" }.to_string(),
                "AUTH".to_string(),
                if *success { "SUCCESS" } else { "FAILED" }.to_string(),
                format!("User: {}", user)
            ),
            SecurityEvent::PermissionDenied { action, reason } => (
                "ERROR".to_string(),
                "PERMISSION".to_string(),
                "DENIED".to_string(),
                format!("Action: {}, Reason: {}", action, reason)
            ),
        }
    }
}

// Global logger
static mut LOGGER: Option<AuditLogger> = None;

pub fn init_logger(log_path: &str) {
    unsafe {
        LOGGER = Some(AuditLogger::new(log_path));
    }
}

pub fn log_event(event: SecurityEvent, user: &str) {
    let (level, category, action, details) = event.to_audit_entry();
    
    unsafe {
        if let Some(ref logger) = LOGGER {
            logger.log(&level, &category, &action, user, &details);
        }
    }
}
