# CLI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the kennel CLI output with box-drawing, stacked bar charts, errors-first ordering, and visual polish

**Architecture:** Rewrite `src/formatter.ts` entirely with chalk-based box-drawing. Update `src/cli.ts` for new flags (--all, --follow) and animated spinners. Remove cli-table3 dependency.

**Tech Stack:** TypeScript, chalk (existing dependency)

---

## Task 1: Rewrite the service list formatter

Completely replace `src/formatter.ts` with a new implementation featuring a stacked bar chart, errors-first ordering, collapsible groups, and box-drawing characters.

**Files:** `src/formatter.ts`

- [ ] 1. Replace `src/formatter.ts` with the complete new implementation:

```typescript
import chalk from 'chalk';
import type { Service, DoctorIssue } from './types.js';

// ─── Constants ────────────────────────────────────────────────────────

const VERSION = '0.2.0';
const BAR_WIDTH = 40;
const DEFAULT_GROUP_LIMIT = 5;

const STATUS_ORDER: Service['status'][] = ['error', 'running', 'scheduled', 'stopped', 'unknown'];

const STATUS_COLORS: Record<Service['status'], (s: string) => string> = {
  running: chalk.green,
  stopped: chalk.gray,
  error: chalk.red,
  scheduled: chalk.yellow,
  unknown: chalk.yellow,
};

const STATUS_ICONS: Record<Service['status'], string> = {
  running: '●',
  stopped: '○',
  error: '✖',
  scheduled: '◷',
  unknown: '?',
};

const BACKEND_COLORS: Record<string, (s: string) => string> = {
  launchd: chalk.cyan,
  pm2: chalk.magenta,
  brew: chalk.yellow,
  cron: chalk.blue,
};

// ─── Box Drawing Helpers ──────────────────────────────────────────────

function boxTop(width: number): string {
  return `╭${'─'.repeat(width)}╮`;
}

function boxBottom(width: number): string {
  return `╰${'─'.repeat(width)}╯`;
}

function boxRow(content: string, width: number): string {
  // Strip ANSI codes for length calculation
  const stripped = content.replace(/\u001b\[[0-9;]*m/g, '');
  const padding = Math.max(0, width - stripped.length - 2);
  return `│ ${content}${' '.repeat(padding)} │`;
}

function divider(width: number): string {
  return chalk.dim('─'.repeat(width));
}

// ─── Stacked Bar Chart ───────────────────────────────────────────────

function buildStackedBar(counts: Record<string, number>, total: number): string {
  const segments: string[] = [];
  for (const status of STATUS_ORDER) {
    const count = counts[status] ?? 0;
    if (count === 0) continue;
    const blocks = Math.max(1, Math.round((count / total) * BAR_WIDTH));
    segments.push(STATUS_COLORS[status]('▰'.repeat(blocks)));
  }
  return segments.join('');
}

function buildLegend(counts: Record<string, number>): string {
  const parts: string[] = [];
  for (const status of STATUS_ORDER) {
    const count = counts[status] ?? 0;
    if (count === 0) continue;
    const icon = STATUS_COLORS[status](STATUS_ICONS[status]);
    parts.push(`${icon} ${count} ${status}`);
  }
  return parts.join('   ');
}

// ─── Service Row Formatting ──────────────────────────────────────────

function formatServiceRow(svc: Service): string {
  const icon = STATUS_COLORS[svc.status](STATUS_ICONS[svc.status]);
  const name = svc.status === 'error'
    ? chalk.red(svc.name)
    : svc.status === 'stopped'
      ? chalk.dim(svc.name)
      : svc.name;

  const backend = chalk.dim((BACKEND_COLORS[svc.backend] ?? chalk.white)(svc.backend));

  const meta: string[] = [];

  if (svc.status === 'error' || svc.status === 'running') {
    if (svc.status === 'error' && svc.exitCode !== undefined) {
      meta.push(chalk.dim(`exit ${svc.exitCode}`));
    }
    if (svc.status === 'running' && svc.pid) {
      meta.push(chalk.dim(`pid ${svc.pid}`));
    }
  }

  if (svc.status === 'scheduled' && svc.schedule) {
    meta.push(chalk.dim(svc.schedule));
  }

  if (svc.restartCount && svc.restartCount > 0) {
    meta.push(chalk.dim(`↻ ${svc.restartCount}`));
  }

  const statusLabel = STATUS_COLORS[svc.status](svc.status);
  const padName = name.padEnd(25 + (name.length - stripAnsi(name).length));
  const padBackend = backend.padEnd(12 + (backend.length - stripAnsi(backend).length));
  const padStatus = statusLabel.padEnd(12 + (statusLabel.length - stripAnsi(statusLabel).length));
  const metaStr = meta.length > 0 ? '  ' + meta.join('  ') : '';

  return `  ${icon} ${padName} ${padBackend} ${padStatus}${metaStr}`;
}

function stripAnsi(str: string): string {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

// ─── Main Exports ────────────────────────────────────────────────────

export function formatServiceTable(services: Service[], options: { all?: boolean } = {}): string {
  if (services.length === 0) return chalk.gray('No services found.');

  const { all = false } = options;
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold.dim(`kennel v${VERSION}`));
  lines.push('');

  // Count by status
  const counts: Record<string, number> = {};
  for (const svc of services) {
    counts[svc.status] = (counts[svc.status] ?? 0) + 1;
  }
  const total = services.length;

  // Stacked bar chart in a box
  const boxWidth = 56;
  lines.push(boxTop(boxWidth));
  lines.push(boxRow(`${buildStackedBar(counts, total)}`, boxWidth));
  lines.push(boxRow(buildLegend(counts), boxWidth));
  lines.push(boxBottom(boxWidth));
  lines.push('');

  // Sort services: errors first, then running, scheduled, stopped, unknown
  const sorted = [...services].sort((a, b) => {
    return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  });

  // Group by status and render
  let lastStatus: Service['status'] | null = null;
  let groupCount = 0;
  let groupTotal = 0;
  let needsDivider = false;

  for (const svc of sorted) {
    if (svc.status !== lastStatus) {
      // Show "... N more" for the previous group if it was truncated
      if (!all && lastStatus && groupCount < groupTotal) {
        lines.push(chalk.dim(`    … ${groupTotal - groupCount} more ${lastStatus}`));
      }

      // Add divider after error section
      if (needsDivider && svc.status !== 'error') {
        lines.push(`  ${divider(52)}`);
        needsDivider = false;
      }

      lastStatus = svc.status;
      groupCount = 0;
      groupTotal = sorted.filter(s => s.status === svc.status).length;

      if (svc.status === 'error') {
        needsDivider = true;
      }
    }

    groupCount++;

    if (all || groupCount <= DEFAULT_GROUP_LIMIT) {
      lines.push(formatServiceRow(svc));
    }
  }

  // Final "... N more" if needed
  if (!all && lastStatus && groupCount < groupTotal) {
    // This won't trigger because groupCount always reaches groupTotal in the loop.
    // The truncation check happens at group transitions above.
  }
  // Handle the last group
  if (!all && lastStatus && groupCount > DEFAULT_GROUP_LIMIT) {
    // We need to remove the extra lines and add the "more" message
    // Actually, let's fix the logic: we already skip rendering above,
    // so we just need the trailing message for the final group.
  }

  // Trailing "... N more" for the very last group
  if (!all && lastStatus) {
    const lastGroupTotal = sorted.filter(s => s.status === lastStatus).length;
    const lastGroupRendered = Math.min(lastGroupTotal, DEFAULT_GROUP_LIMIT);
    if (lastGroupRendered < lastGroupTotal) {
      lines.push(chalk.dim(`    … ${lastGroupTotal - lastGroupRendered} more ${lastStatus}`));
    }
  }

  // Doctor hint
  const errorCount = counts['error'] ?? 0;
  if (errorCount > 0) {
    lines.push('');
    lines.push(chalk.dim(`  ${errorCount} issue${errorCount !== 1 ? 's' : ''} — run ${chalk.white('kennel doctor')} for details`));
  }

  return lines.join('\n');
}

export function formatServiceInfo(service: Service): string {
  const boxWidth = 50;
  const lines: string[] = [];

  const statusIcon = STATUS_COLORS[service.status](STATUS_ICONS[service.status]);
  const statusLabel = STATUS_COLORS[service.status](service.status);
  const backendLabel = (BACKEND_COLORS[service.backend] ?? chalk.white)(service.backend);

  lines.push(boxTop(boxWidth));
  lines.push(boxRow(`${chalk.bold(service.name)}  ${statusIcon} ${statusLabel}`, boxWidth));
  lines.push(boxRow('', boxWidth));

  const fields: [string, string][] = [
    ['Backend', backendLabel],
    ['PID', service.pid ? String(service.pid) : chalk.dim('n/a')],
    ['Enabled', service.enabled !== undefined ? (service.enabled ? chalk.green('yes') : chalk.red('no')) : chalk.dim('n/a')],
    ['Schedule', service.schedule ?? chalk.dim('n/a')],
    ['Command', service.command ?? chalk.dim('n/a')],
    ['CWD', service.cwd ?? chalk.dim('n/a')],
    ['Config', service.configPath ?? chalk.dim('n/a')],
    ['Manageable', service.manageable ? chalk.green('yes') : chalk.dim('no')],
  ];

  if (service.logPaths?.stdout) {
    fields.push(['Stdout Log', service.logPaths.stdout]);
  }
  if (service.logPaths?.stderr && service.logPaths.stderr !== service.logPaths.stdout) {
    fields.push(['Stderr Log', service.logPaths.stderr]);
  }
  if (service.exitCode !== undefined) {
    fields.push(['Exit Code', service.exitCode === 0 ? chalk.green(String(service.exitCode)) : chalk.red(String(service.exitCode))]);
  }
  if (service.restartCount !== undefined) {
    fields.push(['Restarts', service.restartCount > 0 ? chalk.yellow(String(service.restartCount)) : String(service.restartCount)]);
  }

  for (const [label, value] of fields) {
    const paddedLabel = chalk.dim(label.padEnd(12));
    lines.push(boxRow(`${paddedLabel} ${value}`, boxWidth));
  }

  lines.push(boxBottom(boxWidth));
  return lines.join('\n');
}

export function formatDoctorResults(issues: DoctorIssue[]): string {
  if (issues.length === 0) return chalk.green('✓ All services look healthy!');

  const lines: string[] = [];
  const boxWidth = 56;

  // Sort: errors first, then warnings, then info
  const severityOrder = ['error', 'warning', 'info'] as const;
  const sorted = [...issues].sort((a, b) => {
    return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
  });

  const severityStyles = {
    error: { icon: '✖', color: chalk.red, border: chalk.red },
    warning: { icon: '⚠', color: chalk.yellow, border: chalk.yellow },
    info: { icon: 'ℹ', color: chalk.blue, border: chalk.blue },
  };

  for (const issue of sorted) {
    const style = severityStyles[issue.severity];
    const icon = style.color(style.icon);
    const backend = chalk.dim((BACKEND_COLORS[issue.backend] ?? chalk.white)(issue.backend));

    lines.push(style.border(boxTop(boxWidth)));
    lines.push(style.border('│') + ` ${icon} ${chalk.bold(issue.service)}  ${backend}` + ' '.repeat(Math.max(0, boxWidth - stripAnsi(` ${icon} ${chalk.bold(issue.service)}  ${backend}`).length - 1)) + style.border('│'));
    lines.push(style.border('│') + `   ${issue.message}` + ' '.repeat(Math.max(0, boxWidth - stripAnsi(`   ${issue.message}`).length - 1)) + style.border('│'));

    if (issue.suggestion) {
      lines.push(style.border('│') + `   ${chalk.dim('→ ' + issue.suggestion)}` + ' '.repeat(Math.max(0, boxWidth - stripAnsi(`   → ${issue.suggestion}`).length - 1)) + style.border('│'));
    }

    lines.push(style.border(boxBottom(boxWidth)));
    lines.push('');
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.length - errors - warnings;

  const summaryParts: string[] = [];
  if (errors > 0) summaryParts.push(chalk.red(`${errors} error${errors !== 1 ? 's' : ''}`));
  if (warnings > 0) summaryParts.push(chalk.yellow(`${warnings} warning${warnings !== 1 ? 's' : ''}`));
  if (infos > 0) summaryParts.push(chalk.blue(`${infos} info`));

  lines.push(summaryParts.join(', '));

  return lines.join('\n');
}

export function formatActionStart(action: string, serviceName: string): string {
  return `${chalk.dim('⠋')} ${action === 'start' ? 'Starting' : action === 'stop' ? 'Stopping' : 'Restarting'} ${chalk.bold(serviceName)}…`;
}

export function formatActionResult(action: string, serviceName: string, success: boolean, message: string): string {
  if (success) {
    const verb = action === 'start' ? 'Started' : action === 'stop' ? 'Stopped' : 'Restarted';
    return `${chalk.green('✓')} ${verb} ${chalk.bold(serviceName)}`;
  } else {
    const verb = action === 'start' ? 'start' : action === 'stop' ? 'stop' : 'restart';
    return `${chalk.red('✖')} Failed to ${verb} ${chalk.bold(serviceName)}: ${message}`;
  }
}
```

