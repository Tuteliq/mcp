import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq, ContextInput } from '@tuteliq/sdk';
import { formatDetectionResult } from '../formatters.js';
import { withViewId } from '../view-id.js';
import { widgetUri } from '../widget-uri.js';

const DETECTION_WIDGET_URI = widgetUri('detection-result');

interface FraudToolDef {
  name: string;
  title: string;
  description: string;
  method: string;
  invoking: string;
  invoked: string;
  /**
   * True for the endpoints that maintain conversation state and issue a
   * `continuation_token` back (coercive-control, vulnerability-exploitation,
   * distress-signals). Only those get the multi-turn inputs — advertising
   * `continuation_token` on an endpoint that never returns one would be a
   * promise the tool cannot keep.
   */
  conversational?: boolean;
  /**
   * Set on a retained alias: the tool name callers should move to. Kept listed
   * rather than deleted because removing a tool breaks every integration
   * already calling it and this server is on a minor version — but the notice
   * now appears on the result as well as in the description, so it cannot be
   * missed by a caller who never reads tool metadata.
   */
  deprecatedFor?: string;
}

/**
 * Appended to every fraud tool's description, since context.priorMessages is
 * accepted uniformly by fraudContextSchema below -- unlike continuation_token
 * (CONTINUATION_NOTE), which only the `conversational` subset issues back.
 */
const PRIOR_MESSAGES_NOTE =
  ' Already have the whole conversation in hand? Pass `context.priorMessages`'
  + ' (oldest first, `{ role, text, timestamp? }`) to see it in one call --'
  + ' request-scoped, never stored server-side.';

/** Appended to the description of every tool that supports multi-turn state. */
const CONTINUATION_NOTE =
  ' Multi-turn: every result ends with a "Conversation state" section containing a `continuation_token` —'
  + ' pass that exact string back as `continuation_token` on the next call to carry trajectory awareness'
  + ' forward. No message content is stored server-side; the token is the state.'
  + ' `risk_score` scores only the content in this call; from the second turn onward the result also carries'
  + ' a "Conversation risk" section with `trajectory_risk` (0-1 for the conversation), `trajectory`'
  + ' (rising/stable/declining/none) and `severity_series` (per-turn severity, oldest first). A calm turn'
  + ' after an escalation scores low on its own and high as a conversation — act on the higher of the two.';

