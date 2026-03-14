import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const KOSA_CATEGORIES = `# KOSA Harm Categories

Tuteliq detects content across nine categories defined by the Kids Online Safety Act (KOSA):

1. **Self-Harm & Suicidal Ideation** — Crisis language, passive ideation, planning indicators, self-injury references
2. **Bullying & Harassment** — Direct insults, social exclusion, intimidation, cyberstalking, identity-based attacks
3. **Sexual Exploitation** — Explicit solicitation, sextortion, inappropriate sexual content directed at minors
4. **Substance Use** — Promotion, solicitation, or normalization of drug/alcohol use toward minors
5. **Eating Disorders** — Pro-anorexia/bulimia content, body dysmorphia triggers, dangerous diet promotion
6. **Depression & Anxiety** — Persistent mood indicators, hopelessness patterns, withdrawal signals
7. **Compulsive Usage** — Engagement manipulation, addiction-pattern reinforcement, dark patterns targeting minors
8. **Violence** — Violent threats, glorification, graphic content, weapons promotion
9. **Grooming** — Trust escalation, secrecy requests, isolation attempts, boundary testing, gift/reward patterns

Each detection response includes which categories were triggered, with confidence scores per category.`;

const AGE_GROUPS = `# Age Groups & Calibration

Tuteliq adjusts severity scoring based on the child's age group. Pass \`ageGroup\` (or \`age_group\`) in the \`context\` object.

| Value | Calibration |
|-------|-------------|
| \`"under 10"\` | Highest sensitivity. Almost any exposure to harmful content is flagged at elevated severity. |
| \`"10-12"\` | High sensitivity. Distinguishes normal peer friction from targeted harassment. |
| \`"13-15"\` | Moderate sensitivity. Accounts for typical teen communication while remaining alert to genuine risk. |
| \`"16-17"\` | Adjusted sensitivity. Recognizes greater autonomy while maintaining protection against grooming, exploitation, and crisis signals. |
| \`"under 18"\` | Default bracket when specific age is unknown. Uses protective defaults. |

If \`ageGroup\` is omitted, Tuteliq defaults to the most protective bracket.

The response includes an \`age_calibration\` object showing: \`applied\` (boolean), \`age_group\` (string), \`multiplier\` (number).`;

const CREDIT_COSTS = `# Credit Costs Per Endpoint

| Endpoint | Credits |
|----------|---------|
| detect_unsafe | 1 |
| detect_bullying | 1 |
| detect_grooming | 1 |
| detect_social_engineering | 1 |
| detect_app_fraud | 1 |
| detect_romance_scam | 1 |
| detect_mule_recruitment | 1 |
| detect_gambling_harm | 1 |
| detect_coercive_control | 1 |
| detect_vulnerability_exploitation | 1 |
| detect_radicalisation | 1 |
| analyse_multi | Sum of individual endpoints |
| analyze_voice | 3 |
| analyze_image | 3 |
| analyze_video | 10 |
| analyze_emotions | 1 |
| get_action_plan | 1 |
| generate_report | 2 |
| age_verification | 5 |
| identity_verification | 10 |`;

const CONTEXT_FIELDS = `# Context Fields Reference

Pass a \`context\` object with any detection tool to improve accuracy.

| Field | Type | Description |
|-------|------|-------------|
| \`ageGroup\` / \`age_group\` | string | Age bracket for calibrated scoring: \`"under 10"\`, \`"10-12"\`, \`"13-15"\`, \`"16-17"\`, \`"under 18"\` |
| \`language\` | string | ISO 639-1 code (e.g. \`"en"\`, \`"de"\`, \`"sv"\`). Auto-detected if omitted. 27 languages supported. |
| \`platform\` | string | Platform name (e.g. \`"Discord"\`, \`"Roblox"\`, \`"WhatsApp"\`). Adjusts for platform-specific norms and slang. |
| \`conversation_history\` | array | Prior messages for context-aware analysis. Each entry: \`{ sender: string, content: string }\`. Returns per-message \`message_analysis\`. |
| \`sender_trust\` | string | \`"verified"\`, \`"trusted"\`, or \`"unknown"\`. When \`"verified"\`, AUTH_IMPERSONATION is fully suppressed. |
| \`sender_name\` | string | Sender identifier. Used with \`sender_trust\` for impersonation scoring. |

## Common Parameters (all detection tools)

| Parameter | Type | Description |
|-----------|------|-------------|
| \`content\` | string | **Required.** The text to analyze. |
| \`context\` | object | Optional context object (see above). |
| \`include_evidence\` | boolean | When \`true\`, returns flagged phrases with tactic labels and weights. |
| \`support_threshold\` | string | Minimum severity to include crisis helplines: \`"low"\`, \`"medium"\`, \`"high"\` (default), \`"critical"\`. Critical severity always includes support resources. |
| \`external_id\` | string | Your external tracking ID (echoed in response). |
| \`customer_id\` | string | Your customer identifier (echoed in response). |

## analyse_multi Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| \`content\` | string | **Required.** Text to analyze. |
| \`endpoints\` | string[] | **Required.** Endpoint IDs to run. Valid values: \`bullying\`, \`grooming\`, \`unsafe\`, \`social-engineering\`, \`app-fraud\`, \`romance-scam\`, \`mule-recruitment\`, \`gambling-harm\`, \`coercive-control\`, \`vulnerability-exploitation\`, \`radicalisation\` |
| \`context\` | object | Optional context object. |
| \`include_evidence\` | boolean | Include evidence in each result. |
| \`support_threshold\` | string | Crisis helpline threshold. |`;

