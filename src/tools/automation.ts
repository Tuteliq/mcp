import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tuteliq, PolicyRule } from '@tuteliq/sdk';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;
const ADDITIVE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: true } as const;

function handleTierError(err: any, featureLabel: string) {
  if (err?.status === 403 || err?.response?.status === 403) {
    return {
      content: [{ type: 'text' as const, text: `⚠️ Your current plan does not include ${featureLabel}. Upgrade at: https://tuteliq.ai/dashboard` }],
    };
  }
  return null;
}

const ruleConditionsSchema = z.object({
  min_risk_score: z.number().min(0).max(1).optional().describe('Minimum risk score (0-1) for the rule to match'),
  min_severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity for the rule to match'),
  categories: z.array(z.string()).optional().describe('Only match these detected categories'),
  age_groups: z.array(z.string()).optional().describe('Only match these age groups'),
});

const ruleActionSchema = z.object({
  type: z.enum(['block', 'flag', 'escalate', 'notify', 'log_only']).describe('What to do when the rule matches'),
  escalate_to: z.string().optional().describe('Escalation target (e.g., email or team identifier)'),
  notify_channel: z.string().optional().describe('Notification channel (e.g., slack, email)'),
  message: z.string().optional().describe('Custom message/reason attached to the action'),
  override_severity: z.string().optional().describe('Override the detected severity'),
});

function formatRule(r: PolicyRule): string {
  const conds: string[] = [];
  if (r.conditions.min_risk_score != null) conds.push(`risk ≥ ${r.conditions.min_risk_score}`);
  if (r.conditions.min_severity) conds.push(`severity ≥ ${r.conditions.min_severity}`);
  if (r.conditions.categories?.length) conds.push(`categories: ${r.conditions.categories.join('/')}`);
  if (r.conditions.age_groups?.length) conds.push(`ages: ${r.conditions.age_groups.join('/')}`);
  return `- ${r.enabled ? '\u{1F7E2}' : '⚪'} **${r.name}** (priority ${r.priority}) — on [${r.endpoints.join(', ')}] when ${conds.join(' AND ') || 'always'} → **${r.action.type}** _(${r.id})_`;
}

