import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { openShellRuntime } from './system_modules/intelligent_system/openshell_runtime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SkillInfo {
  name: string;
  slug: string;
  description: string;
  source?: string;
  path: string;
  skillMdPath: string;
  scripts: string[];
  installedAt: string;
}

export interface SkillRegistry {
  lastUpdated: string;
  skills: SkillInfo[];
}

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const PROJECT_SKILLS_DIR = path.resolve(WORKSPACE_ROOT, 'skills');
const LOCAL_AGENTS_SKILLS_DIR = path.resolve(WORKSPACE_ROOT, '.agents', 'skills');
const GLOBAL_AGENTS_SKILLS_DIR = path.resolve(os.homedir(), '.agents', 'skills');
const REGISTRY_FILE = path.resolve(PROJECT_SKILLS_DIR, 'skills_registry.json');

// Ensure skills directory exists
if (!fs.existsSync(PROJECT_SKILLS_DIR)) {
  fs.mkdirSync(PROJECT_SKILLS_DIR, { recursive: true });
}

function runCommand(command: string, cwd: string = WORKSPACE_ROOT): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    exec(command, { cwd, maxBuffer: 10 * 1024 * 1024, env: process.env }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : ''),
        code: error ? (error.code || 1) : 0
      });
    });
  });
}

/**
 * Parse frontmatter and content from SKILL.md
 */
export function parseSkillMarkdown(filePath: string): { name: string; description: string; content: string } {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    let name = path.basename(path.dirname(filePath));
    let description = '';

    if (raw.startsWith('---')) {
      const parts = raw.split('---');
      if (parts.length >= 3) {
        const frontmatter = parts[1];
        const lines = frontmatter.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
            const key = line.slice(0, colonIdx).trim();
            let val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (key === 'name') name = val;
            if (key === 'description') {
              if (val === '>' || val === '|' || val === '>-' || val === '>+' || val === '|-') {
                const descLines: string[] = [];
                let j = i + 1;
                while (j < lines.length && (lines[j].startsWith(' ') || lines[j].startsWith('\t') || lines[j].trim() === '')) {
                  if (lines[j].trim()) descLines.push(lines[j].trim());
                  j++;
                }
                val = descLines.join(' ');
              }
              description = val;
            }
          }
        }
      }
    }

    if (!description || description === '>' || description === '>-') {
      // Find first paragraph or heading
      const lines = raw.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('---'));
      for (const line of lines) {
        if (!line.startsWith('#') && line.length > 10) {
          description = line.trim().slice(0, 300);
          break;
        }
      }
    }

    return {
      name,
      description: description || `Operational skill capabilities for ${name}`,
      content: raw
    };
  } catch (err: any) {
    return {
      name: path.basename(path.dirname(filePath)),
      description: 'Unable to parse skill description',
      content: ''
    };
  }
}

/**
 * Scan all directories in project skills/ and global ~/.agents/skills/
 */
export function scanAndIndexSkills(): SkillInfo[] {
  const discovered: SkillInfo[] = [];
  const visitedSlugs = new Set<string>();

  const scanDir = (baseDir: string, defaultSource: string) => {
    if (!fs.existsSync(baseDir)) return;

    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillDir = path.resolve(baseDir, entry.name);
        const skillMd = path.resolve(skillDir, 'SKILL.md');

        if (fs.existsSync(skillMd)) {
          const slug = entry.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
          if (visitedSlugs.has(slug)) continue;
          visitedSlugs.add(slug);

          const { name, description } = parseSkillMarkdown(skillMd);

          // Check for scripts
          const scriptsDir = path.resolve(skillDir, 'scripts');
          let scripts: string[] = [];
          if (fs.existsSync(scriptsDir)) {
            try {
              scripts = fs.readdirSync(scriptsDir).filter(f => !f.startsWith('.'));
            } catch (e) {
              scripts = [];
            }
          }

          let installedAt = new Date().toISOString();
          try {
            const stat = fs.statSync(skillMd);
            installedAt = stat.mtime.toISOString();
          } catch (e) {
            // keep fallback
          }

          discovered.push({
            name: name || entry.name,
            slug,
            description,
            source: defaultSource,
            path: skillDir,
            skillMdPath: skillMd,
            scripts,
            installedAt
          });
        }
      }
    } catch (err: any) {
      console.warn(`[Skills Manager] Error scanning directory ${baseDir}:`, err.message);
    }
  };

  // 1. Project skills have highest priority
  scanDir(PROJECT_SKILLS_DIR, 'project');
  // 2. Local workspace agent skills
  scanDir(LOCAL_AGENTS_SKILLS_DIR, 'project');
  // 3. Global agent skills
  scanDir(GLOBAL_AGENTS_SKILLS_DIR, 'global');

  // Persist registry
  const registry: SkillRegistry = {
    lastUpdated: new Date().toISOString(),
    skills: discovered
  };

  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Skills Manager] Failed to write registry file:', err.message);
  }

  return discovered;
}

