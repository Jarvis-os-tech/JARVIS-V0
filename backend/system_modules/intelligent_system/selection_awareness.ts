/**
 * J.A.R.V.I.S. Desktop Selection Awareness Engine
 *
 * Multi-strategy detection of what the user has currently selected on their
 * Hyprland / Wayland desktop — files in Nautilus, text in editors, images,
 * URLs in browsers, or any focused GUI element.
 *
 * Strategies (in priority order):
 *   1. Wayland clipboard via wl-paste (instant, includes MIME types)
 *   2. Active window context via hyprctl activewindow -j
 *   3. Nautilus D-Bus OpenLocations / OpenWindowsWithLocations
 *   4. Smart key simulation (wtype Ctrl+C) when clipboard is stale
 *   5. Screenshot + Gemini Vision fallback for visual context
 */

import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// ─── Types ───────────────────────────────────────────────────────────────────

export type SelectionType = 'file' | 'folder' | 'text' | 'image' | 'url' | 'files' | 'window' | 'unknown';

export interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  sizeBytes: number;
  sizeHuman: string;
  mimeType: string;
  modifiedAt: string;
  isDirectory: boolean;
}

export interface ActiveWindowInfo {
  class: string;
  title: string;
  pid: number;
  workspace: number;
  floating: boolean;
  fullscreen: number;
  size: [number, number];
  position: [number, number];
}

export interface SelectionContext {
  type: SelectionType;
  content: string;
  items?: string[];           // Multiple file paths for multi-select
  metadata?: FileMetadata;
  allMetadata?: FileMetadata[];
  activeWindow: ActiveWindowInfo | null;
  nautilusLocation?: string;  // Current directory open in Nautilus
  mimeTypes?: string[];       // Clipboard MIME types
  detectionStrategy: string;  // Which strategy produced this result
  timestamp: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

async function safeExec(cmd: string, timeoutMs = 3000): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: timeoutMs });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function safeExecFile(bin: string, args: string[], timeoutMs = 3000): Promise<string> {
  try {
    const { stdout } = await execFileAsync(bin, args, { timeout: timeoutMs });
    return stdout.trim();
  } catch {
    return '';
  }
}

// ─── Strategy 1: Wayland Clipboard ──────────────────────────────────────────

async function getClipboardMimeTypes(): Promise<string[]> {
  const raw = await safeExecFile('wl-paste', ['--list-types']);
  if (!raw) return [];
  return raw.split('\n').map(s => s.trim()).filter(Boolean);
}

async function getClipboardContent(): Promise<{ text: string; mimeTypes: string[]; hasFileURIs: boolean; fileURIs: string[] }> {
  const mimeTypes = await getClipboardMimeTypes();
  const hasFileURIs = mimeTypes.some(m =>
    m === 'x-special/gnome-copied-files' ||
    m === 'text/uri-list' ||
    m === 'x-special/nautilus-clipboard'
  );

  let fileURIs: string[] = [];

  // Try to read file URIs from Nautilus clipboard first
  if (hasFileURIs) {
    // x-special/gnome-copied-files gives "copy\nfile:///path1\nfile:///path2\n..."
    const gnomeCopied = await safeExecFile('wl-paste', ['--type', 'x-special/gnome-copied-files']);
    if (gnomeCopied) {
      const lines = gnomeCopied.split('\n').map(s => s.trim()).filter(Boolean);
      // First line is 'copy' or 'cut', rest are file:// URIs
      for (const line of lines) {
        if (line.startsWith('file://')) {
          fileURIs.push(decodeURIComponent(line.replace('file://', '')));
        }
      }
    }

    // Fallback: text/uri-list
    if (fileURIs.length === 0) {
      const uriList = await safeExecFile('wl-paste', ['--type', 'text/uri-list']);
      if (uriList) {
        for (const line of uriList.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('file://')) {
            fileURIs.push(decodeURIComponent(trimmed.replace('file://', '')));
          }
        }
      }
    }
  }

  // Read plain text content
  const text = await safeExecFile('wl-paste', ['--no-newline']);

  return { text, mimeTypes, hasFileURIs, fileURIs };
}