export function registerAutomationTools(server: McpServer, client: Tuteliq): void {

  // =========================================================================
  // Policy Automation Rules
  // =========================================================================

  server.registerTool(
    'list_policy_rules',
    {
      title: 'List Policy Rules',
      description: 'List all policy automation rules. Rules act automatically when detection results match their conditions (block, flag, escalate, notify, or log_only).',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      const result = await client.listPolicyRules();
      if (result.rules.length === 0) {
        return { content: [{ type: 'text', text: 'No policy rules configured. Use create_policy_rule to add one.' }] };
      }
      const lines = result.rules
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .map(formatRule)
        .join('\n');
      return { content: [{ type: 'text', text: `## Policy Automation Rules\n\n${lines}` }] };
    },
  );

  server.registerTool(
    'create_policy_rule',
    {
      title: 'Create Policy Rule',
      description: 'Create a policy automation rule. When a detection result matches the conditions, the action is applied automatically — this is how obvious cases get handled without a human or agent in the loop.',
      annotations: ADDITIVE,
      inputSchema: {
        name: z.string().describe('Display name for the rule'),
        enabled: z.boolean().optional().describe('Whether the rule is active (default: true)'),
        endpoints: z.array(z.string()).min(1).describe('Detection endpoints the rule applies to (e.g., ["grooming", "bullying"])'),
        conditions: ruleConditionsSchema.describe('Conditions that must all match for the rule to fire'),
        action: ruleActionSchema.describe('Action taken on match'),
        priority: z.number().int().min(0).optional().describe('Evaluation priority, lower first (default: 0)'),
      },
    },
    async ({ name, enabled, endpoints, conditions, action, priority }) => {
      try {
        const result = await client.createPolicyRule({
          name,
          enabled: enabled ?? true,
          endpoints,
          conditions,
          action,
          priority: priority ?? 0,
        });
        return { content: [{ type: 'text', text: `## ✅ Policy Rule Created\n\n${formatRule(result.rule)}` }] };
      } catch (err: any) {
        const upsell = handleTierError(err, 'policy automation');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  server.registerTool(
    'get_policy_rule',
    {
      title: 'Get Policy Rule',
      description: 'Get the full detail of a single policy automation rule.',
      annotations: READ_ONLY,
      inputSchema: { rule_id: z.string().describe('Rule ID') },
    },
    async ({ rule_id }) => {
      const result = await client.getPolicyRule(rule_id);
      return { content: [{ type: 'text', text: `## Policy Rule\n\n${formatRule(result.rule)}\n\n\`\`\`json\n${JSON.stringify(result.rule, null, 2)}\n\`\`\`` }] };
    },
  );

  server.registerTool(
    'update_policy_rule',
    {
      title: 'Update Policy Rule',
      description: 'Update a policy automation rule. Accepts any subset of rule fields (e.g., just `enabled: false` to pause a rule).',
      annotations: DESTRUCTIVE,
      inputSchema: {
        rule_id: z.string().describe('Rule ID'),
        name: z.string().optional().describe('New display name'),
        enabled: z.boolean().optional().describe('Enable or disable the rule'),
        endpoints: z.array(z.string()).min(1).optional().describe('New endpoint list'),
        conditions: ruleConditionsSchema.optional().describe('New conditions (replaces existing)'),
        action: ruleActionSchema.optional().describe('New action (replaces existing)'),
        priority: z.number().int().min(0).optional().describe('New priority'),
      },
    },
    async ({ rule_id, name, enabled, endpoints, conditions, action, priority }) => {
      const result = await client.updatePolicyRule(rule_id, { name, enabled, endpoints, conditions, action, priority });
      return { content: [{ type: 'text', text: `## ✅ Policy Rule Updated\n\n${formatRule(result.rule)}` }] };
    },
  );

  server.registerTool(
    'delete_policy_rule',
    {
      title: 'Delete Policy Rule',
      description: 'Permanently delete a policy automation rule.',
      annotations: DESTRUCTIVE,
      inputSchema: { rule_id: z.string().describe('Rule ID to delete') },
    },
    async ({ rule_id }) => {
      const result = await client.deletePolicyRule(rule_id);
      return { content: [{ type: 'text', text: `## ✅ Policy Rule Deleted\n\n${result.message}` }] };
    },
  );

  server.registerTool(
    'evaluate_policy_rules',
    {
      title: 'Evaluate Policy Rules',
      description: 'Dry-run the account\'s policy rules against a hypothetical detection result — no real detection runs. Returns which rules matched and the winning action after priority resolution. Use this to verify a rule before relying on it.',
      annotations: READ_ONLY,
      inputSchema: {
        endpoint: z.string().describe('Detection endpoint the hypothetical result came from (e.g., "grooming")'),
        risk_score: z.number().min(0).max(1).describe('Hypothetical risk score (0-1)'),
        severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Hypothetical severity'),
        categories: z.array(z.string()).describe('Hypothetical detected categories'),
        age_group: z.string().optional().describe('Optional age group of the subject'),
      },
    },
    async ({ endpoint, risk_score, severity, categories, age_group }) => {
      const result = await client.evaluatePolicyRules({ endpoint, risk_score, severity, categories, age_group });
      const e = result.evaluation;
      const matched = e.rules_matched.length
        ? e.rules_matched.map(m => `- **${m.rule_name}** (priority ${m.priority}) → ${m.action} _(${m.rule_id})_`).join('\n')
        : '_No rules matched._';
      return { content: [{ type: 'text', text: `## Rule Evaluation\n\n**Rules Evaluated:** ${e.rules_evaluated}\n**Winning Action:** \`${e.policy_action}\`${e.applied_rule ? ` (rule ${e.applied_rule})` : ''}\n${e.policy_message ? `**Message:** ${e.policy_message}\n` : ''}\n### Matched Rules\n${matched}` }] };
    },
  );

  // =========================================================================
  // Detection Settings
  // =========================================================================

  server.registerTool(
    'get_detection_settings',
    {
      title: 'Get Detection Settings',
      description: 'Get the account\'s detection settings: which endpoints are enabled/disabled, the default context merged into detection requests, and the account-level defaults for the profanity/risk-term word-list flags.',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      const s = await client.getDetectionSettings();
      const ctx = s.default_context && Object.keys(s.default_context).length
        ? Object.entries(s.default_context).map(([k, v]) => `- **${k}:** ${v}`).join('\n')
        : '_None set._';
      return { content: [{ type: 'text', text: `## Detection Settings\n\n**Enabled:** ${s.enabled_endpoints?.join(', ') || '_all defaults_'}\n**Disabled:** ${s.disabled_endpoints?.length ? s.disabled_endpoints.join(', ') : '_none_'}\n\n### Default Context\n${ctx}\n\n### Word-List Flags\n- **default_flag_profanity:** ${s.default_flag_profanity ?? false}\n- **default_flag_risk_terms:** ${s.default_flag_risk_terms ?? false}\n\n### Available Endpoints\n${s.available_endpoints.join(', ')}` }] };
    },
  );

  server.registerTool(
    'update_detection_settings',
    {
      title: 'Update Detection Settings',
      description: 'Enable/disable detection endpoints for the account, set a default context merged into every detection request, and/or set the account-level defaults for the profanity/risk-term word-list flags (flag_profanity/flag_risk_terms on detect_bullying/detect_unsafe). Provide either enabled_endpoints OR disabled_endpoints, not both.',
      annotations: DESTRUCTIVE,
      inputSchema: {
        enabled_endpoints: z.array(z.string()).optional().describe('Endpoints to enable (mutually exclusive with disabled_endpoints)'),
        disabled_endpoints: z.array(z.string()).optional().describe('Endpoints to disable (mutually exclusive with enabled_endpoints)'),
        default_context: z.object({
          age_group: z.string().optional(),
          platform: z.string().optional(),
          country: z.string().optional(),
        }).optional().describe('Default context merged into detection requests'),
        default_flag_profanity: z.boolean().optional().describe('Account-level default for flag_profanity on detect_bullying/detect_unsafe when a call omits it. An explicit flag_profanity on the call itself always overrides this.'),
        default_flag_risk_terms: z.boolean().optional().describe('Account-level default for flag_risk_terms on detect_bullying/detect_unsafe when a call omits it. An explicit flag_risk_terms on the call itself always overrides this.'),
      },
    },
    async ({ enabled_endpoints, disabled_endpoints, default_context, default_flag_profanity, default_flag_risk_terms }) => {
      if (enabled_endpoints && disabled_endpoints) {
        return {
          content: [{ type: 'text' as const, text: '⚠️ enabled_endpoints and disabled_endpoints are mutually exclusive — provide at most one.' }],
          isError: true,
        };
      }
      const result = await client.updateDetectionSettings({ enabled_endpoints, disabled_endpoints, default_context, default_flag_profanity, default_flag_risk_terms });
      return { content: [{ type: 'text', text: `## ${result.success ? '✅ Settings Updated' : '❌ Update Failed'}\n\n${result.message}` }] };
    },
  );

  server.registerTool(
    'reset_detection_settings',
    {
      title: 'Reset Detection Settings',
      description: 'Reset detection settings to their defaults (all endpoints enabled, no default context).',
      annotations: DESTRUCTIVE,
      inputSchema: {},
    },
    async () => {
      const result = await client.resetDetectionSettings();
      return { content: [{ type: 'text', text: `## ${result.success ? '✅ Settings Reset' : '❌ Reset Failed'}\n\n${result.message}` }] };
    },
  );

  // =========================================================================
  // Threat Intelligence (Business+ tier)
  // =========================================================================

  server.registerTool(
    'get_intelligence_trends',
    {
      title: 'Threat Intelligence Trends',
      description: 'Get anonymised threat intelligence trends across the Tuteliq network — signal volumes by endpoint, category, age group, platform, and geography, plus emerging threats. Requires Business tier or higher.',
      annotations: READ_ONLY,
      inputSchema: {
        days: z.number().int().min(1).max(90).optional().describe('Window size in days (default: 30, max: 90)'),
        endpoint: z.string().optional().describe('Filter by detection endpoint (e.g., "grooming")'),
        age_group: z.string().optional().describe('Filter by age group (e.g., "under_13", "13_17")'),
        platform: z.string().optional().describe('Filter by platform (e.g., "discord", "instagram")'),
      },
    },
    async ({ days, endpoint, age_group, platform }) => {
      try {
        const result = await client.getIntelligenceTrends({ days, endpoint, age_group, platform });
        return { content: [{ type: 'text', text: `## Threat Intelligence Trends\n\n**Period:** ${result.period.start} → ${result.period.end}\n**Total Signals:** ${result.total_signals}\n\n\`\`\`json\n${JSON.stringify({ trends_by_endpoint: result.trends_by_endpoint, trends_by_category: result.trends_by_category, emerging_threats: result.emerging_threats }, null, 2).slice(0, 6000)}\n\`\`\`` }] };
      } catch (err: any) {
        const upsell = handleTierError(err, 'threat intelligence (Business+ tier)');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  server.registerTool(
    'get_emerging_threats',
    {
      title: 'Emerging Threats',
      description: 'Get emerging threat patterns detected across the Tuteliq network over a recent window. Requires Business tier or higher.',
      annotations: READ_ONLY,
      inputSchema: {
        days: z.number().int().min(1).max(90).optional().describe('Window size in days (default: 7, max: 90)'),
      },
    },
    async ({ days }) => {
      try {
        const result = await client.getEmergingThreats(days);
        const threats = result.emerging_threats.length
          ? `\`\`\`json\n${JSON.stringify(result.emerging_threats, null, 2).slice(0, 6000)}\n\`\`\``
          : '_No emerging threats in this window._';
        return { content: [{ type: 'text', text: `## Emerging Threats (last ${result.period_days} days)\n\n${threats}` }] };
      } catch (err: any) {
        const upsell = handleTierError(err, 'threat intelligence (Business+ tier)');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  server.registerTool(
    'get_weekly_digest',
    {
      title: 'Weekly Threat Digest',
      description: 'Get the weekly threat intelligence digest: narrative summary, top endpoints/categories, emerging threats, and notable changes. Ideal input for an agent producing a weekly moderation report. Requires Business tier or higher.',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      try {
        const d = await client.getWeeklyDigest();
        const changes = d.notable_changes.length ? d.notable_changes.map(c => `- ${c}`).join('\n') : '_None._';
        return { content: [{ type: 'text', text: `## Weekly Threat Digest\n\n**Period:** ${d.period.start} → ${d.period.end}\n**Total Signals:** ${d.total_signals}\n\n### Summary\n${d.summary}\n\n### Notable Changes\n${changes}\n\n\`\`\`json\n${JSON.stringify({ top_endpoints: d.top_endpoints, top_categories: d.top_categories, emerging_threats: d.emerging_threats }, null, 2).slice(0, 5000)}\n\`\`\`` }] };
      } catch (err: any) {
        const upsell = handleTierError(err, 'threat intelligence (Business+ tier)');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  server.registerTool(
    'get_risk_trends',
    {
      title: 'Risk Trends',
      description: 'Get anonymised global risk trends over a window. Requires Business tier or higher.',
      annotations: READ_ONLY,
      inputSchema: {
        days: z.number().int().min(1).max(90).optional().describe('Window size in days (default: 30, max: 90)'),
      },
    },
    async ({ days }) => {
      try {
        const result = await client.getRiskTrends(days);
        return { content: [{ type: 'text', text: `## Risk Trends\n\n\`\`\`json\n${JSON.stringify(result.trends, null, 2).slice(0, 6000)}\n\`\`\`` }] };
      } catch (err: any) {
        const upsell = handleTierError(err, 'risk trends (Business+ tier)');
        if (upsell) return upsell;
        throw err;
      }
    },
  );
}
