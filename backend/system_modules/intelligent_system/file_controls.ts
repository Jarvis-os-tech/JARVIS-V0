import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Type } from '@google/genai';

/**
 * Resolves ~ to user home directory and relative paths to workspace cwd.
 */
export function resolveSafePath(inputPath: string): string {
  if (!inputPath) throw new Error('Path is required');
  if (inputPath.startsWith('~/') || inputPath === '~') {
    return path.join(os.homedir(), inputPath.slice(inputPath === '~' ? 1 : 2));
  }
  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }
  return path.resolve(process.cwd(), inputPath);
}

const PROTECTED_SYSTEM_PATHS = new Set(['/', '/bin', '/boot', '/dev', '/etc', '/lib', '/lib64', '/proc', '/root', '/run', '/sys', '/usr']);

function assertSafeForDeletion(absPath: string) {
  const norm = path.normalize(absPath);
  if (PROTECTED_SYSTEM_PATHS.has(norm)) {
    throw new Error(`CRITICAL GUARD: Cannot delete protected system path: ${norm}`);
  }
  if (norm === os.homedir()) {
    throw new Error(`CRITICAL GUARD: Cannot delete entire user home directory: ${norm}`);
  }
}

export function handleWriteFile(filePath: string, content: string, overwrite = true) {
  const absPath = resolveSafePath(filePath);
  if (!overwrite && fs.existsSync(absPath)) {
    throw new Error(`File already exists and overwrite is set to false: ${absPath}`);
  }
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf-8');
  return {
    success: true,
    filePath: absPath,
    bytesWritten: Buffer.byteLength(content, 'utf-8'),
    message: `Successfully wrote file: ${absPath}`
  };
}

export function handleAppendFile(filePath: string, content: string) {
  const absPath = resolveSafePath(filePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.appendFileSync(absPath, content, 'utf-8');
  return {
    success: true,
    filePath: absPath,
    bytesAppended: Buffer.byteLength(content, 'utf-8'),
    message: `Successfully appended to file: ${absPath}`
  };
}

export function handleRewriteFile(filePath: string, targetContent: string, replacementContent: string) {
  const absPath = resolveSafePath(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Target file does not exist: ${absPath}`);
  }
  const currentContent = fs.readFileSync(absPath, 'utf-8');
  if (!currentContent.includes(targetContent)) {
    throw new Error(`targetContent not found in file: ${absPath}`);
  }
  const newContent = currentContent.replace(targetContent, replacementContent);
  fs.writeFileSync(absPath, newContent, 'utf-8');
  return {
    success: true,
    filePath: absPath,
    message: `Successfully replaced content in: ${absPath}`
  };
}

export function handleRemoveFile(filePath: string, recursive = false) {
  const absPath = resolveSafePath(filePath);
  assertSafeForDeletion(absPath);
  if (!fs.existsSync(absPath)) {
    return { success: true, message: `File does not exist (already removed): ${absPath}` };
  }
  const stat = fs.statSync(absPath);
  if (stat.isDirectory()) {
    if (!recursive) {
      throw new Error(`Path is a directory. Set recursive=true to remove directories.`);
    }
    fs.rmSync(absPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(absPath);
  }
  return {
    success: true,
    filePath: absPath,
    message: `Successfully removed: ${absPath}`
  };
}

export function handleReadFile(filePath: string, startLine?: number, endLine?: number) {
  const absPath = resolveSafePath(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File does not exist: ${absPath}`);
  }
  const content = fs.readFileSync(absPath, 'utf-8');
  if (startLine !== undefined || endLine !== undefined) {
    const lines = content.split('\n');
    const start = Math.max(1, startLine ?? 1) - 1;
    const end = Math.min(lines.length, endLine ?? lines.length);
    const sliced = lines.slice(start, end).join('\n');
    return {
      filePath: absPath,
      totalLines: lines.length,
      startLine: start + 1,
      endLine: end,
      content: sliced
    };
  }
  return {
    filePath: absPath,
    content
  };
}

export function handleListDirectory(dirPath = '.') {
  const absPath = resolveSafePath(dirPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Directory does not exist: ${absPath}`);
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true });
  const items = entries.map((entry) => {
    const full = path.join(absPath, entry.name);
    let size = 0;
    try {
      size = fs.statSync(full).size;
    } catch {}
    return {
      name: entry.name,
      isDirectory: entry.isDirectory(),
      sizeBytes: size
    };
  });
  return {
    directory: absPath,
    totalItems: items.length,
    items
  };
}

export const fileFunctionDeclarations = [
  {
    name: 'write_file',
    description: 'Create or overwrite a file on the local Linux filesystem with UTF-8 text content. Parent directories are created automatically.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: 'Target file path (supports ~ for home, absolute or relative path).' },
        content: { type: Type.STRING, description: 'The text content to write.' },
        overwrite: { type: Type.BOOLEAN, description: 'Whether to overwrite if file already exists (default true).' }
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'append_file',
    description: 'Append text content to the end of a file on the local filesystem. Creates the file and parent directories if they do not exist.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: 'Target file path to append to.' },
        content: { type: Type.STRING, description: 'The text content to append.' }
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'rewrite_file',
    description: 'Rewrite, update, or edit an existing file by finding exact targetContent and replacing it with replacementContent.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: 'Target file path to edit.' },
        targetContent: { type: Type.STRING, description: 'The exact string snippet inside the file to replace.' },
        replacementContent: { type: Type.STRING, description: 'The new text to replace the targetContent with.' }
      },
      required: ['filePath', 'targetContent', 'replacementContent']
    }
  },
  {
    name: 'remove_file',
    description: 'Delete or remove a file or directory from the local filesystem. Set recursive to true when deleting non-empty directories.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: 'Target file or directory path to delete.' },
        recursive: { type: Type.BOOLEAN, description: 'Whether to recursively delete directory and contents.' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'read_file',
    description: 'Read the text content of a file on the local filesystem. Can optionally slice specific line ranges.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filePath: { type: Type.STRING, description: 'Target file path to read.' },
        startLine: { type: Type.NUMBER, description: 'Optional 1-indexed start line number.' },
        endLine: { type: Type.NUMBER, description: 'Optional 1-indexed end line number.' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'list_directory',
    description: 'List files and subdirectories inside a given path on the local filesystem.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dirPath: { type: Type.STRING, description: 'Directory path to list (defaults to current directory ".").' }
      }
    }
  }
];
