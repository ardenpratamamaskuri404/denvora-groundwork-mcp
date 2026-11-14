#!/usr/bin/env node

/**
 * Entry point for Denvora Groundwork MCP Server.
 * Communicates over stdio JSON-RPC.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createGroundworkServer } from './server.js';

async function run(): Promise<void> {
  const server = createGroundworkServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('Denvora Groundwork MCP server started on stdio');
}

run().catch((error) => {
  console.error('Fatal error starting Denvora Groundwork MCP server:', error);
  process.exit(1);
});
