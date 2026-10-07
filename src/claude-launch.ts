import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Opens Claude Code in the user's terminal on a prompt Kennel wrote.
// The prompt never touches a command line: it goes to a file, and the terminal
// sources a tiny launcher script that reads it. Quoting a multi-line log dump
// through osascript and nested shells is what broke the old version.

export const KNOWN_TERMINALS: { name: string; app: string }[] = [
  { name: 'Ghostty', app: '/Applications/Ghostty.app' },
  { name: 'cmux', app: '/Applications/cmux.app' },
  { name: 'iTerm2', app: '/Applications/iTerm.app' },
  { name: 'Kitty', app: '/Applications/kitty.app' },
  { name: 'Alacritty', app: '/Applications/Alacritty.app' },
  { name: 'WezTerm', app: '/Applications/WezTerm.app' },
  { name: 'Warp', app: '/Applications/Warp.app' },
  { name: 'Terminal', app: '/System/Applications/Utilities/Terminal.app' },
];

export async function installedTerminals(): Promise<string[]> {
  const found: string[] = [];
  for (const t of KNOWN_TERMINALS) {
    try { await access(t.app); found.push(t.name); } catch { /* not installed */ }
  }
  return found;
}

export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function appleString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Sourced by the user's interactive shell, so a `claude` shell function still applies. */
export function launcherScript(dir: string, promptPath: string, scriptPath: string): string {
  return [
    `cd ${shellQuote(dir)} || return`,
    `kennel_prompt="$(<${shellQuote(promptPath)})"`,
    `rm -f ${shellQuote(promptPath)} ${shellQuote(scriptPath)}`,
    `claude "$kennel_prompt"`,
    `unset kennel_prompt`,
    '',
  ].join('\n');
}

/** The configured terminal if it is still installed, else the first one that is. */
export function pickTerminal(configured: string | undefined, installed: string[]): string | null {
  if (configured && installed.includes(configured)) return configured;
  return installed[0] ?? null;
}

const osascript = (...lines: string[]) => ({ file: 'osascript', args: lines.flatMap(l => ['-e', l]) });

export function terminalLaunch(terminal: string, scriptPath: string, dir: string, shell: string): { file: string; args: string[] } {
  const source = `source ${shellQuote(scriptPath)}`;
  const inShell = [shell, '-ilc', source];
  switch (terminal) {
    case 'Ghostty':
      return osascript(
        'tell application "Ghostty"',
        'activate',
        `new window with configuration {initial working directory:${appleString(dir)}, initial input:${appleString(source)} & linefeed}`,
        'end tell',
      );
    case 'iTerm2':
      return osascript(
        'tell application "iTerm2"',
        'activate',
        'create window with default profile',
        `tell current session of current window to write text ${appleString(source)}`,
        'end tell',
      );
    case 'cmux':
      return { file: '/Applications/cmux.app/Contents/Resources/bin/cmux', args: ['new-workspace', '--command', source] };
    case 'Kitty':
      return { file: '/Applications/kitty.app/Contents/MacOS/kitty', args: ['--single-instance', ...inShell] };
    case 'Alacritty':
      return { file: 'open', args: ['-na', 'Alacritty', '--args', '-e', ...inShell] };
    case 'WezTerm':
      return { file: '/Applications/WezTerm.app/Contents/MacOS/wezterm', args: ['start', '--', ...inShell] };
    default:
      return osascript(
        'tell application "Terminal" to activate',
        `tell application "Terminal" to do script ${appleString(source)}`,
      );
  }
}

/** One readable sentence for the toast, never the command or the prompt. */
export function launchError(terminal: string, raw: string): string {
  if (/-1743|Not authorized to send Apple events/i.test(raw)) {
    return `Kennel isn't allowed to control ${terminal}. Turn it on in System Settings > Privacy & Security > Automation.`;
  }
  const first = raw.split('\n').map(l => l.trim()).find(Boolean) ?? 'unknown error';
  return `${terminal} did not open: ${first.replace(/^Command failed:.*$/, 'the launch command failed')}`;
}

/** Write the prompt and its launcher; returns the launcher's path. */
export async function stageLaunch(dir: string, prompt: string): Promise<string> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const promptPath = join(dir, `prompt-${stamp}.md`);
  const scriptPath = join(dir, `launch-${stamp}.sh`);
  await writeFile(promptPath, prompt, { mode: 0o600 });
  await writeFile(scriptPath, launcherScript(dir, promptPath, scriptPath), { mode: 0o600 });
  return scriptPath;
}
