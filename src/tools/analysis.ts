import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq, ContextInput } from '@tuteliq/sdk';
import { loadWidget } from '../package-root.js';
import { trendEmoji, riskEmoji, formatMultiResult } from '../formatters.js';
import { withViewId } from '../view-id.js';
import { widgetUri } from '../widget-uri.js';

/**
 * Endpoint ids accepted by POST /api/v1/analyse/multi.
 *
 * Hyphenated, and deliberately not the MCP tool names — `social-engineering`
 * here is `detect_social_engineering` as a tool. Kept as a closed list so the
 * schema can advertise the valid values instead of accepting any string and
 * failing at the API on a typo.
 *
 * Mirrors the table in README.md; update both together.
 */
const ANALYSE_MULTI_ENDPOINTS = [
  'bullying',
  'grooming',
  'unsafe',
  'social-engineering',
  'app-fraud',
  'romance-scam',
  'mule-recruitment',
  'gambling-harm',
  'coercive-control',
  'vulnerability-exploitation',
  'radicalisation',
] as const;

/**
 * Analysis types accepted by POST /api/v1/batch/analyze.
 *
 * Every one of them takes a plain `text` payload except `grooming` and
 * `emotions`, which take message arrays — verified against the route's own
 * enum and per-type switch. This tool used to expose only the first four.
 */
const BATCH_TYPES = [
  'bullying',
  'grooming',
  'unsafe',
  'emotions',
  'social_engineering',
  'app_fraud',
  'romance_scam',
  'mule_recruitment',
  'gambling_harm',
  'coercive_control',
  'vulnerability_exploitation',
  'radicalisation',
] as const;