const FRAUD_TOOLS: FraudToolDef[] = [
  {
    name: 'detect_social_engineering',
    title: 'Detect Social Engineering',
    description: 'Detect social engineering tactics such as pretexting, urgency fabrication, trust exploitation, and authority impersonation in text content.',
    method: 'detectSocialEngineering',
    invoking: 'Analyzing for social engineering tactics...',
    invoked: 'Social engineering analysis complete.',
  },
  {
    name: 'detect_app_fraud',
    title: 'Detect App Fraud',
    description: 'Detect app-based fraud patterns such as fake investment platforms, phishing apps, subscription traps, and malicious download links.',
    method: 'detectAppFraud',
    invoking: 'Analyzing for app fraud patterns...',
    invoked: 'App fraud analysis complete.',
  },
  {
    name: 'detect_romance_scam',
    title: 'Detect Romance Scam',
    description: 'Detect romance scam patterns such as love-bombing, financial requests, identity deception, and emotional manipulation in conversations.',
    method: 'detectRomanceScam',
    invoking: 'Analyzing for romance scam patterns...',
    invoked: 'Romance scam analysis complete.',
  },
  {
    name: 'detect_mule_recruitment',
    title: 'Detect Mule Recruitment',
    description: 'Detect money mule recruitment tactics such as easy-money offers, bank account sharing requests, and laundering facilitation.',
    method: 'detectMuleRecruitment',
    invoking: 'Analyzing for mule recruitment tactics...',
    invoked: 'Mule recruitment analysis complete.',
  },
  {
    name: 'detect_gambling_harm',
    title: 'Detect Gambling Harm',
    description: 'Detect gambling-related harm indicators such as chasing losses, borrowing to gamble, concealment behavior, and emotional distress from gambling.',
    method: 'detectGamblingHarm',
    invoking: 'Analyzing for gambling harm indicators...',
    invoked: 'Gambling harm analysis complete.',
  },
  {
    name: 'detect_coercive_control',
    title: 'Detect Coercive Control',
    description: 'Detect coercive control patterns such as isolation tactics, financial control, monitoring behavior, threats, and emotional manipulation.',
    method: 'detectCoerciveControl',
    invoking: 'Analyzing for coercive control patterns...',
    invoked: 'Coercive control analysis complete.',
    conversational: true,
  },
  {
    name: 'detect_vulnerability_exploitation',
    title: 'Detect Vulnerability Exploitation',
    description: 'Detect exploitation of vulnerable individuals including targeting the elderly, disabled, financially distressed, or emotionally vulnerable.',
    method: 'detectVulnerabilityExploitation',
    invoking: 'Analyzing for vulnerability exploitation...',
    invoked: 'Vulnerability exploitation analysis complete.',
    conversational: true,
  },
  {
    name: 'detect_radicalisation',
    title: 'Detect Radicalisation',
    description: 'Detect radicalisation indicators such as extremist rhetoric, us-vs-them framing, calls to action, conspiracy narratives, and ideological grooming.',
    method: 'detectRadicalisation',
    invoking: 'Analyzing for radicalisation indicators...',
    invoked: 'Radicalisation analysis complete.',
  },
  {
    name: 'detect_distress_signals',
    title: 'Detect Distress Signals',
    description: 'Detect linguistic distress-signal patterns (loneliness expressions, isolation language, hopelessness phrases, trust-seeking openers, withdrawal references). Returns pattern detections and downstream exploitation-risk assessment. Frames the analysis as content classification, NOT inner-state emotion inference (relevant under EU AI Act Art 5(1)(f) when deployed in workplace or education contexts).',
    method: 'detectDistressSignals',
    invoking: 'Analyzing for distress-signal patterns...',
    invoked: 'Distress-signals analysis complete.',
    conversational: true,
  },
  {
    name: 'detect_emotional_distress',
    title: 'DEPRECATED — use detect_distress_signals',
    description: 'DEPRECATED ALIAS — DO NOT USE FOR NEW WORK. Call `detect_distress_signals` instead: identical behaviour, identical backing endpoint (/safety/distress-signals), and it also supports multi-turn `continuation_token`, which this alias does not. Retained only so existing integrations keep working; it will be removed in the next major version.',
    method: 'detectDistressSignals',
    invoking: 'Analyzing for distress-signal patterns...',
    invoked: 'Distress-signals analysis complete.',
    deprecatedFor: 'detect_distress_signals',
  },
  {
    name: 'detect_tfgbv',
    title: 'Detect Tech-Facilitated Gender-Based Violence',
    description: 'Detect tech-facilitated gender-based violence (TFGBV) including image-based abuse, cyber stalking, online harassment, doxing, outing, post-separation abuse, digital coercion, and sexualised deepfakes.',
    method: 'detectTFGBV',
    invoking: 'Analyzing for tech-facilitated gender-based violence...',
    invoked: 'TFGBV analysis complete.',
  },
];

/**
 * Analysis context.
 *
 * This used to be a bare `z.record()`, which accepted `country` but never
 * advertised it — so a caller asking for Swedish helplines had no way to know
 * the key existed, and the block came back localised to the account default.
 * Naming the fields is the fix; the passthrough keeps any other key working.
 */
