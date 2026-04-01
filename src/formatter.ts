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
  const stripped = stripAnsi(content);
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
  lines.push(boxRow(buildStackedBar(counts, total), boxWidth));
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
      if (!all && lastStatus && groupCount > DEFAULT_GROUP_LIMIT) {
        lines.push(chalk.dim(`    … ${groupCount - DEFAULT_GROUP_LIMIT} more ${lastStatus}`));
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

  // Trailing "... N more" for the very last group
  if (!all && lastStatus && groupCount > DEFAULT_GROUP_LIMIT) {
    lines.push(chalk.dim(`    … ${groupCount - DEFAULT_GROUP_LIMIT} more ${lastStatus}`));
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

    const headerContent = ` ${icon} ${chalk.bold(issue.service)}  ${backend}`;
    const msgContent = `   ${issue.message}`;

    lines.push(style.border(boxTop(boxWidth)));
    lines.push(style.border('│') + headerContent + ' '.repeat(Math.max(0, boxWidth - stripAnsi(headerContent).length - 1)) + style.border('│'));
    lines.push(style.border('│') + msgContent + ' '.repeat(Math.max(0, boxWidth - stripAnsi(msgContent).length - 1)) + style.border('│'));

    if (issue.suggestion) {
      const sugContent = `   ${chalk.dim('→ ' + issue.suggestion)}`;
      lines.push(style.border('│') + sugContent + ' '.repeat(Math.max(0, boxWidth - stripAnsi(sugContent).length - 1)) + style.border('│'));
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
