#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Registry } from './registry.js';
import { runDoctor } from './doctor.js';

const registry = new Registry();

const server = new McpServer({
  name: 'kennel',
  version: '0.1.0',
}, {
  capabilities: { tools: {} },
});

server.tool(
  'list_services',
  'List all macOS services across launchd, PM2, Homebrew, and cron',
  {
    backend: z.enum(['launchd', 'pm2', 'brew', 'cron']).optional().describe('Filter by backend'),
    status: z.enum(['running', 'stopped', 'error', 'scheduled', 'unknown']).optional().describe('Filter by status'),
  },
  async ({ backend, status }) => {
    const services = await registry.listServices({ backend, status });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(services, null, 2),
      }],
    };
  }
);

server.tool(
  'get_service_info',
  'Get detailed info about a specific service',
  {
    name: z.string().describe('Service name or partial match'),
  },
  async ({ name }) => {
    const service = await registry.getService(name);
    if (!service) {
      return { content: [{ type: 'text', text: `Service not found: ${name}` }] };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(service, null, 2) }],
    };
  }
);

server.tool(
  'service_action',
  'Start, stop, or restart a service',
  {
    name: z.string().describe('Service name'),
    action: z.enum(['start', 'stop', 'restart']).describe('Action to perform'),
  },
  async ({ name, action }) => {
    const result = await registry.performAction(name, action);
    return {
      content: [{ type: 'text', text: result.message }],
    };
  }
);

server.tool(
  'service_logs',
  'Get recent log output from a service',
  {
    name: z.string().describe('Service name'),
    lines: z.number().optional().default(50).describe('Number of log lines'),
  },
  async ({ name, lines }) => {
    const logs = await registry.getLogs(name, lines);
    return {
      content: [{ type: 'text', text: logs }],
    };
  }
);

server.tool(
  'doctor',
  'Run health checks on all services — find stale PIDs, missing executables, secrets in configs, errors',
  {},
  async () => {
    const issues = await runDoctor(registry);
    return {
      content: [{
        type: 'text',
        text: issues.length === 0
          ? 'All services look healthy!'
          : JSON.stringify(issues, null, 2),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
