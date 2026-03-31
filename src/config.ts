import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface KennelConfig {
  aliases: Record<string, string>;
  notes: Record<string, string>;
  terminal?: string;
}

const CONFIG_DIR = join(homedir(), '.config', 'kennel');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export const CLAUDE_DIR = join(CONFIG_DIR, 'claude');

function defaults(): KennelConfig {
  return { aliases: {}, notes: {} };
}

export async function loadConfig(): Promise<KennelConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

export async function saveConfig(config: KennelConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

const CLAUDE_MD = `# Kennel Service Investigation

You are investigating macOS background services, launched from the kennel dashboard.

Read the config files, log files, and process info referenced in the prompt.
Focus on: what the service does, whether it's healthy, and anything notable about its setup.
If the service has logs, check them for errors or warnings.
If the service has a config file (plist, pm2 ecosystem, etc.), read it and explain the key settings.
`;

export async function ensureClaudeDir(): Promise<void> {
  await mkdir(CLAUDE_DIR, { recursive: true });
  const mdPath = join(CLAUDE_DIR, 'CLAUDE.md');
  try {
    await readFile(mdPath);
  } catch {
    await writeFile(mdPath, CLAUDE_MD);
  }
}
