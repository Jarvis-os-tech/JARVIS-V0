use std::path::{Path, PathBuf};
use std::process::Command;
use serde::Deserialize;
use rfd::{MessageButtons, MessageDialog, MessageDialogResult, MessageLevel};

use crate::config::{find_production_dir, GITHUB_REPO, PRODUCTION_BRANCH};
use crate::server_supervisor::copy_dir_all;

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

/// Queries GitHub API strictly for the 'main' (production) branch.
fn fetch_latest_main_commit() -> Result<GithubCommitResponse, String> {
    let url = format!(
        "https://api.github.com/repos/{}/commits/{}",
        GITHUB_REPO, PRODUCTION_BRANCH
    );

    let resp = ureq::get(&url)
        .set("User-Agent", "JARVIS-Desktop-Updater")
        .set("Accept", "application/vnd.github.v3+json")
        .timeout(std::time::Duration::from_secs(10))
        .call()
        .map_err(|e| format!("GitHub API network error: {}", e))?;

    let commit: GithubCommitResponse = resp
        .into_json()
        .map_err(|e| format!("Failed to parse GitHub commit JSON: {}", e))?;

    Ok(commit)
}

/// Reads the currently applied release commit SHA from prod_dir/.release_commit
fn get_local_production_sha(prod_dir: &Path) -> Option<String> {
    let release_file = prod_dir.join(".release_commit");
    if release_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&release_file) {
            let trimmed = content.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

/// Sets the current applied release commit SHA in prod_dir/.release_commit
fn save_local_production_sha(prod_dir: &Path, sha: &str) {
    let release_file = prod_dir.join(".release_commit");
    let _ = std::fs::write(release_file, sha.trim());
}

/// Checks GitHub 'main' branch for updates against the local production installation.
pub fn check_for_main_update(prod_dir: &Path) -> Option<GithubCommitResponse> {
    println!("[Updater] Checking production branch '{}' on GitHub for new releases...", PRODUCTION_BRANCH);

    let remote_commit = match fetch_latest_main_commit() {
        Ok(c) => c,
        Err(e) => {
            println!("[Updater] Check skipped: {}", e);
            return None;
        }
    };

    let local_sha = get_local_production_sha(prod_dir);
    let remote_sha = remote_commit.sha.trim();

    if let Some(ref local) = local_sha {
        let local_trimmed = local.trim();
        if local_trimmed == remote_sha || remote_sha.starts_with(local_trimmed) || local_trimmed.starts_with(remote_sha) {
            println!("[Updater] J.A.R.V.I.S. Desktop is running the latest production release ({})", &remote_sha[..7.min(remote_sha.len())]);
            return None;
        }
    }

    Some(remote_commit)
}

/// Prompts the user with a dialog asking whether they want to apply the new feature/update.
/// UNTIL the user accepts, the current version is kept 100% untouched.
pub fn prompt_user_and_apply(workspace_root: &Path, prod_dir: &Path, remote_commit: &GithubCommitResponse) {
    let remote_sha = remote_commit.sha.trim();
    let short_remote = &remote_sha[..7.min(remote_sha.len())];
    let commit_msg = remote_commit.commit.message.lines().next().unwrap_or("Production update");
    let author = &remote_commit.commit.author.name;
    let date = &remote_commit.commit.author.date;

    println!("[Updater] New production feature available on 'main'!");
    println!("          Commit      : {}", remote_sha);
    println!("          Description : {}", commit_msg);

    let dialog_description = format!(
        "A new feature/update has been released to the 'main' branch!\n\n\
         • Feature: {}\n\
         • Commit : {}\n\
         • Author : {}\n\
         • Date   : {}\n\n\
         Would you like to apply this new feature to your Desktop J.A.R.V.I.S. now?\n\n\
         (If you click 'No', J.A.R.V.I.S. will remain on your current stable version.\n\
          Active development work on 'dev' will never be applied to your Desktop version.)",
        commit_msg, short_remote, author, date
    );

    let result = MessageDialog::new()
        .set_title("J.A.R.V.I.S. Update Available")
        .set_description(&dialog_description)
        .set_buttons(MessageButtons::YesNo)
        .set_level(MessageLevel::Info)
        .show();

    if result == MessageDialogResult::Yes {
        println!("[Updater] User confirmed update. Applying production release from 'main'...");
        apply_production_update(workspace_root, prod_dir, remote_sha);
    } else {
        println!("[Updater] User chose to keep current version. Update postponed.");
    }
}

/// Entrypoint to check for updates and prompt
pub fn check_and_prompt_update(workspace_root: &Path) {
    let prod_dir = find_production_dir();
    if let Some(commit) = check_for_main_update(&prod_dir) {
        prompt_user_and_apply(workspace_root, &prod_dir, &commit);
    }
}

/// Applies update from origin/main using an isolated temporary git worktree so active dev work is never disrupted.
fn apply_production_update(workspace_root: &Path, prod_dir: &Path, new_sha: &str) {
    // 1. Fetch origin main
    let _ = Command::new("git")
        .args(["fetch", "origin", "main:main"])
        .current_dir(workspace_root)
        .status();

    // 2. Use isolated temporary worktree to build main without touching dev branch
    let tmp_worktree = PathBuf::from("/tmp/jarvis_main_update_build");
    let _ = std::fs::remove_dir_all(&tmp_worktree);

    let wt_status = Command::new("git")
        .args(["worktree", "add", "--detach", tmp_worktree.to_str().unwrap(), "origin/main"])
        .current_dir(workspace_root)
        .status();

    if let Err(e) = wt_status {
        MessageDialog::new()
            .set_title("Update Failed")
            .set_description(&format!("Failed to prepare update worktree: {}", e))
            .set_level(MessageLevel::Error)
            .show();
        return;
    }

    // 3. Symlink node_modules in worktree to avoid re-installing
    #[cfg(unix)]
    let _ = std::os::unix::fs::symlink(workspace_root.join("node_modules"), tmp_worktree.join("node_modules"));

    // 4. Run build inside the temporary worktree
    println!("[Updater] Compiling production release from 'main'...");
    let npm_bin = which::which("npm").unwrap_or_else(|_| PathBuf::from("npm"));
    let build_status = Command::new(npm_bin)
        .args(["run", "build"])
        .current_dir(&tmp_worktree)
        .status();

    let build_success = build_status.map(|s| s.success()).unwrap_or(false);

    if build_success {
        // Copy built dist to production directory
        let _ = copy_dir_all(&tmp_worktree.join("dist"), &prod_dir.join("dist"));

        // Copy connectors to production directory
        let _ = copy_dir_all(&tmp_worktree.join("connectors"), &prod_dir.join("connectors"));

        // Save new SHA
        save_local_production_sha(prod_dir, new_sha);

        // Restart running server if active
        let _ = Command::new("fuser")
            .args(["-k", "3000/tcp"])
            .status();

        // Cleanup temporary worktree
        let _ = Command::new("git")
            .args(["worktree", "remove", "--force", tmp_worktree.to_str().unwrap()])
            .current_dir(workspace_root)
            .status();
        let _ = Command::new("git")
            .args(["worktree", "prune"])
            .current_dir(workspace_root)
            .status();

        MessageDialog::new()
            .set_title("J.A.R.V.I.S. Updated Successfully")
            .set_description(&format!(
                "J.A.R.V.I.S. Desktop has been updated to production release {}.\n\n\
                 The new feature has been applied.",
                &new_sha[..7.min(new_sha.len())]
            ))
            .set_level(MessageLevel::Info)
            .show();
    } else {
        // Cleanup worktree on error
        let _ = Command::new("git")
            .args(["worktree", "remove", "--force", tmp_worktree.to_str().unwrap()])
            .current_dir(workspace_root)
            .status();
        let _ = Command::new("git")
            .args(["worktree", "prune"])
            .current_dir(workspace_root)
            .status();

        MessageDialog::new()
            .set_title("Update Failed")
            .set_description("Failed to compile production bundle from 'main'. Keeping existing version.")
            .set_level(MessageLevel::Error)
            .show();
    }
}