/**
 * Universal installer: handles npx skills add, git clone, GitHub URLs, package names, local folders
 */
export async function installSkills(commandOrUrl: string): Promise<{
  success: boolean;
  message: string;
  skills: SkillInfo[];
  output?: string;
  error?: string;
}> {
  let input = commandOrUrl.trim();
  // Strip leading slash if user typed /skills or /skill
  if (input.startsWith('/skills')) {
    input = input.replace(/^\/skills\s*/, '').trim();
  } else if (input.startsWith('/skill')) {
    input = input.replace(/^\/skill\s*/, '').trim();
  }

  if (!input) {
    return {
      success: false,
      message: 'No repository, package, or command specified for skills installation.',
      skills: scanAndIndexSkills()
    };
  }

  console.log(`[Skills Manager] Processing skill installation directive: "${input}"`);

  // Case 1: Direct npx command or command explicitly invoking npx skills / skills add
  if (input.includes('npx skills') || input.startsWith('skills add') || input.startsWith('add ')) {
    let normalized = input;
    if (normalized.startsWith('add ')) {
      normalized = `npx skills ${normalized}`;
    } else if (!normalized.startsWith('npx skills') && normalized.startsWith('skills ')) {
      normalized = `npx ${normalized}`;
    }

    // Ensure non-interactive auto-approval flags
    if (!normalized.includes('-y') && !normalized.includes('--yes')) {
      normalized += ' -y';
    }
    if (!normalized.includes('--copy')) {
      normalized += ' --copy';
    }

    console.log(`[Skills Manager] Executing skills CLI command: ${normalized}`);
    const result = await runCommand(normalized, WORKSPACE_ROOT);
    const updated = scanAndIndexSkills();

    if (result.code === 0 || updated.length > 0) {
      return {
        success: true,
        message: `Successfully executed skills installation: ${normalized}`,
        skills: updated,
        output: result.stdout || result.stderr
      };
    } else {
      console.warn(`[Skills Manager] CLI installation produced error:`, result.stderr);
      // Fallback: Check if input contained a repo or package slug to clone directly
      const match = input.match(/(?:add\s+)?([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        console.log(`[Skills Manager] Attempting Git clone fallback for: ${match[1]}`);
        return installFromGitRepo(`https://github.com/${match[1]}`);
      }

      return {
        success: false,
        message: `Skills command failed with exit code ${result.code}`,
        skills: updated,
        error: result.stderr || result.stdout
      };
    }
  }

  // Case 2: Git URL or GitHub shorthand (e.g., https://github.com/org/repo or org/repo)
  const isGitUrl = input.startsWith('http://') || input.startsWith('https://') || input.startsWith('git@') || input.endsWith('.git');
  const isGithubShorthand = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(input);

  if (isGitUrl || isGithubShorthand) {
    const gitUrl = isGithubShorthand ? `https://github.com/${input}` : input;
    return installFromGitRepo(gitUrl);
  }

  // Case 3: Local directory path
  if (fs.existsSync(input)) {
    return installFromLocalPath(input);
  }

  // Default: Try running npx skills add <input> --copy -y
  console.log(`[Skills Manager] Attempting universal npx skills add for: ${input}`);
  const fallbackCmd = `npx skills add ${input} --copy -y`;
  const fbResult = await runCommand(fallbackCmd, WORKSPACE_ROOT);
  const updatedSkills = scanAndIndexSkills();

  if (fbResult.code === 0) {
    return {
      success: true,
      message: `Successfully installed skills for ${input}`,
      skills: updatedSkills,
      output: fbResult.stdout
    };
  }

  return {
    success: false,
    message: `Could not resolve or install skills from "${input}".`,
    skills: updatedSkills,
    error: fbResult.stderr || fbResult.stdout
  };
}

/**
 * Git clone strategy for any repo possessing SKILL.md or plugin structure
 */
async function installFromGitRepo(gitUrl: string): Promise<{
  success: boolean;
  message: string;
  skills: SkillInfo[];
  output?: string;
  error?: string;
}> {
  const tempDir = path.resolve(os.tmpdir(), `jarvis-skills-${Date.now()}`);
  console.log(`[Skills Manager] Cloning repo from ${gitUrl} into ${tempDir}...`);

  try {
    const cloneRes = await runCommand(`git clone --depth 1 "${gitUrl}" "${tempDir}"`);
    if (cloneRes.code !== 0) {
      return {
        success: false,
        message: `Failed to clone repository: ${gitUrl}`,
        skills: scanAndIndexSkills(),
        error: cloneRes.stderr || cloneRes.stdout
      };
    }

    // Discover all SKILL.md files in the cloned directory
    const foundSkillFiles = findSkillMdFiles(tempDir);
    console.log(`[Skills Manager] Discovered ${foundSkillFiles.length} skill definitions in repository.`);

    if (foundSkillFiles.length === 0) {
      // If no SKILL.md, check if this is an entire plugin/tool repository
      // Create a wrapper skill for the repo
      const repoName = path.basename(gitUrl).replace(/\.git$/, '');
      const targetSkillDir = path.resolve(PROJECT_SKILLS_DIR, repoName);
      if (fs.existsSync(targetSkillDir)) {
        fs.rmSync(targetSkillDir, { recursive: true, force: true });
      }
      fs.cpSync(tempDir, targetSkillDir, { recursive: true });

      const autoSkillMd = path.resolve(targetSkillDir, 'SKILL.md');
      fs.writeFileSync(autoSkillMd, `---\nname: ${repoName}\ndescription: Custom skills and tools imported from ${gitUrl}\n---\n\n# ${repoName}\nRepository imported from ${gitUrl}.\n`, 'utf-8');
    } else {
      // Ingest each found skill into PROJECT_SKILLS_DIR
      for (const skillFile of foundSkillFiles) {
        const skillParentDir = path.dirname(skillFile);
        let skillFolderName = path.basename(skillParentDir);
        if (skillParentDir === tempDir) {
          skillFolderName = path.basename(gitUrl).replace(/\.git$/, '');
        }

        const targetSkillDir = path.resolve(PROJECT_SKILLS_DIR, skillFolderName);
        if (fs.existsSync(targetSkillDir)) {
          fs.rmSync(targetSkillDir, { recursive: true, force: true });
        }
        fs.cpSync(skillParentDir, targetSkillDir, { recursive: true });
      }
    }

    // Cleanup temp dir
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }

    const updated = scanAndIndexSkills();
    return {
      success: true,
      message: `Successfully imported and registered skills from ${gitUrl}`,
      skills: updated
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error during git repository skill ingestion: ${err.message}`,
      skills: scanAndIndexSkills(),
      error: err.message
    };
  }
}

/**
 * Local directory copy / link
 */
function installFromLocalPath(localPath: string): {
  success: boolean;
  message: string;
  skills: SkillInfo[];
  error?: string;
} {
  try {
    const stat = fs.statSync(localPath);
    if (!stat.isDirectory()) {
      return {
        success: false,
        message: `Path ${localPath} is not a directory.`,
        skills: scanAndIndexSkills()
      };
    }

    const skillName = path.basename(localPath);
    const targetDir = path.resolve(PROJECT_SKILLS_DIR, skillName);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.cpSync(localPath, targetDir, { recursive: true });

    const updated = scanAndIndexSkills();
    return {
      success: true,
      message: `Successfully installed local skill "${skillName}"`,
      skills: updated
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to install local skill: ${err.message}`,
      skills: scanAndIndexSkills(),
      error: err.message
    };
  }
}

/**
 * Recursively find all SKILL.md files
 */
function findSkillMdFiles(dir: string, depth: number = 0): string[] {
  if (depth > 5) return [];
  const results: string[] = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      if (item.name === '.git' || item.name === 'node_modules') continue;
      const full = path.resolve(dir, item.name);
      if (item.isDirectory()) {
        results.push(...findSkillMdFiles(full, depth + 1));
      } else if (item.isFile() && item.name.toUpperCase() === 'SKILL.MD') {
        results.push(full);
      }
    }
  } catch (e) {
    // ignore
  }
  return results;
}