- [ ] 2. Verify the file compiles without errors:

```bash
cd /Users/alex/Code/projects/kennel && npx tsc --noEmit src/formatter.ts
```

---

## Task 2: Rewrite the doctor formatter

The doctor formatter is included in the full `src/formatter.ts` rewrite above (Task 1). This task verifies it works correctly.

**Files:** `src/formatter.ts` (already rewritten in Task 1)

- [ ] 1. The `formatDoctorResults` function is already implemented in the Task 1 rewrite. It features:
   - Severity-colored box borders (red for errors, yellow for warnings, blue for info)
   - Sorted output: errors first, then warnings, then info
   - Actionable suggestions shown with a dim arrow
   - Summary line at the bottom with colored counts

No additional code changes needed. Verify it compiles as part of Task 1 step 2.

---

## Task 3: Rewrite the service info formatter

The service info formatter is included in the full `src/formatter.ts` rewrite above (Task 1). This task verifies it works correctly.

**Files:** `src/formatter.ts` (already rewritten in Task 1)

- [ ] 1. The `formatServiceInfo` function is already implemented in the Task 1 rewrite. It features:
   - Box-drawn detail card with `╭╮╰╯│─` characters
   - Service name and status icon in the header row
   - Aligned key/value pairs with dim labels
   - Conditional fields (log paths, exit code, restart count)

