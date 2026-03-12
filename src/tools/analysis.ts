import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq, ContextInput } from '@tuteliq/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { trendEmoji, riskEmoji, formatMultiResult } from '../formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EMOTIONS_WIDGET_URI = 'ui://tuteliq/emotions-result.html';
const ACTION_PLAN_WIDGET_URI = 'ui://tuteliq/action-plan.html';
const REPORT_WIDGET_URI = 'ui://tuteliq/report-result.html';
const MULTI_WIDGET_URI = 'ui://tuteliq/multi-result.html';

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

export function registerAnalysisTools(server: McpServer, client: Tuteliq): void {
  const resources = [
    { uri: EMOTIONS_WIDGET_URI, file: 'emotions-result.html' },
    { uri: ACTION_PLAN_WIDGET_URI, file: 'action-plan.html' },
    { uri: REPORT_WIDGET_URI, file: 'report-result.html' },
    { uri: MULTI_WIDGET_URI, file: 'multi-result.html' },
  ];

  for (const r of resources) {
    registerAppResource(
      server as any,
      r.uri,
      r.uri,
      { mimeType: RESOURCE_MIME_TYPE },
      async () => ({
        contents: [{
          uri: r.uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: loadWidget(r.file),
        }],
      }),
    );
  }

  // ── analyze_emotions ───────────────────────────────────────────────────────
  registerAppTool(
    server,
    'analyze_emotions',
    {
      title: 'Analyze Emotions',
      description: 'Analyze emotional content and mental state indicators. Identifies dominant emotions, trends, and provides follow-up recommendations.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().describe('The text content to analyze for emotions'),
      },
      _meta: {
        ui: { resourceUri: EMOTIONS_WIDGET_URI },
        'openai/widgetDescription': 'Shows emotion analysis results with charts and trends',
        'openai/toolInvocation/invoking': 'Analyzing emotional content...',
        'openai/toolInvocation/invoked': 'Emotion analysis complete.',
      },
    },
    async ({ content }) => {
      try {
        const result = await client.analyzeEmotions({ content });

        const emoji = trendEmoji[result.trend] || '\u27A1\uFE0F';
        const emotionScoresList = Object.entries(result.emotion_scores)
          .sort((a, b) => b[1] - a[1])
          .map(([emotion, score]) => `- ${emotion}: ${(score * 100).toFixed(0)}%`)
          .join('\n');

        const text = `## Emotion Analysis

**Dominant Emotions:** ${result.dominant_emotions.join(', ')}
**Trend:** ${emoji} ${result.trend.charAt(0).toUpperCase() + result.trend.slice(1)}

### Emotion Scores
${emotionScoresList}

### Summary
${result.summary}

### Recommended Follow-up
${result.recommended_followup}`;

        return {
          structuredContent: { toolName: 'analyze_emotions', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyze_emotions', 'Emotion Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── get_action_plan ────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'get_action_plan',
    {
      title: 'Get Action Plan',
      description: 'Generate age-appropriate guidance and action steps for handling a safety situation.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        situation: z.string().describe('Description of the situation needing guidance'),
        childAge: z.number().optional().describe('Age of the child involved'),
        audience: z.enum(['child', 'parent', 'educator', 'platform']).optional().describe('Who the guidance is for (default: parent)'),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Severity of the situation'),
      },
      _meta: {
        ui: { resourceUri: ACTION_PLAN_WIDGET_URI },
        'openai/widgetDescription': 'Shows age-appropriate action plan with step-by-step guidance',
        'openai/toolInvocation/invoking': 'Generating action plan...',
        'openai/toolInvocation/invoked': 'Action plan ready.',
      },
    },
    async ({ situation, childAge, audience, severity }) => {
      try {
        const result = await client.getActionPlan({ situation, childAge, audience, severity });

        const text = `## Action Plan

**Audience:** ${result.audience}
**Tone:** ${result.tone}
${result.reading_level ? `**Reading Level:** ${result.reading_level}` : ''}

### Steps
${result.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;

        return {
          structuredContent: { toolName: 'get_action_plan', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'get_action_plan', 'Action Plan');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── generate_report ────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'generate_report',
    {
      title: 'Generate Report',
      description: 'Generate a comprehensive incident report from a conversation.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        messages: z.array(z.object({
          sender: z.string().describe('Name/ID of sender'),
          content: z.string().describe('Message content'),
        })).describe('Array of messages in the incident'),
        childAge: z.number().optional().describe('Age of the child involved'),
        incidentType: z.string().optional().describe('Type of incident (e.g., bullying, grooming)'),
      },
      _meta: {
        ui: { resourceUri: REPORT_WIDGET_URI },
        'openai/widgetDescription': 'Shows comprehensive incident report with risk assessment',
        'openai/toolInvocation/invoking': 'Generating incident report...',
        'openai/toolInvocation/invoked': 'Incident report ready.',
      },
    },
    async ({ messages, childAge, incidentType }) => {
      try {
        const result = await client.generateReport({
          messages,
          childAge,
          incident: incidentType ? { type: incidentType } : undefined,
        });

        const emoji = riskEmoji[result.risk_level] || '\u26AA';
        const text = `## \u{1F4CB} Incident Report

**Risk Level:** ${emoji} ${result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)}

### Summary
${result.summary}

### Categories
${result.categories.map(c => `- ${c}`).join('\n')}

### Recommended Next Steps
${result.recommended_next_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;

        return {
          structuredContent: { toolName: 'generate_report', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'generate_report', 'Report Generation');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── analyse_multi ──────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'analyse_multi',
    {
      title: 'Multi-Endpoint Analysis',
      description: 'Run multiple detection endpoints on a single piece of text.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().describe('Text content to analyze'),
        endpoints: z.array(z.string()).describe('Detection endpoints to run'),
        context: z.record(z.string(), z.unknown()).optional().describe('Optional analysis context'),
        include_evidence: z.boolean().optional().describe('Include supporting evidence'),
        support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to show crisis support resources (default: high). Critical always shows.'),
        external_id: z.string().optional().describe('External tracking ID'),
        customer_id: z.string().optional().describe('Customer identifier'),
      },
      _meta: {
        ui: { resourceUri: MULTI_WIDGET_URI },
        'openai/widgetDescription': 'Shows multi-endpoint analysis with aggregated risk assessment',
        'openai/toolInvocation/invoking': 'Running multi-endpoint analysis...',
        'openai/toolInvocation/invoked': 'Multi-endpoint analysis complete.',
      },
    },
    async ({ content, endpoints, context, include_evidence, support_threshold, external_id, customer_id }) => {
      try {
        const result = await client.analyseMulti({
          content,
          detections: endpoints,
          context: context as ContextInput | undefined,
          includeEvidence: include_evidence,
          supportThreshold: support_threshold,
          external_id,
          customer_id,
        });

        return {
          structuredContent: { toolName: 'analyse_multi', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: formatMultiResult(result) }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyse_multi', 'Multi-Endpoint Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );
}
