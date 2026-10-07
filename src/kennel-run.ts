#!/usr/bin/env node
import { runWrapped } from './runs.js';

// Usage in a LaunchAgent: ProgramArguments = [kennel-run, (--agent), (--label L), --, command, args...]
// The label defaults to XPC_SERVICE_NAME, which launchd sets to the job's Label.

function usage(): never {
  process.stderr.write('usage: kennel-run [--agent] [--label LABEL] -- command [args...]\n');
  process.exit(64);
}

const argv = process.argv.slice(2);
const split = argv.indexOf('--');
if (split < 0 || split === argv.length - 1) usage();
const flags = argv.slice(0, split);
const [command, ...args] = argv.slice(split + 1);

const labelAt = flags.indexOf('--label');
const label = labelAt >= 0 ? flags[labelAt + 1] : process.env.XPC_SERVICE_NAME;
if (!label || label === '0') usage();

process.exitCode = await runWrapped({ label, command, args, agent: flags.includes('--agent') });
