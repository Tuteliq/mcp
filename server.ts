import express from 'express';
import cors from 'cors';
import { createServer } from './src/index.js';
import { createHttpHandlers } from './src/transport.js';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

const { streamableHandler, sseHandler, messagesHandler, closeAll } =
  createHttpHandlers(createServer);

// Streamable HTTP transport (protocol version 2025-11-25)
app.all('/mcp', (req, res) => {
  streamableHandler(req, res).catch((err) => {
    console.error('MCP handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Legacy SSE transport (protocol version 2024-11-05)
app.get('/sse', (req, res) => {
  sseHandler(req, res).catch((err) => {
    console.error('SSE handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.post('/messages', (req, res) => {
  messagesHandler(req, res).catch((err) => {
    console.error('Messages handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '3.2.5' });
});

const server = app.listen(port, () => {
  console.error(`Tuteliq MCP server running on http://localhost:${port}`);
  console.error(`  Streamable HTTP: POST/GET/DELETE /mcp`);
  console.error(`  Legacy SSE:      GET /sse + POST /messages`);
});

process.on('SIGINT', async () => {
  console.error('Shutting down...');
  await closeAll();
  server.close();
  process.exit(0);
});
