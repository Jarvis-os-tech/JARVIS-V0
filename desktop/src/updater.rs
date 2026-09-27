use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use crate::config::{find_workspace_root, DEV_BRANCH, GITHUB_REPO, PRODUCTION_BRANCH, UPDATE_CHECK_INTERVAL_SECS};
use rfd::{MessageButtons, MessageDialog, MessageDialogResult, MessageLevel};
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct GithubCommitAuthor {
    pub name: String,
    pub date: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GithubCommitDetails {
    pub author: GithubCommitAuthor,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GithubCommitResponse {
    pub sha: String,
    pub commit: GithubCommitDetails,
}

#[derive(Debug, Clone)]
pub enum AppEvent {
    UpdateAvailable(GithubCommitResponse),
}

pub struct UpdateChecker {
    is_checking: Arc<AtomicBool>,
}

impl UpdateChecker {
    pub fn new() -> Self {
        Self {
            is_checking: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Starts a background thread that periodically checks for production updates strictly on 'main'.
    /// Dispatches UI update dialogs to the main thread via EventLoopProxy to guarantee GTK thread safety.
    pub fn start_background_monitor(&self, proxy: tao::event_loop::EventLoopProxy<AppEvent>) {
        let is_checking = self.is_checking.clone();

        thread::spawn(move || {
            // Give the desktop UI 5 seconds to initialize before the first check
            thread::sleep(Duration::from_secs(5));

            loop {
                if !is_checking.load(Ordering::SeqCst) {
                    is_checking.store(true, Ordering::SeqCst);
                    let root = find_workspace_root();
                    if let Some(commit) = check_for_main_update(&root) {
                        println!("[Updater] Update available on 'main'. Dispatching to main UI thread...");
                        let _ = proxy.send_event(AppEvent::UpdateAvailable(commit));
                    }
                    is_checking.store(false, Ordering::SeqCst);
                }

                thread::sleep(Duration::from_secs(UPDATE_CHECK_INTERVAL_SECS));
            }
        });
    }
}

/// Queries GitHub API strictly for the 'main' (production) branch.
/// Ignores the 'dev' branch completely.
fn fetch_latest_main_commit() -> Result<GithubCommitResponse, String> {
    let url = format!(
        "https://api.github.com/repos/{}/commits/{}",
        GITHUB_REPO, PRODUCTION_BRANCH
    );

    let resp = ureq::get(&url)
        .set("User-Agent", "JARVIS-Desktop-Updater")
        .set("Accept", "application/vnd.github.v3+json")
        .timeout(Duration::from_secs(10))
        .call()
        .map_err(|e| format!("GitHub API network error: {}", e))?;

    let commit: GithubCommitResponse = resp
        .into_json()
        .map_err(|e| format!("Failed to parse GitHub commit JSON: {}", e))?;

    Ok(commit)
}

/// Reads the local applied release commit SHA from .release_commit, or queries git refs for origin/main.
fn get_local_production_sha(workspace_root: &Path) -> Option<String> {
    let release_file = workspace_root.join(".release_commit");
    if release_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&release_file) {
            let trimmed = content.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }

    // Fall back to git rev-parse refs/remotes/origin/main
    let output = Command::new("git")
        .arg("rev-parse")
        .arg("refs/remotes/origin/main")
        .current_dir(workspace_root)
        .output()
        .ok()?;

    if output.status.success() {
        let sha = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !sha.is_empty() {
            return Some(sha);
        }
    }

    None
}

/// Sets the current applied release commit SHA in .release_commit
fn save_local_production_sha(workspace_root: &Path, sha: &str) {
    let release_file = workspace_root.join(".release_commit");
    let _ = std::fs::write(release_file, sha.trim());
}

/// Pure check function: returns Some(commit) if an update is available on 'main'
pub fn check_for_main_update(workspace_root: &Path) -> Option<GithubCommitResponse> {
    println!("[Updater] Checking production branch '{}' on GitHub for updates...", PRODUCTION_BRANCH);

    let remote_commit = match fetch_latest_main_commit() {
        Ok(c) => c,
        Err(e) => {
            println!("[Updater] Check skipped: {}", e);
            return None;
        }
    };

    let local_sha = get_local_production_sha(workspace_root);
    let remote_sha = remote_commit.sha.trim();

    if let Some(ref local) = local_sha {
        if local.trim() == remote_sha {
            println!("[Updater] J.A.R.V.I.S. is already running the latest production release ({})", &remote_sha[..7.min(remote_sha.len())]);
            return None;
        }
    }

    Some(remote_commit)
}

/// Prompts the user on the main UI thread and applies the update if approved.
pub fn prompt_user_and_apply(workspace_root: &Path, remote_commit: &GithubCommitResponse) {
    let remote_sha = remote_commit.sha.trim();
    let short_remote = &remote_sha[..7.min(remote_sha.len())];
    let commit_msg = remote_commit.commit.message.lines().next().unwrap_or("Production update");
    let author = &remote_commit.commit.author.name;
    let date = &remote_commit.commit.author.date;

    println!("[Updater] New production update detected on 'main'!");
    println!("          Remote Commit: {}", remote_sha);
    println!("          Description  : {}", commit_msg);

    // Native UI Popup (always executes on main GTK thread)
    let dialog_description = format!(
        "A new production update is available on the 'main' branch!\n\n\
         • Commit : {}\n\
         • Message: {}\n\
         • Author : {}\n\
         • Date   : {}\n\n\
         Note: The '{}' branch codes are strictly isolated and will never update here.\n\n\
         Would you like to install the production update now?",
        short_remote, commit_msg, author, date, DEV_BRANCH
    );

    let result = MessageDialog::new()
        .set_title("J.A.R.V.I.S. System Update Available")
        .set_description(&dialog_description)
        .set_buttons(MessageButtons::YesNo)
        .set_level(MessageLevel::Info)
        .show();

    if result == MessageDialogResult::Yes {
        println!("[Updater] User confirmed update. Applying production release from 'main'...");
        apply_production_update(workspace_root, remote_sha);
    } else {
        println!("[Updater] User chose to postpone update.");
    }
}

/// CLI entrypoint for manual check
pub fn check_and_prompt_update(workspace_root: &Path) {
    if let Some(commit) = check_for_main_update(workspace_root) {
        prompt_user_and_apply(workspace_root, &commit);
    }
}

/// Performs safe update from origin/main without overwriting active dev work.
fn apply_production_update(workspace_root: &Path, new_sha: &str) {
    // 1. Fetch origin main
    let fetch_res = Command::new("git")
        .args(["fetch", "origin", "main"])
        .current_dir(workspace_root)
        .status();

    if let Err(e) = fetch_res {
        MessageDialog::new()
            .set_title("Update Failed")
            .set_description(&format!("Failed to fetch updates from origin: {}", e))
            .set_level(MessageLevel::Error)
            .show();
        return;
    }

    // 2. Check current branch
    let branch_out = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(workspace_root)
        .output();

    let current_branch = branch_out
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "dev".to_string());

    if current_branch == "main" {
        // If already on main, fast-forward merge
        let _ = Command::new("git")
            .args(["merge", "origin/main", "--ff-only"])
            .current_dir(workspace_root)
            .status();
    } else {
        // If on dev, fetch the latest main ref into local main without touching dev working tree
        let _ = Command::new("git")
            .args(["fetch", "origin", "main:main"])
            .current_dir(workspace_root)
            .status();
        println!("[Updater] Successfully synced 'main' branch ref without disrupting '{}' workspace.", current_branch);
    }

    // 3. Build production bundle (npm run build)
    println!("[Updater] Rebuilding J.A.R.V.I.S. frontend & backend assets...");
    let npm_bin = which::which("npm").unwrap_or_else(|_| PathBuf::from("npm"));
    let build_status = Command::new(npm_bin)
        .args(["run", "build"])
        .current_dir(workspace_root)
        .status();

    if let Ok(st) = build_status {
        if st.success() {
            save_local_production_sha(workspace_root, new_sha);
            MessageDialog::new()
                .set_title("J.A.R.V.I.S. Update Complete")
                .set_description(&format!(
                    "J.A.R.V.I.S. has been successfully updated to production commit {}.\n\n\
                     The desktop session is active and up to date.",
                    &new_sha[..7.min(new_sha.len())]
                ))
                .set_level(MessageLevel::Info)
                .show();
            return;
        }
    }

    MessageDialog::new()
        .set_title("Build Notice")
        .set_description("Update fetched, but asset build encountered an issue. Check terminal logs.")
        .set_level(MessageLevel::Warning)
        .show();
}