const DOCUMENTATION = `# Tuteliq MCP — Quick Reference

## What is Tuteliq?
Tuteliq is a child safety API that detects grooming, bullying, self-harm, fraud, radicalisation, and 10+ other harms across text, voice, image, and video. Sub-400ms response times. Zero data retention. KOSA, COPPA, and DSA compliant.

## Full Documentation
- API Reference: https://docs.tuteliq.ai/api-reference/introduction
- How It Works: https://docs.tuteliq.ai/how-it-works
- MCP Setup: https://docs.tuteliq.ai/sdks/mcp
- Language Support: https://docs.tuteliq.ai/languages
- KOSA Compliance: https://docs.tuteliq.ai/kosa-compliance

## Detection Response Shape
All detection tools return:
- \`detected\` (boolean) — whether harmful content was found
- \`level\` (string) — \`"none"\`, \`"low"\`, \`"medium"\`, \`"high"\`, or \`"critical"\`
- \`risk_score\` (float, 0.0–1.0) — granular score for threshold automation
- \`confidence\` (float, 0.0–1.0) — model confidence
- \`categories\` (array) — triggered harm categories with tags, labels, and confidence
- \`evidence\` (array, when \`include_evidence: true\`) — flagged phrases with tactic and weight
- \`rationale\` (string) — human-readable explanation
- \`recommended_action\` (string) — suggested next step
- \`language\` (string) — resolved ISO 639-1 language code
- \`age_calibration\` (object) — age group applied, multiplier used
- \`support\` (object, when threshold met) — crisis helplines and guidance

## Tips for Best Results
1. Always pass \`ageGroup\` in context — it significantly affects scoring calibration
2. Use \`include_evidence: true\` to get flagged phrases with weights for audit trails
3. Use \`analyse_multi\` to run multiple classifiers in a single call (saves latency)
4. For conversations, pass \`conversation_history\` to enable multi-turn pattern detection
5. Set \`support_threshold: "low"\` to always include crisis resources in responses`;

interface ResourceDef {
  uri: string;
  name: string;
  description: string;
  content: string;
}

const RESOURCES: ResourceDef[] = [
  {
    uri: 'tuteliq://documentation',
    name: 'Tuteliq Documentation',
    description: 'Quick reference guide for Tuteliq MCP tools, response shapes, and usage tips',
    content: DOCUMENTATION,
  },
  {
    uri: 'tuteliq://context-fields',
    name: 'Context Fields & Parameters',
    description: 'Complete reference for all context fields, common parameters, and analyse_multi configuration',
    content: CONTEXT_FIELDS,
  },
  {
    uri: 'tuteliq://kosa-categories',
    name: 'KOSA Harm Categories',
    description: 'List of all nine KOSA harm categories with descriptions',
    content: KOSA_CATEGORIES,
  },
  {
    uri: 'tuteliq://age-groups',
    name: 'Age Groups & Calibration',
    description: 'Available age group brackets, their calibration, and how to use them',
    content: AGE_GROUPS,
  },
  {
    uri: 'tuteliq://credit-costs',
    name: 'Credit Costs',
    description: 'Per-endpoint credit costs for billing',
    content: CREDIT_COSTS,
  },
];

export function registerResources(server: McpServer): void {
  for (const res of RESOURCES) {
    server.resource(
      res.name,
      res.uri,
      { description: res.description, mimeType: 'text/markdown' },
      async () => ({
        contents: [{
          uri: res.uri,
          mimeType: 'text/markdown',
          text: res.content,
        }],
      }),
    );
  }
}
