import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq } from '@tuteliq/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { severityEmoji, riskEmoji, formatSupportText } from '../formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DETECTION_WIDGET_URI = 'ui://tuteliq/detection-result.html';

function loadWidget(name: string): string {
  return readFileSync(resolve(__dirname, '../../../dist-ui', name), 'utf-8');
}

function handleTierError(err: any, toolName: string, featureLabel: string) {
  if (err?.status === 403 || err?.response?.status === 403) {
    const upsellResult = {
      error: 'tier_restricted',
      tier_restricted: true,
      upgrade: true,
      message: `Your current plan does not include ${featureLabel.toLowerCase()}. Upgrade your plan or purchase additional credits to unlock this feature.`,
    };
    return {
      structuredContent: { toolName, result: upsellResult, branding: { appName: 'Tuteliq' } },
      content: [{ type: 'text' as const, text: `\u26A0\uFE0F ${upsellResult.message}\n\nUpgrade at: https://tuteliq.ai/dashboard` }],
    };
  }
  return null;
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
      try {
        const result = await client.detectBullying({
          content,
          context: context as Record<string, string> | undefined,
        });

        const emoji = severityEmoji[result.severity] || '\u26AA';
        let text = `## ${result.is_bullying ? '\u26A0\uFE0F Bullying Detected' : '\u2705 No Bullying Detected'}

**Severity:** ${emoji} ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

${result.is_bullying ? `**Types:** ${result.bullying_type.join(', ')}` : ''}

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\``;

        if ((result as any).support) text += formatSupportText((result as any).support);

        return {
          structuredContent: { toolName: 'detect_bullying', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_bullying', 'Bullying Detection');
        if (upsell) return upsell;
        throw err;
      }
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
      try {
        const result = await client.detectGrooming({
          messages,
          childAge,
        });

        const emoji = riskEmoji[result.grooming_risk] || '\u26AA';
        let text = `## ${result.grooming_risk === 'none' ? '\u2705 No Grooming Detected' : '\u26A0\uFE0F Grooming Risk Detected'}

**Risk Level:** ${emoji} ${result.grooming_risk.charAt(0).toUpperCase() + result.grooming_risk.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

${result.flags.length > 0 ? `**Warning Flags:**\n${result.flags.map(f => `- \u{1F6A9} ${f}`).join('\n')}` : ''}

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\``;

        if ((result as any).support) text += formatSupportText((result as any).support);

        return {
          structuredContent: { toolName: 'detect_grooming', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_grooming', 'Grooming Detection');
        if (upsell) return upsell;
        throw err;
      }
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
      try {
        const result = await client.detectUnsafe({
          content,
          context: context as Record<string, string> | undefined,
        });

        const emoji = severityEmoji[result.severity] || '\u26AA';
        let text = `## ${result.unsafe ? '\u26A0\uFE0F Unsafe Content Detected' : '\u2705 Content is Safe'}

**Severity:** ${emoji} ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

${result.unsafe ? `**Categories:**\n${result.categories.map(c => `- \u26A0\uFE0F ${c}`).join('\n')}` : ''}

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\``;

        if ((result as any).support) text += formatSupportText((result as any).support);

        return {
          structuredContent: { toolName: 'detect_unsafe', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_unsafe', 'Unsafe Content Detection');
        if (upsell) return upsell;
        throw err;
      }
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
      try {
        const result = await client.analyze({ content, include });

        const emoji = riskEmoji[result.risk_level] || '\u26AA';
        const text = `## Safety Analysis Results

**Overall Risk:** ${emoji} ${result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)}
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

### Summary
${result.summary}

### Recommended Action
\`${result.recommended_action}\`

---
${result.bullying ? `\n**Bullying Check:** ${result.bullying.is_bullying ? '\u26A0\uFE0F Detected' : '\u2705 Clear'}\n` : ''}${result.unsafe ? `\n**Unsafe Content:** ${result.unsafe.unsafe ? '\u26A0\uFE0F Detected' : '\u2705 Clear'}\n` : ''}`;

        return {
          structuredContent: { toolName: 'analyze', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyze', 'Safety Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );
}