No additional code changes needed. Verify it compiles as part of Task 1 step 2.

---

## Task 4: Add --follow flag to logs command

Add a `--follow` / `-f` flag to the `logs` command that continuously polls and prints new log output.

**Files:** `src/cli.ts`

- [ ] 1. Update the `logs` command in `src/cli.ts` to add the `--follow` flag:

```typescript
program
  .command('logs <service>')
  .description('Show recent logs for a service')
  .option('-n, --lines <n>', 'number of lines', '50')
  .option('-f, --follow', 'follow log output (poll every 2s)')
  .action(async (name: string, opts) => {
    const logs = await registry.getLogs(name, parseInt(opts.lines));
    console.log(logs);

    if (opts.follow) {
      let lastLength = logs.length;
      const poll = async () => {
        const fresh = await registry.getLogs(name, parseInt(opts.lines));
        if (fresh.length !== lastLength) {
          // Find new content by comparing lengths
          // Simple approach: if content changed, print the delta
          const newContent = fresh.slice(lastLength);
          if (newContent.trim()) {
            process.stdout.write(newContent);
          }
          lastLength = fresh.length;
        }
      };

      const interval = setInterval(poll, 2000);

      // Clean exit on Ctrl-C
      process.on('SIGINT', () => {
        clearInterval(interval);
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {});
    }
  });
```

