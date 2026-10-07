import { describe, it, expect } from 'vitest';
import { shellQuote, launcherScript, pickTerminal, terminalLaunch, launchError } from '../src/claude-launch.js';
import { setInventoryPurpose, parseInventoryNotes } from '../src/metadata.js';

describe('shellQuote', () => {
  it('wraps in single quotes and escapes embedded ones', () => {
    expect(shellQuote(`Paloma's "worktree" $HOME`)).toBe(`'Paloma'\\''s "worktree" $HOME'`);
  });
});

describe('launcherScript', () => {
  it('reads the prompt from its file, never inlining it', () => {
    const script = launcherScript('/c', '/c/p.md', '/c/s.sh');
    expect(script).toContain(`"$(<'/c/p.md')"`);
    expect(script).toContain(`cd '/c'`);
    expect(script).toContain(`rm -f '/c/p.md' '/c/s.sh'`);
    expect(script).toMatch(/claude "\$kennel_prompt"/);
  });
});

describe('pickTerminal', () => {
  it('uses the configured terminal when it is installed', () => {
    expect(pickTerminal('iTerm2', ['Ghostty', 'iTerm2'])).toBe('iTerm2');
  });
  it('falls back to the first installed terminal when the configured one is gone', () => {
    expect(pickTerminal('cmux', ['Ghostty', 'Terminal'])).toBe('Ghostty');
  });
  it('falls back when nothing is configured', () => {
    expect(pickTerminal(undefined, ['Terminal'])).toBe('Terminal');
  });
});

describe('terminalLaunch', () => {
  it('never puts the prompt on a command line, only the script path', () => {
    for (const t of ['Ghostty', 'Terminal', 'iTerm2', 'Kitty', 'Alacritty', 'WezTerm', 'cmux']) {
      const { file, args } = terminalLaunch(t, '/c/s.sh', '/c', '/bin/zsh');
      expect(file.length).toBeGreaterThan(0);
      expect(args.join(' ')).toContain('/c/s.sh');
    }
  });
  it('opens Ghostty through its AppleScript surface configuration', () => {
    const { file, args } = terminalLaunch('Ghostty', '/c/s.sh', '/c', '/bin/zsh');
    expect(file).toBe('osascript');
    const script = args.filter((_, i) => args[i - 1] === '-e').join('\n');
    expect(script).toContain('tell application "Ghostty"');
    expect(script).toContain('initial working directory:"/c"');
    expect(script).toContain(`source '/c/s.sh'`);
  });
});

describe('launchError', () => {
  it('turns an Automation refusal into an instruction', () => {
    expect(launchError('Ghostty', 'execution error: Not authorized to send Apple events to Ghostty. (-1743)'))
      .toMatch(/System Settings/);
  });
  it('keeps only the first line of anything else', () => {
    expect(launchError('Kitty', 'boom\nline two\nline three')).toBe('Kitty did not open: boom');
  });
});

const TOML = `# header
[jobs]
"com.a.one"   = "First"
"com.a.two"   = "Second"

[tools]
"x" = "tool"
`;

describe('setInventoryPurpose', () => {
  it('replaces an existing purpose in place, keeping alignment', () => {
    const out = setInventoryPurpose(TOML, 'com.a.two', 'Changed "quoted"');
    expect(out).toContain(`"com.a.two"   = "Changed \\"quoted\\""`);
    expect(parseInventoryNotes(out)['com.a.two']).toBe('Changed "quoted"');
    expect(out).toContain('# header');
  });
  it('adds a missing label at the end of the jobs table', () => {
    const out = setInventoryPurpose(TOML, 'com.a.three', 'Third');
    expect(parseInventoryNotes(out)['com.a.three']).toBe('Third');
    expect(out.indexOf('com.a.three')).toBeLessThan(out.indexOf('[tools]'));
  });
  it('removes the line when the purpose is cleared', () => {
    const out = setInventoryPurpose(TOML, 'com.a.one', null);
    expect(out).not.toContain('com.a.one');
    expect(parseInventoryNotes(out)['com.a.two']).toBe('Second');
  });
  it('flattens newlines to keep one line per job', () => {
    const out = setInventoryPurpose(TOML, 'com.a.one', 'two\nlines');
    expect(parseInventoryNotes(out)['com.a.one']).toBe('two lines');
  });
  it('creates a jobs table when there is none', () => {
    expect(parseInventoryNotes(setInventoryPurpose('', 'com.a', 'A'))['com.a']).toBe('A');
  });
  it('does not touch a same-named key in another table', () => {
    const out = setInventoryPurpose(TOML, 'x', 'job x');
    expect(out).toContain(`"x" = "tool"`);
    expect(parseInventoryNotes(out)['x']).toBe('job x');
  });
});
