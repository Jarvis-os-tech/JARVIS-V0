import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ResolvedImagePath {
  found: boolean;
  path?: string;
  filename?: string;
  source?: string;
  error?: string;
}

export interface ResolvedFolderPath {
  found: boolean;
  path: string;
  sectionName?: string;
  command: string;
  args: string[];
}

const COMMON_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.svg']);

/**
 * Normalizes user-supplied paths:
 * - Expands '~' to os.homedir()
 * - Strips leading/trailing quotes
 * - Resolves relative paths against cwd or home
 * - Trims whitespace
 */
export function normalizePath(rawPath: string): string {
  let cleaned = (rawPath || '').trim();
  // Strip quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }
  // Expand tilde
  if (cleaned === '~') {
    return os.homedir();
  }
  if (cleaned.startsWith('~/')) {
    return path.join(os.homedir(), cleaned.substring(2));
  }
  if (cleaned.startsWith('~')) {
    return path.join(os.homedir(), cleaned.substring(1));
  }
  return path.resolve(cleaned);
}

/**
 * Finds the latest modified image file in a directory.
 */
export function findLatestImageInDir(dirPath: string): string | null {
  try {
    const resolvedDir = normalizePath(dirPath);
    if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
      return null;
    }
    const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
    let latestFile: string | null = null;
    let latestMtime = 0;

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!COMMON_IMAGE_EXTS.has(ext)) continue;

      try {
        const fullPath = path.join(resolvedDir, entry.name);
        const stats = fs.statSync(fullPath);
        if (stats.mtimeMs > latestMtime) {
          latestMtime = stats.mtimeMs;
          latestFile = fullPath;
        }
      } catch {}
    }
    return latestFile;
  } catch {
    return null;
  }
}

/**
 * Searches for an image by fuzzy name or keyword across common user folders:
 * ~/Downloads, ~/Pictures, ~/.local/state/omarchy/current/theme/backgrounds, and current theme backgrounds.
 */
export function searchImageByKeyword(keyword: string): string | null {
  const normKey = keyword.toLowerCase().trim();
  const searchDirs = [
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Pictures'),
    path.join(os.homedir(), '.local/state/omarchy/current/theme/backgrounds'),
    path.join(os.homedir(), '.config/omarchy/themes')
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const f of files) {
        const full = path.join(dir, String(f));
        try {
          const stats = fs.statSync(full);
          if (!stats.isFile()) continue;
          const ext = path.extname(full).toLowerCase();
          if (!COMMON_IMAGE_EXTS.has(ext)) continue;

          const base = path.basename(full).toLowerCase();
          if (base.includes(normKey)) {
            return full;
          }
        } catch {}
      }
    } catch {}
  }
  return null;
}

/**
 * Dynamically resolves a wallpaper image target from user input.
 * Handles:
 * 1. Direct file path (e.g. "/home/g0pi/Downloads/ChatGPT Image Sep 22, 2026, 10_20_28 PM.png")
 * 2. Directory path (e.g. "~/Downloads" -> finds newest image)
 * 3. Descriptive/keyword intent (e.g. "from downloads", "chatgpt image", "space")
 */
