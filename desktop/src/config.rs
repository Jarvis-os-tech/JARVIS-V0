use std::path::{Path, PathBuf};

pub const GITHUB_REPO: &str = "Jarvis-os-tech/JARVIS-V0";
pub const PRODUCTION_BRANCH: &str = "main";
pub const LOCAL_SERVER_URL: &str = "http://localhost:3000";

/// Dynamically locates the root directory of the JARVIS repository
pub fn find_workspace_root() -> PathBuf {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if is_jarvis_root(&cwd) {
        return cwd;
    }

    if let Some(parent) = cwd.parent() {
        if is_jarvis_root(parent) {
            return parent.to_path_buf();
        }
    }

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

/// Locates or creates the dedicated production release directory for Desktop J.A.R.V.I.S.
/// Completely decoupled from the active development workspace so 'dev' edits never affect desktop.
pub fn find_production_dir() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        let p = PathBuf::from(home).join(".local/share/jarvis/production");
        let _ = std::fs::create_dir_all(&p);
        p
    } else {
        let p = find_workspace_root().join(".production_release");
        let _ = std::fs::create_dir_all(&p);
        p
    }
}

fn is_jarvis_root(dir: &Path) -> bool {
    dir.join("package.json").exists() && dir.join("backend").exists() && dir.join("frontend").exists()
}