/**
 * Build dynamic prompt context snippet for Gemini Live and API Chat system instruction
 */
export function getSkillsPromptContext(): string {
  const skills = scanAndIndexSkills();
  if (skills.length === 0) {
    return '\n\nSKILLS & PLUGINS MATRIX: No additional skills installed yet. Use `/skills <repo_or_package>` in the command bar to install skills.';
  }

  const listStr = skills.map(s => {
    const scriptsNote = s.scripts.length > 0 ? ` (Executable scripts: ${s.scripts.join(', ')})` : '';
    return `- [${s.slug}]: ${s.description}${scriptsNote}`;
  }).join('\n');

  return `\n\nJ.A.R.V.I.S. SHARED SKILLS & PLUGINS MATRIX:
The following specialized domain skills are installed and shared across ALL Coworker personas (J.A.R.V.I.S., F.R.I.D.A.Y., E.D.I.T.H., K.A.R.E.N., V.I.S.I.O.N., U.L.T.R.O.N.):
${listStr}

SKILL USAGE DIRECTIVES:
1. When any task requires deep domain guidance, specific patterns, or instructions from any installed skill, call \`load_skill(skill_slug)\` to read its full operational guidelines.
2. If the skill provides executable scripts, you can execute them via \`execute_skill_script(skill_slug, script_name, args)\`.
3. To view the current list of installed skills, call \`list_skills()\`.`;
}