const fraudContextSchema = z.object({
  language: z.string().optional().describe('Language code (e.g., "en"). Auto-detected if omitted.'),
  ageGroup: z.string().optional().describe('Age group (e.g., "13-15")'),
  platform: z.string().optional().describe('Platform name (e.g., "Discord", "Telegram")'),
  country: z.string().optional().describe('ISO 3166-1 alpha-2 country code (e.g., "GB", "US", "SE"). Localises the crisis helplines returned with a positive result.'),
  // Request-scoped: never stored server-side, used once to build the
  // analysis prompt for this call and then discarded. Independent of
  // continuation_token (below) -- carries state WITHIN one call instead of
  // across separate calls. Supported by every fraud tool, not just the
  // `conversational` subset that also issues a continuation_token.
  priorMessages: z.array(z.object({
    role: z.string(),
    text: z.string(),
    timestamp: z.string().optional(),
  })).optional().describe('Prior turns of this conversation, oldest first, submitted for this request only -- not stored server-side. Lets a single call see the trajectory a gradually-building risk needs.'),
}).passthrough().optional().describe('Optional analysis context');

const fraudInputSchema = {
  content: z.string().describe('Text content to analyze'),
  context: fraudContextSchema,
  include_evidence: z.boolean().optional().describe('Include supporting evidence excerpts'),
  support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to show crisis support resources (default: high). Critical always shows.'),
  external_id: z.string().optional().describe('External tracking ID'),
  customer_id: z.string().optional().describe('Customer identifier'),
};

/** Extra inputs for the endpoints that carry conversation state. */
const continuationInputSchema = {
  continuation_token: z.string().optional().describe('Opaque signed token returned by a prior call to this same tool. Pass it back to maintain multi-turn trajectory awareness without server-side content storage. Each result includes a fresh token for the next call.'),
  reset_conversation: z.boolean().optional().describe('If true, discard any continuation_token and analyze this content as a fresh conversation.'),
};

const conversationalInputSchema = { ...fraudInputSchema, ...continuationInputSchema };

export function registerFraudTools(server: McpServer, client: Tuteliq): void {
  for (const tool of FRAUD_TOOLS) {
    registerAppTool(
      server,
      tool.name,
      {
        title: tool.title,
        description: tool.description + PRIOR_MESSAGES_NOTE + (tool.conversational ? CONTINUATION_NOTE : ''),
        annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
        // Only the conversational tools advertise the continuation inputs; the
        // cast keeps one handler signature for both shapes, and the fields are
        // simply absent (undefined) on the tools that never accept them.
        inputSchema: (tool.conversational
          ? conversationalInputSchema
          : fraudInputSchema) as typeof conversationalInputSchema,
        _meta: {
          ui: { resourceUri: DETECTION_WIDGET_URI },
        },
      },
      async ({ content, context, include_evidence, support_threshold, external_id, customer_id, continuation_token, reset_conversation }) => {
        try {
          const fn = (client as any)[tool.method].bind(client);
          const result = await fn({
            content,
            context: context as ContextInput | undefined,
            includeEvidence: include_evidence,
            supportThreshold: support_threshold,
            external_id,
            customer_id,
            ...(tool.conversational && {
              continuationToken: continuation_token,
              resetConversation: reset_conversation,
            }),
          });

          const body = formatDetectionResult(result, tool.name);
          // A deprecation that only lives in the tool description is read once,
          // at registration, and never again. Put it on the result too.
          const text = tool.deprecatedFor
            ? `> ⚠️ \`${tool.name}\` is deprecated and will be removed in the next major version. Use \`${tool.deprecatedFor}\` instead — same endpoint, same result.\n\n${body}`
            : body;

          return withViewId({
            structuredContent: { toolName: tool.name, result, branding: { appName: 'Tuteliq' } },
            content: [{ type: 'text' as const, text }],
          });
        } catch (err: any) {
          if (err?.status === 403 || err?.response?.status === 403) {
            const upsellResult = {
              error: 'tier_restricted',
              tier_restricted: true,
              upgrade: true,
              message: `Your current plan does not include ${tool.title.toLowerCase()}. Upgrade your plan or purchase additional credits to unlock this feature.`,
            };
            return {
              structuredContent: { toolName: tool.name, result: upsellResult, branding: { appName: 'Tuteliq' } },
              content: [{ type: 'text' as const, text: `⚠️ ${upsellResult.message}\n\nUpgrade at: https://tuteliq.ai/dashboard` }],
            };
          }
          throw err;
        }
      },
    );
  }
}
