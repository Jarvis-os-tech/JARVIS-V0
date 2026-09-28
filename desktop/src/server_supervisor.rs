use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use crate::config::find_production_dir;

pub struct ServerSupervisor {
    child: Arc<Mutex<Option<Child>>>,
    persist_on_exit: bool,
}

impl ServerSupervisor {
    pub fn new(persist_on_exit: bool) -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            persist_on_exit,
        }
    }

    /// Checks if the backend server at port 3000 is running, and starts the production daemon if not.
    pub fn ensure_server_running(&self, workspace_root: &Path) -> Result<(), String> {
        if self.is_server_alive() {
            println!("[Supervisor] J.A.R.V.I.S. production server is already active at http://localhost:3000");
            return Ok(());
        }

        let prod_dir = find_production_dir();
        ensure_production_bundle(workspace_root, &prod_dir)?;

        println!("[Supervisor] Starting J.A.R.V.I.S. production daemon from {:?}", prod_dir);

        let node_bin = which::which("node")
            .or_else(|_| which::which("/usr/bin/node"))
            .map_err(|e| format!("Could not find node in PATH: {}", e))?;

        let server_js = prod_dir.join("dist/server.js");
        if !server_js.exists() {
            return Err(format!("Production server entrypoint not found at {:?}", server_js));
        }

        let log_file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(prod_dir.join(".server.log"))
            .map(Stdio::from)
            .unwrap_or_else(|_| Stdio::null());

        let mut cmd = Command::new(node_bin);
        cmd.arg(&server_js)
            .current_dir(&prod_dir)
            .env("NODE_ENV", "production")
            .env("PORT", "3000")
            .env("AUTO_LAUNCH", "false")
            .stdout(log_file)
            .stderr(Stdio::null());

        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }

        let spawned = cmd.spawn().map_err(|e| format!("Failed to spawn production server: {}", e))?;
        {
            let mut lock = self.child.lock().unwrap();
            *lock = Some(spawned);
        }

        // Poll until ready
        println!("[Supervisor] Waiting for http://localhost:3000 to become responsive...");
        let start = Instant::now();
        let timeout = Duration::from_secs(20);

        while start.elapsed() < timeout {
            if self.is_server_alive() {
                println!("[Supervisor] J.A.R.V.I.S. production server is online and ready!");
                return Ok(());
            }
            thread::sleep(Duration::from_millis(500));
        }

        Err("Timed out waiting for J.A.R.V.I.S. production server to respond at http://localhost:3000".to_string())
    }

    pub fn is_server_alive(&self) -> bool {
        if let Ok(resp) = ureq::get("http://localhost:3000")
            .timeout(Duration::from_millis(1200))
            .call()
        {
            return resp.status() < 500;
        }
        false
    }

    pub fn shutdown(&self) {
        let mut lock = self.child.lock().unwrap();
        if let Some(mut child) = lock.take() {
            println!("[Supervisor] Terminating production server process...");
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for ServerSupervisor {
    fn drop(&mut self) {
        if !self.persist_on_exit {
            self.shutdown();
        }
    }
}

/// Ensures the production directory has a valid, compiled build ready to execute.
pub fn ensure_production_bundle(workspace_root: &Path, prod_dir: &Path) -> Result<(), String> {
    let server_js = prod_dir.join("dist/server.js");
    if server_js.exists() {
        return Ok(());
    }

    println!("[Supervisor] Initializing production directory at {:?}...", prod_dir);
    std::fs::create_dir_all(prod_dir).map_err(|e| e.to_string())?;

    // Copy dist/ from workspace if exists, otherwise build it
    let ws_dist = workspace_root.join("dist");
    if !ws_dist.join("server.js").exists() {
        println!("[Supervisor] Building initial production bundle...");
        let npm = which::which("npm").map_err(|e| e.to_string())?;
        let status = Command::new(npm)
            .args(["run", "build"])
            .current_dir(workspace_root)
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("Failed to build initial production bundle".to_string());
        }
    }

    // Deploy dist
    copy_dir_all(&ws_dist, &prod_dir.join("dist"))?;

    // Deploy connectors
    let ws_connectors = workspace_root.join("connectors");
    if ws_connectors.exists() {
        let _ = copy_dir_all(&ws_connectors, &prod_dir.join("connectors"));
    }

    // Symlink node_modules so dependencies don't take duplicate disk space
    let prod_nm = prod_dir.join("node_modules");
    if !prod_nm.exists() {
        #[cfg(unix)]
        let _ = std::os::unix::fs::symlink(workspace_root.join("node_modules"), prod_nm);
    }

    // Symlink .env so keys are shared
    let prod_env = prod_dir.join(".env");
    if !prod_env.exists() {
        #[cfg(unix)]
        let _ = std::os::unix::fs::symlink(workspace_root.join(".env"), prod_env);
    }

    // Symlink data/ for saved tokens
    let prod_data = prod_dir.join("data");
    if !prod_data.exists() {
        #[cfg(unix)]
        let _ = std::os::unix::fs::symlink(workspace_root.join("data"), prod_data);
    }

    // Copy package.json
    let _ = std::fs::copy(workspace_root.join("package.json"), prod_dir.join("package.json"));

    // Save initial release commit
    let output = Command::new("git")
        .args(["rev-parse", "refs/remotes/origin/main"])
        .current_dir(workspace_root)
        .output();
    if let Ok(out) = output {
        if out.status.success() {
            let sha = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let _ = std::fs::write(prod_dir.join(".release_commit"), sha);
        }
    }

    Ok(())
}

pub fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.join(entry.file_name())).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