// ─── Strategy 2: Active Window Context ──────────────────────────────────────

async function getActiveWindow(): Promise<ActiveWindowInfo | null> {
  const raw = await safeExec('hyprctl activewindow -j');
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return {
      class: data.class || '',
      title: data.title || '',
      pid: data.pid || 0,
      workspace: data.workspace?.id || 0,
      floating: !!data.floating,
      fullscreen: data.fullscreen || 0,
      size: data.size || [0, 0],
      position: data.at || [0, 0],
    };
  } catch {
    return null;
  }
}

// ─── Strategy 3: Nautilus D-Bus Query ───────────────────────────────────────

async function getNautilusOpenLocations(): Promise<string[]> {
  // Query OpenLocations property via D-Bus
  const raw = await safeExec(
    'gdbus call --session --dest org.freedesktop.FileManager1 ' +
    '--object-path /org/freedesktop/FileManager1 ' +
    '--method org.freedesktop.DBus.Properties.Get ' +
    'org.freedesktop.FileManager1 OpenLocations'
  );
  if (!raw) return [];

  // Parse D-Bus response: (<@as ['file:///path1', 'file:///path2']>,)
  const uriMatches = raw.match(/file:\/\/[^'"\]]+/g);
  if (!uriMatches) return [];
  return uriMatches.map(uri => decodeURIComponent(uri.replace('file://', '')));
}

async function getNautilusWindowLocations(): Promise<Record<string, string[]>> {
  const raw = await safeExec(
    'gdbus call --session --dest org.freedesktop.FileManager1 ' +
    '--object-path /org/freedesktop/FileManager1 ' +
    '--method org.freedesktop.DBus.Properties.Get ' +
    'org.freedesktop.FileManager1 OpenWindowsWithLocations'
  );
  if (!raw) return {};

  // This is a dict of window-id -> [uri, ...]
  // Parse is complex but we mainly need the URIs
  const result: Record<string, string[]> = {};
  const entries = raw.match(/'[^']+'/g);
  if (entries) {
    const uris = entries
      .map(e => e.replace(/'/g, ''))
      .filter(e => e.startsWith('file://'))
      .map(uri => decodeURIComponent(uri.replace('file://', '')));
    if (uris.length > 0) {
      result['active'] = uris;
    }
  }
  return result;
}

// ─── Strategy 4: Key Simulation ─────────────────────────────────────────────

async function simulateCopyAndRead(): Promise<string> {
  // Save current clipboard to detect change
  const beforeClip = await safeExecFile('wl-paste', ['--no-newline']);

  // Simulate Ctrl+C via wtype
  await safeExec('wtype -M ctrl -k c -m ctrl');

  // Brief pause for clipboard to update
  await new Promise(resolve => setTimeout(resolve, 150));

  // Read new clipboard
  const afterClip = await safeExecFile('wl-paste', ['--no-newline']);

  // Return the new content only if it changed
  if (afterClip && afterClip !== beforeClip) {
    return afterClip;
  }
  return '';
}

// ─── Strategy 5: Screenshot for Vision ──────────────────────────────────────

async function captureScreenshot(): Promise<string | null> {
  const screenshotPath = path.join(os.tmpdir(), `jarvis_selection_${Date.now()}.png`);
  try {
    // Get primary monitor name
    const monitorRaw = await safeExec('hyprctl monitors -j');
    let monitorName = '';
    if (monitorRaw) {
      const monitors = JSON.parse(monitorRaw);
      if (monitors.length > 0) {
        monitorName = monitors[0].name;
      }
    }

    if (monitorName) {
      await execFileAsync('grim', ['-o', monitorName, screenshotPath], { timeout: 5000 });
    } else {
      await execFileAsync('grim', [screenshotPath], { timeout: 5000 });
    }

    if (fs.existsSync(screenshotPath)) {
      return screenshotPath;
    }
  } catch {
    // Screenshot failed — non-fatal
  }
  return null;
}

// ─── File Metadata Resolution ───────────────────────────────────────────────

async function resolveFileMetadata(filePath: string): Promise<FileMetadata | null> {
  try {
    const resolved = filePath.startsWith('~')
      ? filePath.replace('~', os.homedir())
      : filePath;

    if (!fs.existsSync(resolved)) return null;

    const stats = fs.statSync(resolved);
    const mimeType = await safeExec(`xdg-mime query filetype "${resolved}"`);

    return {
      path: resolved,
      name: path.basename(resolved),
      extension: path.extname(resolved).replace('.', ''),
      sizeBytes: stats.size,
      sizeHuman: humanFileSize(stats.size),
      mimeType: mimeType || 'application/octet-stream',
      modifiedAt: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory(),
    };
  } catch {
    return null;
  }
}

// ─── Clipboard History (Omarchy) ────────────────────────────────────────────

interface ClipboardHistoryEntry {
  type: string;
  text?: string;
  path?: string;
}

async function getClipboardHistory(limit = 5): Promise<ClipboardHistoryEntry[]> {
  const historyPath = path.join(os.homedir(), '.local/state/omarchy/clipboard-history.json');
  try {
    if (!fs.existsSync(historyPath)) return [];
    const raw = fs.readFileSync(historyPath, 'utf-8');
    const entries: ClipboardHistoryEntry[] = JSON.parse(raw);
    return entries.slice(0, limit);
  } catch {
    return [];
  }
}

// ─── URL Detection ──────────────────────────────────────────────────────────

function isURL(text: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(text.trim());
}

function isFilePath(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('~/') ||
    trimmed.startsWith('file://') ||
    /^[a-zA-Z]:\\/.test(trimmed)
  );
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif', 'avif']);

function isImagePath(filePath: string): boolean {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

/**
 * Detects what the user currently has selected on their desktop using
 * multiple strategies in priority order.
 *
 * @param useKeySimulation If true, will simulate Ctrl+C when clipboard is
 *        empty/stale and a file manager is focused. Default false.
 * @param captureForVision If true, will capture a screenshot for Gemini
 *        Vision fallback analysis. Default false.
 */
export async function getSelectionContext(
  useKeySimulation = false,
  captureForVision = false
): Promise<SelectionContext> {
  const timestamp = new Date().toISOString();

  // Parallel: get clipboard + active window + nautilus locations
  const [clipboard, activeWindow, nautilusLocations] = await Promise.all([
    getClipboardContent(),
    getActiveWindow(),
    getNautilusOpenLocations(),
  ]);

  const nautilusLocation = nautilusLocations.length > 0 ? nautilusLocations[0] : undefined;
  const isNautilusFocused = activeWindow?.class === 'org.gnome.Nautilus' ||
    activeWindow?.class === 'nautilus' ||
    activeWindow?.class === 'Nautilus' ||
    activeWindow?.title?.includes('Files');

  // ── Strategy 1: Clipboard has file URIs (Nautilus copy) ──────────────
  if (clipboard.hasFileURIs && clipboard.fileURIs.length > 0) {
    const items = clipboard.fileURIs;
    const primaryPath = items[0];
    const metadata = await resolveFileMetadata(primaryPath);
    const allMetadata: FileMetadata[] = [];

    for (const item of items) {
      const m = await resolveFileMetadata(item);
      if (m) allMetadata.push(m);
    }

    const isDir = metadata?.isDirectory;
    const isImg = !isDir && isImagePath(primaryPath);
    let type: SelectionType = 'file';
    if (items.length > 1) type = 'files';
    else if (isDir) type = 'folder';
    else if (isImg) type = 'image';

    return {
      type,
      content: primaryPath,
      items: items.length > 1 ? items : undefined,
      metadata: metadata || undefined,
      allMetadata: allMetadata.length > 1 ? allMetadata : undefined,
      activeWindow,
      nautilusLocation,
      mimeTypes: clipboard.mimeTypes,
      detectionStrategy: 'clipboard_file_uris',
      timestamp,
    };
  }

  // ── Strategy 2: Clipboard has a file path as plain text ──────────────
  if (clipboard.text && isFilePath(clipboard.text)) {
    const resolvedPath = clipboard.text.startsWith('~')
      ? clipboard.text.replace('~', os.homedir())
      : clipboard.text.replace('file://', '');
    const metadata = await resolveFileMetadata(resolvedPath);

    if (metadata) {
      return {
        type: metadata.isDirectory ? 'folder' : (isImagePath(resolvedPath) ? 'image' : 'file'),
        content: resolvedPath,
        metadata,
        activeWindow,
        nautilusLocation,
        mimeTypes: clipboard.mimeTypes,
        detectionStrategy: 'clipboard_file_path_text',
        timestamp,
      };
    }
  }

  // ── Strategy 3: Clipboard has a URL ──────────────────────────────────
  if (clipboard.text && isURL(clipboard.text)) {
    return {
      type: 'url',
      content: clipboard.text.trim(),
      activeWindow,
      nautilusLocation,
      mimeTypes: clipboard.mimeTypes,
      detectionStrategy: 'clipboard_url',
      timestamp,
    };
  }

  // ── Strategy 4: Clipboard has regular text ───────────────────────────
  if (clipboard.text && clipboard.text.length > 0) {
    return {
      type: 'text',
      content: clipboard.text,
      activeWindow,
      nautilusLocation,
      mimeTypes: clipboard.mimeTypes,
      detectionStrategy: 'clipboard_text',
      timestamp,
    };
  }

  // ── Strategy 5: Key simulation when file manager is focused ──────────
  if (useKeySimulation && isNautilusFocused) {
    const simulated = await simulateCopyAndRead();
    if (simulated) {
      // Re-read clipboard to check for file URIs
      const freshClip = await getClipboardContent();
      if (freshClip.hasFileURIs && freshClip.fileURIs.length > 0) {
        const primaryPath = freshClip.fileURIs[0];
        const metadata = await resolveFileMetadata(primaryPath);
        return {
          type: metadata?.isDirectory ? 'folder' : (isImagePath(primaryPath) ? 'image' : 'file'),
          content: primaryPath,
          items: freshClip.fileURIs.length > 1 ? freshClip.fileURIs : undefined,
          metadata: metadata || undefined,
          activeWindow,
          nautilusLocation,
          mimeTypes: freshClip.mimeTypes,
          detectionStrategy: 'key_simulation_copy',
          timestamp,
        };
      }
      // Just plain text from the copy
      if (simulated.length > 0) {
        return {
          type: isFilePath(simulated) ? 'file' : (isURL(simulated) ? 'url' : 'text'),
          content: simulated,
          activeWindow,
          nautilusLocation,
          detectionStrategy: 'key_simulation_text',
          timestamp,
        };
      }
    }
  }

  // ── Strategy 6: Active window context only (no clipboard data) ───────
  if (activeWindow) {
    // Extract context clues from window title
    const title = activeWindow.title || '';
    let inferredContent = '';
    let inferredType: SelectionType = 'window';

    // Nautilus title often shows the current directory name
    if (isNautilusFocused && nautilusLocation) {
      inferredContent = nautilusLocation;
      inferredType = 'folder';
    }
    // Browser titles often include the page URL or title
    else if (['google-chrome', 'firefox', 'chromium', 'brave'].includes(activeWindow.class.toLowerCase())) {
      inferredContent = title;
      inferredType = 'url';
    }
    // Code editors show file path in title
    else if (['code', 'Code', 'codium', 'neovim', 'nvim', 'vim'].includes(activeWindow.class)) {
      inferredContent = title;
      inferredType = 'file';
    }

    // Screenshot fallback
    let screenshotPath: string | null = null;
    if (captureForVision) {
      screenshotPath = await captureScreenshot();
    }

    return {
      type: inferredType,
      content: inferredContent || `Active window: ${activeWindow.class} — "${title}"`,
      activeWindow,
      nautilusLocation,
      detectionStrategy: screenshotPath ? 'screenshot_vision' : 'active_window_context',
      timestamp,
    };
  }

  // ── Fallback: Nothing detected ───────────────────────────────────────
  return {
    type: 'unknown',
    content: '',
    activeWindow: null,
    detectionStrategy: 'none',
    timestamp,
  };
}

// ─── Action Executor ────────────────────────────────────────────────────────

export type SelectionAction =
  | 'open'
  | 'copy'
  | 'move'
  | 'delete'
  | 'rename'
  | 'set_wallpaper'
  | 'share'
  | 'info'
  | 'compress'
  | 'trash';

/**
 * Performs an action on the current desktop selection.
 */
export async function actOnSelection(
  action: SelectionAction,
  destination?: string,
  newName?: string
): Promise<{ success: boolean; action: string; selection: SelectionContext; result?: string; error?: string }> {
  // First detect what's selected
  const selection = await getSelectionContext(true, false);

  if (selection.type === 'unknown' || !selection.content) {
    return {
      success: false,
      action,
      selection,
      error: 'No selection detected. Please select a file, folder, or text first.',
    };
  }

  const filePath = selection.content;
  const homeDir = os.homedir();

  try {
    switch (action) {
      case 'open': {
        if (selection.type === 'url') {
          await safeExec(`xdg-open "${filePath}"`);
        } else if (selection.type === 'file' || selection.type === 'folder' || selection.type === 'image') {
          await safeExec(`xdg-open "${filePath}"`);
        } else if (selection.type === 'text') {
          // Open text in default editor
          await safeExec(`xdg-open "${filePath}"`);
        }
        return { success: true, action, selection, result: `Opened: ${filePath}` };
      }

      case 'info': {
        // Return detailed metadata
        if (selection.type === 'file' || selection.type === 'folder' || selection.type === 'image') {
          const metadata = await resolveFileMetadata(filePath);
          if (metadata) {
            return {
              success: true,
              action,
              selection: { ...selection, metadata },
              result: JSON.stringify(metadata, null, 2),
            };
          }
        }
        return { success: true, action, selection, result: `Selection type: ${selection.type}, content: ${selection.content}` };
      }

      case 'copy': {
        if (!destination) {
          return { success: false, action, selection, error: 'Destination path required for copy action.' };
        }
        const dest = destination.startsWith('~') ? destination.replace('~', homeDir) : destination;
        const destDir = fs.existsSync(dest) && fs.statSync(dest).isDirectory() ? dest : path.dirname(dest);

        if (selection.type === 'files' && selection.items) {
          for (const item of selection.items) {
            const destPath = path.join(destDir, path.basename(item));
            await safeExec(`cp -r "${item}" "${destPath}"`);
          }
          return { success: true, action, selection, result: `Copied ${selection.items.length} items to ${destDir}` };
        }

        const destPath = path.join(destDir, path.basename(filePath));
        await safeExec(`cp -r "${filePath}" "${destPath}"`);
        return { success: true, action, selection, result: `Copied to: ${destPath}` };
      }

      case 'move': {
        if (!destination) {
          return { success: false, action, selection, error: 'Destination path required for move action.' };
        }
        const dest = destination.startsWith('~') ? destination.replace('~', homeDir) : destination;
        const destDir = fs.existsSync(dest) && fs.statSync(dest).isDirectory() ? dest : path.dirname(dest);

        if (selection.type === 'files' && selection.items) {
          for (const item of selection.items) {
            const destPath = path.join(destDir, path.basename(item));
            await safeExec(`mv "${item}" "${destPath}"`);
          }
          return { success: true, action, selection, result: `Moved ${selection.items.length} items to ${destDir}` };
        }

        const destPath = path.join(destDir, path.basename(filePath));
        await safeExec(`mv "${filePath}" "${destPath}"`);
        return { success: true, action, selection, result: `Moved to: ${destPath}` };
      }

      case 'delete':
      case 'trash': {
        // Use gio trash for safe deletion (sends to trash)
        if (selection.type === 'files' && selection.items) {
          for (const item of selection.items) {
            await safeExec(`gio trash "${item}"`);
          }
          return { success: true, action, selection, result: `Sent ${selection.items.length} items to trash` };
        }
        await safeExec(`gio trash "${filePath}"`);
        return { success: true, action, selection, result: `Sent to trash: ${filePath}` };
      }

      case 'rename': {
        if (!newName && !destination) {
          return { success: false, action, selection, error: 'New name required for rename action.' };
        }
        const targetName = newName || destination || '';
        const dir = path.dirname(filePath);
        const newPath = path.join(dir, targetName);
        await safeExec(`mv "${filePath}" "${newPath}"`);
        return { success: true, action, selection, result: `Renamed to: ${newPath}` };
      }

      case 'set_wallpaper': {
        if (selection.type !== 'image' && selection.type !== 'file') {
          return { success: false, action, selection, error: 'Selection is not an image file.' };
        }
        // Use Omarchy wallpaper setter
        const result = await safeExec(`/usr/share/omarchy/bin/omarchy-theme-bg-set "${filePath}"`);
        return { success: true, action, selection, result: `Wallpaper set to: ${filePath}` };
      }

      case 'compress': {
        const archiveName = `${path.basename(filePath, path.extname(filePath))}_archive.tar.gz`;
        const archivePath = path.join(path.dirname(filePath), archiveName);

        if (selection.type === 'files' && selection.items) {
          const fileArgs = selection.items.map(f => `"${path.basename(f)}"`).join(' ');
          const parentDir = path.dirname(selection.items[0]);
          await safeExec(`tar -czf "${archivePath}" -C "${parentDir}" ${fileArgs}`, 30000);
        } else {
          const parentDir = path.dirname(filePath);
          await safeExec(`tar -czf "${archivePath}" -C "${parentDir}" "${path.basename(filePath)}"`, 30000);
        }
        return { success: true, action, selection, result: `Compressed to: ${archivePath}` };
      }

      case 'share': {
        // Copy path to clipboard for easy sharing
        await safeExec(`printf '%s' "${filePath}" | wl-copy`);
        return { success: true, action, selection, result: `Path copied to clipboard: ${filePath}` };
      }

      default:
        return { success: false, action, selection, error: `Unknown action: ${action}` };
    }
  } catch (err: any) {
    return { success: false, action, selection, error: err.message };
  }
}

/**
 * Returns a human-readable summary of the current selection for voice output.
 */
export function describeSelection(ctx: SelectionContext): string {
  if (ctx.type === 'unknown') {
    return 'I could not detect any selection on your desktop. Try selecting a file in Nautilus or copying some text first.';
  }

  const parts: string[] = [];

  switch (ctx.type) {
    case 'file':
      parts.push(`You have selected a file: ${ctx.metadata?.name || path.basename(ctx.content)}`);
      if (ctx.metadata) {
        parts.push(`Size: ${ctx.metadata.sizeHuman}, Type: ${ctx.metadata.mimeType}`);
        parts.push(`Location: ${path.dirname(ctx.content)}`);
      }
      break;
    case 'files':
      parts.push(`You have selected ${ctx.items?.length || 'multiple'} files`);
      if (ctx.allMetadata && ctx.allMetadata.length > 0) {
        const names = ctx.allMetadata.map(m => m.name).join(', ');
        parts.push(`Files: ${names}`);
      }
      break;
    case 'folder':
      parts.push(`You have selected a folder: ${ctx.metadata?.name || path.basename(ctx.content)}`);
      parts.push(`Path: ${ctx.content}`);
      break;
    case 'image':
      parts.push(`You have selected an image: ${ctx.metadata?.name || path.basename(ctx.content)}`);
      if (ctx.metadata) {
        parts.push(`Size: ${ctx.metadata.sizeHuman}, Format: ${ctx.metadata.extension.toUpperCase()}`);
      }
      parts.push('I can set this as your wallpaper if you\'d like.');
      break;
    case 'text':
      const preview = ctx.content.length > 200 ? ctx.content.substring(0, 200) + '...' : ctx.content;
      parts.push(`You have text on your clipboard: "${preview}"`);
      break;
    case 'url':
      parts.push(`You have a URL: ${ctx.content}`);
      break;
    case 'window':
      parts.push(`Your active window is: ${ctx.activeWindow?.class} — "${ctx.activeWindow?.title}"`);
      if (ctx.nautilusLocation) {
        parts.push(`Nautilus is showing: ${ctx.nautilusLocation}`);
      }
      break;
  }

  if (ctx.activeWindow && ctx.type !== 'window') {
    parts.push(`Active app: ${ctx.activeWindow.class}`);
  }

  return parts.join('. ');
}
