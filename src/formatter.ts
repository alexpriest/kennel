import chalk from 'chalk';
import Table from 'cli-table3';
import type { Service, DoctorIssue } from './types.js';

function statusBadge(status: Service['status']): string {
  switch (status) {
    case 'running': return chalk.green('● running');
    case 'stopped': return chalk.gray('○ stopped');
    case 'error': return chalk.red('✖ error');
    case 'scheduled': return chalk.blue('◷ scheduled');
    case 'unknown': return chalk.yellow('? unknown');
  }
}

function backendBadge(backend: Service['backend']): string {
  const colors: Record<string, (s: string) => string> = {
    launchd: chalk.cyan,
    pm2: chalk.magenta,
    brew: chalk.yellow,
    cron: chalk.blue,
  };
  return (colors[backend] ?? chalk.white)(backend);
}

export function formatServiceTable(services: Service[]): string {
  if (services.length === 0) return chalk.gray('No services found.');

  const table = new Table({
    head: ['Name', 'Backend', 'Status', 'PID', 'Schedule', 'Info'].map(h => chalk.bold(h)),
    style: { head: [], border: [] },
    chars: {
      top: '', 'top-mid': '', 'top-left': '', 'top-right': '',
      bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      left: '', 'left-mid': '', mid: '', 'mid-mid': '',
      right: '', 'right-mid': '', middle: ' ',
    },
  });

  for (const svc of services) {
    const info: string[] = [];
    if (svc.restartCount && svc.restartCount > 0) info.push(`${svc.restartCount} restarts`);
    if (svc.exitCode !== undefined && svc.exitCode !== 0) info.push(`exit ${svc.exitCode}`);

    table.push([
      svc.name,
      backendBadge(svc.backend),
      statusBadge(svc.status),
      svc.pid ? String(svc.pid) : chalk.gray('-'),
      svc.schedule ?? chalk.gray('-'),
      info.join(', ') || chalk.gray('-'),
    ]);
  }

  return table.toString();
}

export function formatServiceInfo(service: Service): string {
  const lines = [
    `${chalk.bold(service.name)}`,
    '',
    `  Backend:    ${backendBadge(service.backend)}`,
    `  Status:     ${statusBadge(service.status)}`,
    `  PID:        ${service.pid ?? chalk.gray('n/a')}`,
    `  Enabled:    ${service.enabled !== undefined ? (service.enabled ? chalk.green('yes') : chalk.red('no')) : chalk.gray('n/a')}`,
    `  Schedule:   ${service.schedule ?? chalk.gray('n/a')}`,
    `  Command:    ${service.command ?? chalk.gray('n/a')}`,
    `  CWD:        ${service.cwd ?? chalk.gray('n/a')}`,
    `  Config:     ${service.configPath ?? chalk.gray('n/a')}`,
    `  Manageable: ${service.manageable ? chalk.green('yes') : chalk.gray('no')}`,
  ];

  if (service.logPaths?.stdout) lines.push(`  Stdout Log: ${service.logPaths.stdout}`);
  if (service.logPaths?.stderr && service.logPaths.stderr !== service.logPaths.stdout) {
    lines.push(`  Stderr Log: ${service.logPaths.stderr}`);
  }
  if (service.exitCode !== undefined) lines.push(`  Exit Code:  ${service.exitCode}`);
  if (service.restartCount !== undefined) lines.push(`  Restarts:   ${service.restartCount}`);

  return lines.join('\n');
}

export function formatDoctorResults(issues: DoctorIssue[]): string {
  if (issues.length === 0) return chalk.green('✓ All services look healthy!');

  const lines: string[] = [];
  for (const issue of issues) {
    const icon = issue.severity === 'error' ? chalk.red('✖')
      : issue.severity === 'warning' ? chalk.yellow('⚠')
      : chalk.blue('ℹ');
    lines.push(`${icon} ${chalk.bold(issue.service)} (${issue.backend}): ${issue.message}`);
    if (issue.suggestion) lines.push(`  ${chalk.gray('→ ' + issue.suggestion)}`);
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  lines.push('');
  lines.push(`${errors} error(s), ${warnings} warning(s), ${issues.length - errors - warnings} info`);

  return lines.join('\n');
}