- [ ] 2. Verify the file compiles:

```bash
cd /Users/alex/Code/projects/kennel && npx tsc --noEmit src/cli.ts
```

---

## Task 5: Add animated spinner for start/stop/restart actions

Add a simple braille spinner animation during service actions, replacing the static output.

**Files:** `src/cli.ts`

- [ ] 1. Add the spinner utility and `formatActionStart`/`formatActionResult` imports at the top of `src/cli.ts`. Then update the three action commands. The full updated action commands:

First, update the imports at the top of `src/cli.ts`:

```typescript
import { formatServiceTable, formatServiceInfo, formatDoctorResults, formatActionResult } from './formatter.js';
```

Then add this spinner helper after the `registry` declaration:

```typescript
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function startSpinner(message: string): { stop: () => void } {
  let i = 0;
  process.stdout.write(`\r${chalk.dim(SPINNER_FRAMES[0])} ${message}`);
  const timer = setInterval(() => {
    i = (i + 1) % SPINNER_FRAMES.length;
    process.stdout.write(`\r${chalk.dim(SPINNER_FRAMES[i])} ${message}`);
  }, 80);
  return {
    stop() {
      clearInterval(timer);
      process.stdout.write('\r' + ' '.repeat(message.length + 4) + '\r');
    },
  };
}
```