/**
 * Load full markdown instructions for a skill
 */
export function loadSkillContent(slugOrName: string): { found: boolean; slug: string; content?: string; error?: string } {
  const skills = scanAndIndexSkills();
  const targetSlug = slugOrName.toLowerCase().trim();
  const match = skills.find(s => s.slug === targetSlug || s.name.toLowerCase() === targetSlug);

  if (!match) {
    return {
      found: false,
      slug: targetSlug,
      error: `Skill "${slugOrName}" not found among ${skills.length} installed skills.`
    };
  }

  try {
    const content = fs.readFileSync(match.skillMdPath, 'utf-8');
    return {
      found: true,
      slug: match.slug,
      content
    };
  } catch (err: any) {
    return {
      found: false,
      slug: match.slug,
      error: `Error reading SKILL.md: ${err.message}`
    };
  }
}

/**
 * Execute a script inside a skill
 */
export async function executeSkillScript(slugOrName: string, scriptName: string, args: string[] = []): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  const skills = scanAndIndexSkills();
  const targetSlug = slugOrName.toLowerCase().trim();
  const match = skills.find(s => s.slug === targetSlug || s.name.toLowerCase() === targetSlug);

  if (!match) {
    return { success: false, output: '', error: `Skill "${slugOrName}" not found.` };
  }

  const scriptPath = path.resolve(match.path, 'scripts', scriptName);
  if (!fs.existsSync(scriptPath)) {
    return {
      success: false,
      output: '',
      error: `Script "${scriptName}" not found in skill "${match.slug}". Available: ${match.scripts.join(', ') || 'none'}`
    };
  }

  let executable = scriptPath;
  let scriptArgs = args;
  if (scriptName.endsWith('.py')) {
    executable = 'python3';
    scriptArgs = [scriptPath, ...args];
  } else if (scriptName.endsWith('.js') || scriptName.endsWith('.mjs')) {
    executable = 'node';
    scriptArgs = [scriptPath, ...args];
  } else if (scriptName.endsWith('.sh')) {
    executable = 'bash';
    scriptArgs = [scriptPath, ...args];
  }

  console.log(`[Skills Manager] Executing script under OpenShell governance: ${executable} ${scriptArgs.join(' ')}`);
  const result = await openShellRuntime.executeSecurely(
    'execute_skill_script',
    executable,
    scriptArgs,
    { cwd: match.path }
  );

  return {
    success: result.success,
    output: result.output || result.stderr || '',
    error: !result.success ? result.error || 'Execution failed under OpenShell policy' : undefined
  };
}

/**
 * Remove an installed skill
 */
export function removeSkill(slugOrName: string): { success: boolean; message: string } {
  const skills = scanAndIndexSkills();
  const targetSlug = slugOrName.toLowerCase().trim();
  const match = skills.find(s => s.slug === targetSlug || s.name.toLowerCase() === targetSlug);

  if (!match) {
    return { success: false, message: `Skill "${slugOrName}" not found.` };
  }

  if (match.source === 'project') {
    try {
      fs.rmSync(match.path, { recursive: true, force: true });
      scanAndIndexSkills();
      return { success: true, message: `Skill "${match.name}" successfully removed.` };
    } catch (err: any) {
      return { success: false, message: `Failed to remove skill directory: ${err.message}` };
    }
  } else {
    return {
      success: false,
      message: `Skill "${match.name}" is a global skill in ~/.agents/skills. Remove it via CLI: npx skills rm -g ${match.slug}`
    };
  }
}
