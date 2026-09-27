mod config;
mod server_supervisor;
mod updater;

use config::{find_workspace_root, LOCAL_SERVER_URL};
use server_supervisor::ServerSupervisor;
use std::process::Command;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("============================================================");
    println!("      J.A.R.V.I.S. Autonomous AI Web App Launcher          ");
    println!("============================================================");

    let workspace_root = find_workspace_root();
    println!("[Launcher] Workspace Root: {:?}", workspace_root);

    // Support manual CLI update check
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--check-update" || a == "-u") {
        println!("[Launcher CLI] Running manual production update check against 'main' branch...");
        updater::check_and_prompt_update(&workspace_root);
        return Ok(());
    }

    // 1. Ensure Backend Server is Running (persists as a background daemon)
    let supervisor = ServerSupervisor::new(true);
    if let Err(e) = supervisor.ensure_server_running(&workspace_root) {
        eprintln!("[Launcher Warning] Server supervisor warning: {}", e);
    }

    // 2. Launch in Browser (Chromium App Mode or Default Browser)
    println!("[Launcher] Launching J.A.R.V.I.S. in browser...");
    launch_in_browser(LOCAL_SERVER_URL);

    // 3. Check for production updates on the 'main' branch in background (shows popup if update is found)
    println!("[Launcher] Checking for production updates on 'main'...");
    updater::check_and_prompt_update(&workspace_root);

    println!("[Launcher] J.A.R.V.I.S. is active in your browser at {}", LOCAL_SERVER_URL);
    Ok(())
}

fn launch_in_browser(url: &str) {
    // 1. Prefer Chromium in dedicated App Window mode (clean frameless window, full GPU & AudioWorklet acceleration)
    if let Ok(chromium_path) = which::which("chromium") {
        let app_arg = format!("--app={}", url);
        let mut cmd = Command::new(chromium_path);
        cmd.arg(&app_arg);
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }
        if cmd.spawn().is_ok() {
            println!("[Launcher] Opened in Chromium App Mode: {}", url);
            return;
        }
    }

    // 2. Try Google Chrome App Mode
    if let Ok(chrome_path) = which::which("google-chrome") {
        let app_arg = format!("--app={}", url);
        let mut cmd = Command::new(chrome_path);
        cmd.arg(&app_arg);
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }
        if cmd.spawn().is_ok() {
            println!("[Launcher] Opened in Chrome App Mode: {}", url);
            return;
        }
    }

    // 3. Fallback to default browser via xdg-open
    if let Ok(xdg_path) = which::which("xdg-open") {
        let mut cmd = Command::new(xdg_path);
        cmd.arg(url);
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }
        if cmd.spawn().is_ok() {
            println!("[Launcher] Opened in default browser via xdg-open: {}", url);
            return;
        }
    }

    println!("[Launcher] Please open {} in your web browser.", url);
}
