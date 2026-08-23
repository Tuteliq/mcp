import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq } from '@tuteliq/sdk';
import { loadWidget } from '../package-root.js';
import { severityEmoji, riskEmoji, formatSupportText, formatRationale, formatContinuation, formatTrajectory, riskScoreScope } from '../formatters.js';
import { harmSignals } from '../support-relevance.js';
import { withViewId } from '../view-id.js';
import { widgetUri } from '../widget-uri.js';

const DETECTION_WIDGET_URI = widgetUri('detection-result');

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
  country: z.string().optional().describe('ISO 3166-1 alpha-2 country code (e.g., "GB", "US") for geo-localised helpline data'),
}).optional();

// Correlation fields shared by the detection endpoints. They are echoed back in
// the response, stored on any resulting incident, and included in webhook
// payloads — which is what lets a moderation agent tie an incident back to the
// platform's own message/user records.
const trackingSchema = {
  external_id: z.string().optional().describe('Your unique identifier for this request (e.g., message ID). Echoed in the response, stored on incidents, and included in webhooks.'),
  customer_id: z.string().optional().describe('Your end-customer identifier for multi-tenant scenarios. Enables routing alerts to the correct customer from a single webhook.'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Custom key-value pairs stored with detection results and included in webhooks.'),
  incident_moderation_enabled: z.boolean().optional().describe('Per-call override of account incident logging: true forces persistence, false suppresses it. Omit for account default.'),
};

/**
 * Tool `_meta` for the detection widgets.
 *
 * This used to carry `openai/widgetDescription` and the two
 * `openai/toolInvocation/*` strings alongside the resource URI. Those are
 * OpenAI Apps SDK conventions; Claude ignores them, and unrecognised
 * vendor-namespaced keys are a candidate for the directory submission's
 * schema rejecting our tool snapshot. Restore them if these widgets are ever
 * shipped to an OpenAI host.
 *
 * The parameters are kept so call sites still read as self-documenting.
 */
const uiMeta = (_desc: string, _invoking: string, _invoked: string) => ({
  ui: { resourceUri: DETECTION_WIDGET_URI },
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
      description: 'Analyze text content to detect bullying, harassment, or harmful language. `risk_score` scores ONLY the message you pass in. Multi-turn: every result ends with a "Conversation state" section containing a `continuation_token` — pass that exact string back as `continuation_token` on the next call to carry trajectory awareness forward. No message content is stored server-side; the token is the state. From the second turn onward the result also carries a "Conversation risk" section: `trajectory_risk` (0-1 for the conversation, not the message), `trajectory` (rising/stable/declining/none) and `severity_series` (per-turn severity, oldest first). These diverge from `risk_score` precisely where it matters — a friendly message sent straight after an escalation scores low on its own and high as a conversation — so judge the conversation on the higher of the two.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().describe('The text content to analyze for bullying'),
        context: contextSchema,
        support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to show crisis support resources (default: high). Critical always shows.'),
        continuation_token: z.string().optional().describe('Opaque signed token returned by a prior detect_bullying call. Pass it back to maintain multi-turn awareness without server-side content storage. The result includes a fresh continuation_token to forward into the next call.'),
        reset_conversation: z.boolean().optional().describe('If true, discard any continuation_token and analyze this content as a fresh conversation.'),
        verdict_only: z.boolean().optional().describe('Fast mode. Return only the verdict (severity, categories, recommended action) and omit any per-message breakdown. Lower latency for real-time screening; the verdict itself is unchanged.'),
        ...trackingSchema,
      },
      _meta: uiMeta('Shows bullying detection results with risk indicators', 'Analyzing content for bullying...', 'Bullying analysis complete.'),
    },
    async ({ content, context, support_threshold, continuation_token, reset_conversation, verdict_only, external_id, customer_id, metadata, incident_moderation_enabled }) => {
      try {
        const result = await client.detectBullying({
          content,
          context: context as Record<string, string> | undefined,
          supportThreshold: support_threshold,
          continuationToken: continuation_token,
          resetConversation: reset_conversation,
          verdictOnly: verdict_only,
          external_id,
          customer_id,
          metadata,
          incident_moderation_enabled,
        });

        const emoji = severityEmoji[result.severity] || '\u26AA';
        let text = `## ${result.is_bullying ? '\u26A0\uFE0F Bullying Detected' : '\u2705 No Bullying Detected'}

**Severity:** ${emoji} ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%${riskScoreScope(result)}

${result.is_bullying ? `**Types:** ${result.bullying_type.join(', ')}` : ''}
${formatTrajectory(result)}

${formatRationale(result)}

### Recommended Action
\`${result.recommended_action}\``.replace(/\n{3,}/g, '\n\n');

        if (result.support) text += formatSupportText(result.support, harmSignals(result, 'detect_bullying'));
        text += formatContinuation(result, 'detect_bullying');

        return withViewId({
          structuredContent: { toolName: 'detect_bullying', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
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
      description: 'Analyze a conversation for grooming patterns and predatory behavior. Supports optional ages: pass `childAge` for the minor, `participantAge` for the non-minor counterpart, and `senderAge` per message when you have richer multi-party info. For conversations longer than ~20 turns, chunk into sliding windows: every result ends with a "Conversation state" section containing a `continuation_token` — pass that exact string back as `continuation_token` on the next chunk to carry trajectory awareness across windows. No message content is stored server-side; the token is the state. From the second chunk onward the result also carries a "Conversation risk" section: `trajectory_risk` (0-1 across every window seen so far, not just this one), `trajectory` (rising/stable/declining/none) and `severity_series` (per-window severity, oldest first). Grooming is a slow burn, so a window that reads benign can still sit inside a high-risk conversation — judge it on the higher of `risk_score` and `trajectory_risk`.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        messages: z.array(z.object({
          role: z.enum(['adult', 'child', 'unknown']),
          content: z.string(),
          senderAge: z.number().optional().describe('Optional age of this message\'s sender'),
        })).describe('Array of messages in the conversation'),
        childAge: z.number().optional().describe('Age of the child in the conversation'),
        participantAge: z.number().optional().describe('Optional age of the non-minor participant'),
        support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to show crisis support resources (default: high). Critical always shows.'),
        continuation_token: z.string().optional().describe('Opaque signed token returned by a prior detect_grooming call. Pass it back to maintain multi-turn awareness across chunked conversations without server-side content storage. The result includes a fresh continuation_token for the next call.'),
        reset_conversation: z.boolean().optional().describe('If true, discard any continuation_token and analyze these messages as a fresh conversation.'),
        verdict_only: z.boolean().optional().describe('Fast mode. Return only the conversation-level verdict (risk level, flags, recommended action) and omit the per-message breakdown. Lower latency for real-time screening; the verdict itself is unchanged.'),
        ...trackingSchema,
      },
      _meta: uiMeta('Shows grooming detection results with risk indicators', 'Analyzing conversation for grooming patterns...', 'Grooming analysis complete.'),
    },
    async ({ messages, childAge, participantAge, support_threshold, continuation_token, reset_conversation, verdict_only, external_id, customer_id, metadata, incident_moderation_enabled }) => {
      try {
        const result = await client.detectGrooming({
          messages,
          childAge,
          participantAge,
          supportThreshold: support_threshold,
          continuationToken: continuation_token,
          resetConversation: reset_conversation,
          verdictOnly: verdict_only,
          external_id,
          customer_id,
          metadata,
          incident_moderation_enabled,
        });

        const emoji = riskEmoji[result.grooming_risk] || '\u26AA';
        let text = `## ${result.grooming_risk === 'none' ? '\u2705 No Grooming Detected' : '\u26A0\uFE0F Grooming Risk Detected'}

**Risk Level:** ${emoji} ${result.grooming_risk.charAt(0).toUpperCase() + result.grooming_risk.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%${riskScoreScope(result)}

${result.flags.length > 0 ? `**Warning Flags:**\n${result.flags.map(f => `- \u{1F6A9} ${f}`).join('\n')}` : ''}
${formatTrajectory(result)}

${formatRationale(result)}

### Recommended Action
\`${result.recommended_action}\``.replace(/\n{3,}/g, '\n\n');

        if (result.support) text += formatSupportText(result.support, harmSignals(result, 'detect_grooming'));
        text += formatContinuation(result, 'detect_grooming');

        return withViewId({
          structuredContent: { toolName: 'detect_grooming', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
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
        support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to show crisis support resources (default: high). Critical always shows.'),
                verdict_only: z.boolean().optional().describe('Fast mode. Skips generating the rationale, the only free-text field this endpoint produces. Lower latency and a smaller response; the verdict itself is unchanged.'),
        ...trackingSchema,
      },
      _meta: uiMeta('Shows unsafe content detection results', 'Analyzing content for safety concerns...', 'Safety analysis complete.'),
    },
    async ({ content, context, support_threshold, verdict_only, external_id, customer_id, metadata, incident_moderation_enabled }) => {
      try {
        const result = await client.detectUnsafe({
          content,
          context: context as Record<string, string> | undefined,
          supportThreshold: support_threshold,
          verdictOnly: verdict_only,
          external_id,
          customer_id,
          metadata,
          incident_moderation_enabled,
        });

        const emoji = severityEmoji[result.severity] || '\u26AA';
        let text = `## ${result.unsafe ? '\u26A0\uFE0F Unsafe Content Detected' : '\u2705 Content is Safe'}

**Severity:** ${emoji} ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

${result.unsafe ? `**Categories:**\n${result.categories.map(c => `- \u26A0\uFE0F ${c}`).join('\n')}` : ''}

${formatRationale(result)}

### Recommended Action
\`${result.recommended_action}\``;

        if (result.support) text += formatSupportText(result.support, harmSignals(result, 'detect_unsafe'));

        return withViewId({
          structuredContent: { toolName: 'detect_unsafe', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
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
        let text = `## Safety Analysis Results

**Overall Risk:** ${emoji} ${result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)}
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%
**Confidence:** ${(result.confidence * 100).toFixed(0)}%

### Summary
${result.summary}

### Recommended Action
\`${result.recommended_action}\`

---
${result.bullying ? `\n**Bullying Check:** ${result.bullying.is_bullying ? '\u26A0\uFE0F Detected' : '\u2705 Clear'}\n` : ''}${result.unsafe ? `\n**Unsafe Content:** ${result.unsafe.unsafe ? '\u26A0\uFE0F Detected' : '\u2705 Clear'}\n` : ''}`;

        // Show support resources from the unsafe sub-result if available
        if (result.unsafe?.support) {
          text += formatSupportText(result.unsafe.support, harmSignals(result.unsafe, 'detect_unsafe'));
        }

        return withViewId({
          structuredContent: { toolName: 'analyze', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyze', 'Safety Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );
}
