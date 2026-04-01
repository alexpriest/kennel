#!/usr/bin/env node
import { Command } from 'commander';
import { Registry } from './registry.js';
import { runDoctor } from './doctor.js';
import { formatServiceTable, formatServiceInfo, formatDoctorResults } from './formatter.js';
import type { BackendType, ServiceStatus } from './types.js';

const program = new Command();
const registry = new Registry();

program
  .name('kennel')
  .description('Where your daemons live — unified macOS service manager')
  .version('0.1.0');

program
  .command('list')
  .description('List all services across all backends')
  .option('-b, --backend <type>', 'filter by backend (launchd, pm2, brew, cron)')
  .option('-s, --status <status>', 'filter by status (running, stopped, error, scheduled)')
  .option('--json', 'output as JSON')
  .action(async (opts) => {
    const services = await registry.listServices({
      backend: opts.backend as BackendType | undefined,
      status: opts.status as ServiceStatus | undefined,
    });
    if (opts.json) {
      console.log(JSON.stringify(services, null, 2));
    } else {
      console.log(formatServiceTable(services));
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
          const newContent = fresh.slice(lastLength);
          if (newContent.trim()) {
            process.stdout.write(newContent);
          }
          lastLength = fresh.length;
        }
      };

      const interval = setInterval(poll, 2000);

      process.on('SIGINT', () => {
        clearInterval(interval);
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {});
    }
  });

program
  .command('start <service>')
  .description('Start a service')
  .action(async (name: string) => {
    const result = await registry.performAction(name, 'start');
    console.log(result.message);
    if (!result.success) process.exit(1);
  });

program
  .command('stop <service>')
  .description('Stop a service')
  .action(async (name: string) => {
    const result = await registry.performAction(name, 'stop');
    console.log(result.message);
    if (!result.success) process.exit(1);
  });

program
  .command('restart <service>')
  .description('Restart a service')
  .action(async (name: string) => {
    const result = await registry.performAction(name, 'restart');
    console.log(result.message);
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
  .command('ui')
  .description('Open the web dashboard')
  .option('-p, --port <port>', 'port number', '5544')
  .action(async (opts) => {
    const { startDashboard } = await import('./api.js');
    const port = parseInt(opts.port);
    await startDashboard(port);
    const url = `http://localhost:${port}`;
    console.log(`kennel dashboard running at ${url}`);
    const { execFile } = await import('node:child_process');
    execFile('open', [url]);
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