Add the chalk import (it's already a dependency but not imported in cli.ts):

```typescript
import chalk from 'chalk';
```

Then update each action command:

```typescript
program
  .command('start <service>')
  .description('Start a service')
  .action(async (name: string) => {
    const spinner = startSpinner(`Starting ${chalk.bold(name)}…`);
    const result = await registry.performAction(name, 'start');
    spinner.stop();
    console.log(formatActionResult('start', name, result.success, result.message));
    if (!result.success) process.exit(1);
  });

program
  .command('stop <service>')
  .description('Stop a service')
  .action(async (name: string) => {
    const spinner = startSpinner(`Stopping ${chalk.bold(name)}…`);
    const result = await registry.performAction(name, 'stop');
    spinner.stop();
    console.log(formatActionResult('stop', name, result.success, result.message));
    if (!result.success) process.exit(1);
  });

program
  .command('restart <service>')
  .description('Restart a service')
  .action(async (name: string) => {
    const spinner = startSpinner(`Restarting ${chalk.bold(name)}…`);
    const result = await registry.performAction(name, 'restart');
    spinner.stop();
    console.log(formatActionResult('restart', name, result.success, result.message));
    if (!result.success) process.exit(1);
  });
```

- [ ] 2. Verify the file compiles:

```bash
cd /Users/alex/Code/projects/kennel && npx tsc --noEmit src/cli.ts
```

---

## Task 6: Add --all flag to list command

Add `--all` / `-a` flag to the `list` command to expand collapsed groups.

**Files:** `src/cli.ts`

- [ ] 1. Update the `list` command in `src/cli.ts` to pass the `--all` option through:

```typescript
program
  .command('list')
  .description('List all services across all backends')
  .option('-b, --backend <type>', 'filter by backend (launchd, pm2, brew, cron)')
  .option('-s, --status <status>', 'filter by status (running, stopped, error, scheduled)')
  .option('-a, --all', 'show all services (expand collapsed groups)')
  .option('--json', 'output as JSON')
  .action(async (opts) => {
    const services = await registry.listServices({
      backend: opts.backend as BackendType | undefined,
      status: opts.status as ServiceStatus | undefined,
    });
    if (opts.json) {
      console.log(JSON.stringify(services, null, 2));
    } else {
      console.log(formatServiceTable(services, { all: opts.all }));
    }
  });
```

- [ ] 2. Update the `formatServiceTable` import call — the function signature already accepts `options` from Task 1. No additional formatter changes needed.

- [ ] 3. Update the default command section. When no args are given and list runs, it should also respect `--all` if passed. The existing `process.argv.push('list')` logic handles this since Commander parses the full argv.

- [ ] 4. Verify the file compiles:

```bash
cd /Users/alex/Code/projects/kennel && npx tsc --noEmit src/cli.ts
```

---

## Task 7: Remove cli-table3, bump version to 0.2.0

Clean up the old dependency and bump the package version.

**Files:** `package.json`, `src/cli.ts`

- [ ] 1. Remove cli-table3 from dependencies:

```bash
cd /Users/alex/Code/projects/kennel && npm uninstall cli-table3
```

- [ ] 2. Bump the version in `package.json` from `0.1.0` to `0.2.0`:

Edit `package.json`:
```json
"version": "0.2.0",
```

- [ ] 3. Update the version in `src/cli.ts`:

```typescript
  .version('0.2.0');
```

- [ ] 4. Verify no remaining references to cli-table3:

```bash
cd /Users/alex/Code/projects/kennel && grep -r "cli-table3" src/
```

Should return no results.

- [ ] 5. Verify the project builds cleanly:

```bash
cd /Users/alex/Code/projects/kennel && npm run build
```

---

## Task 8: Integration test — run all commands and verify output

Run each CLI command and verify the output renders correctly.

**Files:** None (verification only)

- [ ] 1. Build the project:

```bash
cd /Users/alex/Code/projects/kennel && npm run build
```

- [ ] 2. Run `kennel list` and verify the stacked bar chart, errors-first ordering, and collapsible groups render:

```bash
cd /Users/alex/Code/projects/kennel && node dist/cli.js list
```

- [ ] 3. Run `kennel list --all` and verify all services are shown without collapse:

```bash
cd /Users/alex/Code/projects/kennel && node dist/cli.js list --all
```

- [ ] 4. Run `kennel doctor` and verify box-drawn issue cards render:

```bash
cd /Users/alex/Code/projects/kennel && node dist/cli.js doctor
```

- [ ] 5. Run `kennel info` on a known service and verify the box-drawn detail card:

```bash
cd /Users/alex/Code/projects/kennel && node dist/cli.js info <pick-a-running-service>
```

- [ ] 6. Run `kennel start`/`stop`/`restart` on a test service and verify the spinner animation appears:

```bash
cd /Users/alex/Code/projects/kennel && node dist/cli.js restart <pick-a-manageable-service>
```

- [ ] 7. Run `kennel logs <service> --follow` and verify it polls for updates (Ctrl-C to exit):

```bash
cd /Users/alex/Code/projects/kennel && node dist/cli.js logs <pick-a-service> --follow
```

- [ ] 8. Run existing tests to ensure nothing is broken:

```bash
cd /Users/alex/Code/projects/kennel && npm test
```

- [ ] 9. Verify `kennel --version` shows `0.2.0`:

```bash
cd /Users/alex/Code/projects/kennel && node dist/cli.js --version
```
