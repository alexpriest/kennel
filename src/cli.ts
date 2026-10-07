#!/usr/bin/env node
import { Command } from 'commander';
import { Registry } from './registry.js';
import { runDoctor } from './doctor.js';
import { formatServiceTable, formatServiceInfo, formatDoctorResults, formatActionResult, formatScheduledTable } from './formatter.js';
import { listScheduledTasks } from './scheduled.js';
import { listJobs } from './collect.js';
import { followLogs } from './logs.js';
import { applyWrap } from './wrap.js';
import chalk from 'chalk';
import type { BackendType, ServiceStatus } from './types.js';

const program = new Command();
const registry = new Registry();

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

program
  .name('kennel')
  .description('Where your daemons live — unified macOS service manager')
  .version('0.2.0');

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

program
  .command('info <service>')
  .description('Show detailed info about a service')
  .option('--json', 'output as JSON')
  .action(async (name: string, opts) => {
    const service = await registry.getService(name);
    if (!service) {
      console.error(`Service not found: ${name}`);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(service, null, 2));
    } else {
      console.log(formatServiceInfo(service));
    }
  });

program
  .command('logs <service>')
  .description('Show recent logs for a service (stdout and stderr merged)')
  .option('-n, --lines <n>', 'number of lines', '50')
  .option('-f, --follow', 'follow log output live')
  .action(async (name: string, opts) => {
    const service = await registry.getService(name);
    console.log(await registry.getLogs(name, parseInt(opts.lines)));
    if (!opts.follow || !service?.logPaths) return;
    const paths = { stdout: service.logPaths.stdout ?? null, stderr: service.logPaths.stderr ?? null };
    const stop = await followLogs(paths, lines => {
      for (const line of lines) console.log(line.stream === 'err' ? chalk.red(line.text) : line.text);
    });
    process.on('SIGINT', () => { stop(); process.exit(0); });
    await new Promise(() => {});
  });

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

program
  .command('doctor')
  .description('Run health checks on all services')
  .option('--json', 'output as JSON')
  .action(async (opts) => {
    const issues = await runDoctor(registry);
    if (opts.json) {
      console.log(JSON.stringify(issues, null, 2));
    } else {
      console.log(formatDoctorResults(issues));
    }
  });

program
  .command('scheduled')
  .description('Show scheduled agent tasks: schedule, next run, last result, cost')
  .option('--json', 'output as JSON')
  .action(async (opts) => {
    const tasks = await listScheduledTasks();
    if (opts.json) {
      console.log(JSON.stringify(tasks, null, 2));
    } else {
      console.log(formatScheduledTable(tasks));
    }
  });

program
  .command('jobs')
  .description('Every job with its kind, honest state, last run and next run (JSON)')
  .option('--json', 'output as JSON (the only format for now)')
  .action(async () => {
    console.log(JSON.stringify(await listJobs(), null, 2));
  });

async function wrapCommand(mode: 'wrap' | 'unwrap', labels: string[], all: boolean): Promise<void> {
  const jobs = (await listJobs()).filter(j => j.backend === 'launchd' && j.configPath);
  const targets = all
    ? jobs.filter(j => j.own && j.kind !== 'daemon' && (mode === 'wrap' ? j.scheduled?.source === 'launchd' : j.scheduled?.source === 'kennel-run'))
    : jobs.filter(j => labels.includes(j.id));
  const missing = labels.filter(l => !jobs.some(j => j.id === l));
  for (const label of missing) console.log(chalk.red(`✖ ${label}: no such LaunchAgent`));
  for (const job of targets) {
    if (job.kind === 'daemon') { console.log(chalk.yellow(`- ${job.id}: daemon, skipped (kennel-run is for jobs that finish)`)); continue; }
    const result = await applyWrap(job.id, job.configPath!, mode, { agent: job.kind === 'agent' });
    const mark = { wrapped: chalk.green('✓'), unwrapped: chalk.green('✓'), unchanged: chalk.dim('='), running: chalk.yellow('…'), failed: chalk.red('✖') }[result.outcome];
    console.log(`${mark} ${result.message}`);
  }
}

program
  .command('wrap [labels...]')
  .description('Route LaunchAgents through kennel-run so every run is recorded (reversible)')
  .option('--all', 'every own scheduled job that has no run record yet')
  .action(async (labels: string[], opts) => wrapCommand('wrap', labels, !!opts.all));

program
  .command('unwrap [labels...]')
  .description('Undo kennel wrap')
  .option('--all', 'every job currently wrapped')
  .action(async (labels: string[], opts) => wrapCommand('unwrap', labels, !!opts.all));

program
  .command('ui')
  .description('Open the web dashboard')
  .option('-p, --port <port>', 'port number', '5544')
  .option('--no-open', 'serve without opening a browser (for an always-on LaunchAgent)')
  .action(async (opts) => {
    const { startDashboard } = await import('./api.js');
    const port = parseInt(opts.port);
    await startDashboard(port);
    const url = `http://localhost:${port}`;
    console.log(`kennel dashboard running at ${url}`);
    if (opts.open) {
      const { execFile } = await import('node:child_process');
      execFile('open', [url]);
    }
  });

program
  .command('server')
  .description('Start the MCP server (stdio)')
  .action(async () => {
    await import('./server.js');
  });

// Default: run `list` if no command given
if (process.argv.length <= 2) {
  process.argv.push('list');
}

program.parse();
