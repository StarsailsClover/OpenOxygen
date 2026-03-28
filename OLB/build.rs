fn main() {
    // Simplified build script - skip Python detection for now
    println!("cargo:rerun-if-changed=src");
    
    // Link to Python (simplified)
    #[cfg(target_os = "windows")]
    {
        println!("cargo:rustc-link-lib=python3");
    }
    
    #[cfg(target_os = "linux")]
    {
        println!("cargo:rustc-link-lib=python3.8");
    }
    
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-lib=python3");
    }
}