export function resolveWallpaperPath(inputPathOrDesc?: string): ResolvedImagePath {
  const raw = (inputPathOrDesc || '').trim();

  // Case 1: Empty or generic "downloads" request -> pick newest image in ~/Downloads
  if (!raw || /^(downloads|download|my downloads|from downloads)$/i.test(raw)) {
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const latest = findLatestImageInDir(downloadsDir);
    if (latest) {
      return { found: true, path: latest, filename: path.basename(latest), source: 'downloads_latest' };
    }
    // Fallback to pictures
    const picturesDir = path.join(os.homedir(), 'Pictures');
    const latestPic = findLatestImageInDir(picturesDir);
    if (latestPic) {
      return { found: true, path: latestPic, filename: path.basename(latestPic), source: 'pictures_latest' };
    }
    return { found: false, error: 'No image found in ~/Downloads or ~/Pictures' };
  }

  // Case 2: Exact or relative path provided
  const normalized = normalizePath(raw);
  if (fs.existsSync(normalized)) {
    const stats = fs.statSync(normalized);
    if (stats.isFile()) {
      const ext = path.extname(normalized).toLowerCase();
      if (COMMON_IMAGE_EXTS.has(ext)) {
        return { found: true, path: normalized, filename: path.basename(normalized), source: 'exact_file' };
      }
      return { found: false, error: `File exists but is not a supported image format (${ext})` };
    } else if (stats.isDirectory()) {
      const latest = findLatestImageInDir(normalized);
      if (latest) {
        return { found: true, path: latest, filename: path.basename(latest), source: 'directory_latest' };
      }
      return { found: false, error: `Directory ${normalized} contains no image files` };
    }
  }

  // Case 3: Fuzzy search in ~/Downloads and ~/Pictures
  const found = searchImageByKeyword(raw);
  if (found) {
    return { found: true, path: found, filename: path.basename(found), source: 'fuzzy_search' };
  }

  // Case 4: Check if raw was a filename in Downloads
  const downloadCandidate = path.join(os.homedir(), 'Downloads', raw);
  if (fs.existsSync(downloadCandidate) && fs.statSync(downloadCandidate).isFile()) {
    return { found: true, path: downloadCandidate, filename: path.basename(downloadCandidate), source: 'downloads_relative' };
  }

  return { found: false, error: `Could not locate image matching "${raw}"` };
}

/**
 * Maps section names and paths to absolute directories and file manager launch commands.
 */
export function resolveFolderNavigation(input?: string): ResolvedFolderPath {
  const raw = (input || '').trim().toLowerCase();
  const home = os.homedir();

  const sectionMap: Record<string, string> = {
    'downloads': path.join(home, 'Downloads'),
    'download': path.join(home, 'Downloads'),
    'documents': path.join(home, 'Documents'),
    'document': path.join(home, 'Documents'),
    'doc': path.join(home, 'Documents'),
    'docs': path.join(home, 'Documents'),
    'pictures': path.join(home, 'Pictures'),
    'picture': path.join(home, 'Pictures'),
    'photos': path.join(home, 'Pictures'),
    'images': path.join(home, 'Pictures'),
    'music': path.join(home, 'Music'),
    'videos': path.join(home, 'Videos'),
    'video': path.join(home, 'Videos'),
    'movies': path.join(home, 'Videos'),
    'desktop': path.join(home, 'Desktop'),
    'home': home,
    'root': '/',
    'workspace': process.cwd(),
    'jarvis': process.cwd()
  };

  let targetDir = sectionMap[raw];
  let matchedSection = raw;

  if (!targetDir) {
    // Check if input is a valid filesystem path
    const normalized = normalizePath(input || '');
    if (fs.existsSync(normalized) && fs.statSync(normalized).isDirectory()) {
      targetDir = normalized;
      matchedSection = path.basename(normalized);
    } else {
      // Default to Downloads if keyword mentions download
      if (raw.includes('download')) {
        targetDir = path.join(home, 'Downloads');
        matchedSection = 'downloads';
      } else if (raw.includes('doc')) {
        targetDir = path.join(home, 'Documents');
        matchedSection = 'documents';
      } else if (raw.includes('pic') || raw.includes('photo') || raw.includes('image')) {
        targetDir = path.join(home, 'Pictures');
        matchedSection = 'pictures';
      } else {
        targetDir = home;
        matchedSection = 'home';
      }
    }
  }

  // Ensure target exists, fallback to home if missing
  if (!fs.existsSync(targetDir)) {
    targetDir = home;
  }

  // Detect available file manager: prefer nautilus on Omarchy/GNOME, fallback to xdg-open
  const hasNautilus = fs.existsSync('/usr/bin/nautilus');
  const command = hasNautilus ? 'nautilus' : 'xdg-open';
  const args = [targetDir];

  return {
    found: true,
    path: targetDir,
    sectionName: matchedSection,
    command,
    args
  };
}
