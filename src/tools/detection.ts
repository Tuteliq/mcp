import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq } from '@tuteliq/sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { severityEmoji, riskEmoji } from '../formatters.js';

const DETECTION_WIDGET_URI = 'ui://tuteliq/detection-result.html';

function loadWidget(name: string): string {
  return readFileSync(resolve(__dirname, '../../dist-ui', name), 'utf-8');
}

const contextSchema = z.object({
  language: z.string().optional(),
  ageGroup: z.string().optional(),
  relationship: z.string().optional(),
  platform: z.string().optional(),
}).optional();

const uiMeta = (desc: string, invoking: string, invoked: string) => ({
  ui: { resourceUri: DETECTION_WIDGET_URI },
  'openai/widgetDescription': desc,
  'openai/toolInvocation/invoking': invoking,
  'openai/toolInvocation/invoked': invoked,
});

export function registerDetectionTools(server: McpServer, client: Tuteliq): void {
  // Cast needed due to CJS/ESM dual-module type mismatch between MCP SDK and ext-apps
  registerAppResource(
    server as any,
    DETECTION_WIDGET_URI,
    DETECTION_WIDGET_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [{
        uri: DETECTION_WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: loadWidget('detection-result.html'),
      }],
    }),
  );

  // ── detect_bullying ────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'detect_bullying',
    {
      title: 'Detect Bullying',
      description: 'Analyze text content to detect bullying, harassment, or harmful language.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().describe('The text content to analyze for bullying'),
        context: contextSchema,
      },
      _meta: uiMeta('Shows bullying detection results with risk indicators', 'Analyzing content for bullying...', 'Bullying analysis complete.'),
    },
    async ({ content, context }) => {
      const result = await client.detectBullying({
        content,
        context: { ...context, platform: 'mcp' } as Record<string, string>,
      });

      return {
        structuredContent: { toolName: 'detect_bullying', result, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text: `Bullying analysis complete. See the interactive widget above. Do not add any additional commentary.` }],
      };
    },
  );

  // ── detect_grooming ────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'detect_grooming',
    {
      title: 'Detect Grooming',
      description: 'Analyze a conversation for grooming patterns and predatory behavior.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        messages: z.array(z.object({
          role: z.enum(['adult', 'child', 'unknown']),
          content: z.string(),
        })).describe('Array of messages in the conversation'),
        childAge: z.number().optional().describe('Age of the child in the conversation'),
      },
      _meta: uiMeta('Shows grooming detection results with risk indicators', 'Analyzing conversation for grooming patterns...', 'Grooming analysis complete.'),
    },
    async ({ messages, childAge }) => {
      const result = await client.detectGrooming({
        messages,
        childAge,
        context: { platform: 'mcp' } as Record<string, string>,
      });

      return {
        structuredContent: { toolName: 'detect_grooming', result, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text: `Grooming analysis complete. See the interactive widget above. Do not add any additional commentary.` }],
      };
    },
  );

  // ── detect_unsafe ──────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'detect_unsafe',
    {
      title: 'Detect Unsafe Content',
      description: 'Detect unsafe content including self-harm, violence, drugs, explicit material.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().describe('The text content to analyze for unsafe content'),
        context: contextSchema,
      },
      _meta: uiMeta('Shows unsafe content detection results', 'Analyzing content for safety concerns...', 'Safety analysis complete.'),
    },
    async ({ content, context }) => {
      const result = await client.detectUnsafe({
        content,
        context: { ...context, platform: 'mcp' } as Record<string, string>,
      });

      return {
        structuredContent: { toolName: 'detect_unsafe', result, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text: `Unsafe content analysis complete. See the interactive widget above. Do not add any additional commentary.` }],
      };
    },
  );

  // ── analyze (quick combined) ───────────────────────────────────────────────
  registerAppTool(
    server,
    'analyze',
    {
      title: 'Quick Safety Analysis',
      description: 'Quick comprehensive safety analysis that checks for both bullying and unsafe content.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().describe('The text content to analyze'),
        include: z.array(z.enum(['bullying', 'unsafe'])).optional().describe('Which checks to run (default: both)'),
      },
      _meta: uiMeta('Shows combined safety analysis results', 'Running safety analysis...', 'Safety analysis complete.'),
    },
    async ({ content, include }) => {
      const result = await client.analyze({ content, include, context: { platform: 'mcp' } });

      return {
        structuredContent: { toolName: 'analyze', result, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text: `Safety analysis complete. See the interactive widget above. Do not add any additional commentary.` }],
      };
    },
  );
}
