import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';

export type TransportMode = 'http' | 'stdio';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

interface SessionEntry {
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  lastActivity: number;
}

export function getTransportMode(): TransportMode {
  const env = process.env.TUTELIQ_MCP_TRANSPORT?.toLowerCase();
  if (env === 'stdio') return 'stdio';
  return 'http';
}

export async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tuteliq MCP server running on stdio');
}

export function createHttpHandlers(createServer: () => McpServer) {
  const sessions = new Map<string, SessionEntry>();

  function addSession(id: string, transport: StreamableHTTPServerTransport | SSEServerTransport): void {
    sessions.set(id, { transport, lastActivity: Date.now() });
  }

  function removeSession(id: string): void {
    sessions.delete(id);
  }

  function getTransport(id: string): StreamableHTTPServerTransport | SSEServerTransport | undefined {
    const entry = sessions.get(id);
    if (entry) {
      entry.lastActivity = Date.now();
      return entry.transport;
    }
    return undefined;
  }

  // Periodic cleanup of stale sessions
  const cleanupTimer = setInterval(async () => {
    const now = Date.now();
    for (const [id, entry] of sessions) {
      if (now - entry.lastActivity > SESSION_TTL_MS) {
        try {
          await entry.transport.close();
        } catch { /* already closed */ }
        sessions.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  // Streamable HTTP handler — POST /mcp, GET /mcp, DELETE /mcp
  const streamableHandler = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (req.method === 'POST') {
      if (sessionId) {
        const existing = getTransport(sessionId);
        if (existing) {
          if (existing instanceof StreamableHTTPServerTransport) {
            await existing.handleRequest(req, res, req.body);
            return;
          }
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Session uses a different transport protocol' },
            id: null,
          });
          return;
        }
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (id) => {
            addSession(id, transport);
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) removeSession(sid);
        };

        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
    } else if (req.method === 'GET') {
      if (!sessionId) {
        res.status(400).json({ error: 'Invalid or missing session ID' });
        return;
      }
      const transport = getTransport(sessionId);
      if (!transport) {
        res.status(400).json({ error: 'Invalid or missing session ID' });
        return;
      }
      if (transport instanceof StreamableHTTPServerTransport) {
        await transport.handleRequest(req, res);
      } else {
        res.status(400).json({ error: 'Session uses a different transport protocol' });
      }
    } else if (req.method === 'DELETE') {
      if (sessionId) {
        const transport = getTransport(sessionId);
        if (transport && transport instanceof StreamableHTTPServerTransport) {
          await transport.handleRequest(req, res);
          removeSession(sessionId);
        } else {
          res.status(400).json({ error: 'Invalid or missing session ID' });
        }
      } else {
        res.status(400).json({ error: 'Invalid or missing session ID' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  };

  // Legacy SSE handler — GET /sse
  const sseHandler = async (req: Request, res: Response): Promise<void> => {
    const transport = new SSEServerTransport('/messages', res);
    addSession(transport.sessionId, transport);

    res.on('close', () => {
      removeSession(transport.sessionId);
    });

    const server = createServer();
    await server.connect(transport);
  };

  // Legacy message handler — POST /messages?sessionId=...
  const messagesHandler = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.query.sessionId as string;
    const transport = getTransport(sessionId);

    if (!transport || !(transport instanceof SSEServerTransport)) {
      res.status(400).json({ error: 'Invalid or missing session ID' });
      return;
    }

    await transport.handlePostMessage(req, res, req.body);
  };

  // Graceful shutdown
  const closeAll = async (): Promise<void> => {
    clearInterval(cleanupTimer);
    for (const [id, entry] of sessions) {
      try {
        await entry.transport.close();
        sessions.delete(id);
      } catch (error) {
        console.error(`Error closing transport ${id}:`, error);
      }
    }
  };

  return { streamableHandler, sseHandler, messagesHandler, closeAll };
}