const EMOTIONS_WIDGET_URI = widgetUri('emotions-result');
const ACTION_PLAN_WIDGET_URI = widgetUri('action-plan');
const REPORT_WIDGET_URI = widgetUri('report-result');
const MULTI_WIDGET_URI = widgetUri('multi-result');

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
      description: 'Analyze emotional content and mental state indicators. Identifies dominant emotions, trends, and provides follow-up recommendations. Pass either `content` (single text) or `messages` (a conversation with senders) — messages enable per-speaker trend analysis.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().optional().describe('Single text content to analyze for emotions (alternative to messages)'),
        messages: z.array(z.object({
          sender: z.string().describe('Sender identifier or role'),
          content: z.string().describe('Message content'),
        })).optional().describe('Conversation history to analyze (alternative to content). Preserves per-speaker structure for trend analysis.'),
        context: z.object({
          language: z.string().optional(),
          ageGroup: z.string().optional(),
          platform: z.string().optional(),
        }).optional().describe('Optional analysis context'),
        external_id: z.string().optional().describe('Your unique identifier for this request. Echoed in the response and included in webhooks.'),
        customer_id: z.string().optional().describe('Your end-customer identifier for multi-tenant scenarios.'),
        metadata: z.record(z.string(), z.unknown()).optional().describe('Custom key-value pairs stored with results.'),
        incident_moderation_enabled: z.boolean().optional().describe('Per-call override of account incident logging: true forces persistence, false suppresses it. Omit for account default.'),
      },
      _meta: {
        ui: { resourceUri: EMOTIONS_WIDGET_URI },
      },
    },
    async ({ content, messages, context, external_id, customer_id, metadata, incident_moderation_enabled }) => {
      try {
        if (!content && !messages?.length) {
          return {
            content: [{ type: 'text' as const, text: '⚠️ Provide either `content` (single text) or `messages` (conversation history) to analyze.' }],
            isError: true,
          };
        }
        const result = await client.analyzeEmotions({
          content,
          messages,
          context: context as ContextInput | undefined,
          external_id,
          customer_id,
          metadata,
          incident_moderation_enabled,
        });

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

        return withViewId({
          structuredContent: { toolName: 'analyze_emotions', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
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

        return withViewId({
          structuredContent: { toolName: 'get_action_plan', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
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

        return withViewId({
          structuredContent: { toolName: 'generate_report', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
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
      description:
        'Run several detection endpoints against one piece of text in a single call, returning each verdict plus a combined risk level. '
        + 'Prefer this over `analyze` when the threat is not child-safety-specific: `analyze` only ever runs bullying and unsafe, so a financial scam analysed with it comes back labelled from the child-safety taxonomy rather than as fraud. '
        + 'Endpoint ids are hyphenated and are NOT the tool names — `social-engineering`, not `detect_social_engineering`. Maximum 10 per call.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().describe('Text content to analyze'),
        // A closed enum, not `z.array(z.string())`. The ids are hyphenated and
        // differ from the tool names, so a free-form array left the model
        // guessing and a wrong guess only failed at the API. The cap mirrors
        // the limit the endpoint itself enforces.
        endpoints: z
          .array(z.enum(ANALYSE_MULTI_ENDPOINTS))
          .min(1)
          .max(10)
          .describe(
            'Detection endpoints to run (1-10). One of: '
            + ANALYSE_MULTI_ENDPOINTS.join(', ')
            + '.',
          ),
        context: z.record(z.string(), z.unknown()).optional().describe('Optional analysis context'),
        include_evidence: z.boolean().optional().describe('Include supporting evidence'),
        support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to show crisis support resources (default: high). Critical always shows.'),
        external_id: z.string().optional().describe('External tracking ID'),
        customer_id: z.string().optional().describe('Customer identifier'),
      },
      _meta: {
        ui: { resourceUri: MULTI_WIDGET_URI },
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

        return withViewId({
          structuredContent: { toolName: 'analyse_multi', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: formatMultiResult(result) }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyse_multi', 'Multi-Endpoint Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── batch_analyze ──────────────────────────────────────────────────────────
  server.registerTool(
    'batch_analyze',
    {
      title: 'Batch Analysis',
      description:
        'Analyze up to 50 items in a single request — ideal for bulk triage. Each item runs one detection type. '
        + 'Pass `content` for the single-text types (bullying, unsafe, and every fraud/extended type), `messages` for grooming, '
        + 'and either for emotions. Give each item an `id` if you want to address it; one is generated otherwise. '
        + 'Per-item success/error is returned so a partial failure does not lose the successful results.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        items: z.array(z.object({
          // `id` addresses this item inside this request; the API requires one.
          // It was absent from this schema entirely, so Zod stripped any id the
          // caller supplied and every request was rejected with
          // "body/items/0 must have required property 'id'".
          id: z.string().optional().describe('Your identifier for this item within the batch, echoed on its result. Generated as `item-N` if omitted. Not the same as `external_id`.'),
          type: z.enum(BATCH_TYPES).describe('Detection type to run on this item'),
          content: z.string().optional().describe('Text to analyze (required for every type except grooming; optional for emotions)'),
          messages: z.array(z.object({
            role: z.enum(['adult', 'child', 'unknown']).optional().describe('Sender role (grooming)'),
            sender: z.string().optional().describe('Sender identifier (emotions)'),
            content: z.string(),
          })).optional().describe('Conversation messages. Required for grooming (use `role`); optional for emotions (use `sender`).'),
          childAge: z.number().optional().describe('Age of the child (grooming only)'),
          external_id: z.string().optional().describe('Your correlation ID for this item, echoed in its result'),
        })).min(1).max(50).describe('Items to analyze (max 50)'),
        parallel: z.boolean().optional().describe('Process items in parallel (default: true)'),
      },
    },
    async ({ items, parallel }) => {
      try {
        const invalid = items
          .map((it, i) => {
            if (it.type === 'grooming') return it.messages?.length ? -1 : i;
            if (it.type === 'emotions') return (it.messages?.length || it.content) ? -1 : i;
            return it.content ? -1 : i;
          })
          .filter(i => i >= 0);
        if (invalid.length > 0) {
          return {
            content: [{ type: 'text' as const, text: `⚠️ Invalid items at index ${invalid.join(', ')}: grooming items need \`messages\`, emotions items need \`messages\` or \`content\`, all other types need \`content\`.` }],
            isError: true,
          };
        }

        const result = await client.batch({
          items: items.map(it => {
            if (it.type === 'grooming') {
              return {
                id: it.id,
                type: 'grooming' as const,
                messages: (it.messages ?? []).map(m => ({ role: m.role ?? 'unknown', content: m.content })),
                childAge: it.childAge,
                external_id: it.external_id,
              };
            }
            if (it.type === 'emotions') {
              return {
                id: it.id,
                type: 'emotions' as const,
                ...(it.messages?.length
                  ? { messages: it.messages.map(m => ({ sender: m.sender ?? m.role ?? 'user', content: m.content })) }
                  : { content: it.content! }),
                external_id: it.external_id,
              };
            }
            return { id: it.id, type: it.type, content: it.content!, external_id: it.external_id };
          }),
          parallel,
        });

        const lines = result.results.map(r => {
          const item = items[r.index];
          // Show both identifiers when they differ — they mean different things
          // and collapsing them is how a caller loses track of which is which.
          const label = r.external_id && r.external_id !== r.id
            ? `\`${r.id}\` (external_id \`${r.external_id}\`)`
            : `\`${r.id}\``;
          if (!r.success) return `- ❌ ${label} (${r.type ?? item?.type}): ${r.error ?? 'unknown error'}`;
          const res = r.result as any;
          const signal = res?.severity ?? res?.grooming_risk ?? res?.level ?? res?.trend ?? '';
          return `- ✅ ${label} (${r.type ?? item?.type})${signal ? ` — ${signal}` : ''}`;
        }).join('\n');

        const text = `## Batch Analysis

**Total:** ${result.summary.total} | **Succeeded:** ${result.summary.successful} | **Failed:** ${result.summary.failed}
**Processing Time:** ${result.processing_time_ms}ms${result.summary.total_credits_used != null ? `\n**Credits Used:** ${result.summary.total_credits_used}` : ''}

${lines}`;

        return {
          structuredContent: { toolName: 'batch_analyze', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'batch_analyze', 'Batch Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );
}
