#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Tuteliq } from '@tuteliq/sdk';

import { registerDetectionTools } from './tools/detection.js';
import { registerFraudTools } from './tools/fraud.js';
import { registerMediaTools } from './tools/media.js';
import { registerAnalysisTools } from './tools/analysis.js';
import { registerSyntheticTools } from './tools/synthetic.js';
import { registerVerificationTools } from './tools/verification.js';
import { registerAdminTools } from './tools/admin.js';
import { registerAutomationTools } from './tools/automation.js';
import { registerGovernanceTools } from './tools/governance.js';
import { registerResources } from './tools/resources.js';
import { pathToFileURL } from 'node:url';

import { getTransportMode, startStdio } from './transport.js';
import { PACKAGE_VERSION } from './package-root.js';

export function createServer(apiKeyOverride?: string): McpServer {
  const apiKey = apiKeyOverride || process.env.TUTELIQ_API_KEY;
  if (!apiKey) {
    throw new Error('API key is required: pass it to createServer() or set TUTELIQ_API_KEY env var');
  }

  // Audio + document tools can run longer than the SDK default 30s timeout
  // (whisper.cpp cold-start transcription + multi-page OCR). Cap at 120s,
  // the maximum the SDK accepts.
  const client = new Tuteliq(apiKey, { timeout: 120000 });

  const server = new McpServer({
    name: 'tuteliq-mcp',
    version: PACKAGE_VERSION,
  });

  // Register all tool groups
  registerDetectionTools(server, client);
  registerFraudTools(server, client);
  registerMediaTools(server, client);
  registerAnalysisTools(server, client);
  registerSyntheticTools(server, client);
  registerVerificationTools(server, client);
  registerAdminTools(server, client);
  registerAutomationTools(server, client);
  registerGovernanceTools(server, client);
  registerResources(server);

  return server;
}

/**
 * True when this file was run as a program rather than imported as a module.
 * The HTTP deployment imports `createServer` and drives its own transport, so
 * it must keep reaching the `else` branch without printing anything.
 */
function isDirectExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

// Direct execution: stdio mode
if (getTransportMode() === 'stdio') {
  const server = createServer();
  startStdio(server).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else if (isDirectExecution()) {
  // Transport defaults to http, which this entrypoint does not start: the HTTP
  // deployment imports `createServer` instead. Run as a binary, that meant
  // exiting 0 with no output and no explanation, which reads as a crash.
  // Say so rather than sitting silent. The exit code is deliberately
  // unchanged, since something may already depend on it.
  console.error(
    'tuteliq-mcp: nothing to do.\n'
    + '\n'
    + "This entrypoint starts a server only in stdio mode, and the transport currently resolves to 'http'.\n"
    + '\n'
    + '  To run over stdio (what an MCP client expects):\n'
    + '    TUTELIQ_MCP_TRANSPORT=stdio TUTELIQ_API_KEY=<key> tuteliq-mcp\n'
    + '\n'
    + '  For HTTP, import { createServer } and attach your own transport.\n'
    + '\n'
    + '  The hosted server is at https://api.tuteliq.ai/mcp',
  );
}
