use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

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

    /// Checks if the backend server at port 3000 is running, and starts it if not.
    pub fn ensure_server_running(&self, workspace_root: &Path) -> Result<(), String> {
        if self.is_server_alive() {
            println!("[Supervisor] J.A.R.V.I.S. backend server is already active at http://localhost:3000");
            return Ok(());
        }

        println!("[Supervisor] Starting J.A.R.V.I.S. backend daemon from {:?}", workspace_root);
        let npm_bin = which::which("npm")
            .or_else(|_| which::which("/usr/bin/npm"))
            .map_err(|e| format!("Could not find npm in PATH: {}", e))?;

        let log_file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(workspace_root.join(".server.log"))
            .map(Stdio::from)
            .unwrap_or_else(|_| Stdio::null());

        let mut cmd = Command::new(npm_bin);
        cmd.arg("run")
            .arg("dev")
            .current_dir(workspace_root)
            .env("AUTO_LAUNCH", "false")
            .stdout(log_file)
            .stderr(Stdio::null());

        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }

        let spawned = cmd.spawn().map_err(|e| format!("Failed to spawn backend server: {}", e))?;
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
                println!("[Supervisor] J.A.R.V.I.S. server is online and ready!");
                return Ok(());
            }
            thread::sleep(Duration::from_millis(500));
        }

        Err("Timed out waiting for J.A.R.V.I.S. server to respond at http://localhost:3000".to_string())
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
            println!("[Supervisor] Terminating background server process...");
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
