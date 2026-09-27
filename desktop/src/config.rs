use std::path::{Path, PathBuf};

pub const GITHUB_REPO: &str = "Jarvis-os-tech/JARVIS-V0";
pub const PRODUCTION_BRANCH: &str = "main";
pub const DEV_BRANCH: &str = "dev";
pub const LOCAL_SERVER_URL: &str = "http://localhost:3000";
pub const UPDATE_CHECK_INTERVAL_SECS: u64 = 300;

/// Dynamically locates the root directory of the JARVIS repository
pub fn find_workspace_root() -> PathBuf {
    // 1. Check current directory
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if is_jarvis_root(&cwd) {
        return cwd;
    }

    // 2. Check parent of current directory (e.g. if run from desktop/)
    if let Some(parent) = cwd.parent() {
        if is_jarvis_root(parent) {
            return parent.to_path_buf();
        }
    }

    // 3. Check executable path parent
    if let Ok(exe_path) = std::env::current_exe() {
        let mut cur = exe_path.as_path();
        while let Some(parent) = cur.parent() {
            if is_jarvis_root(parent) {
                return parent.to_path_buf();
            }
            cur = parent;
        }
    }

    cwd
}

fn is_jarvis_root(dir: &Path) -> bool {
    dir.join("package.json").exists() && dir.join("backend").exists() && dir.join("frontend").exists()
}
