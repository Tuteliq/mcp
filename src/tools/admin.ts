import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tuteliq, WebhookEventType, ConsentType, AuditAction, BreachSeverity, BreachStatus, BreachNotificationStatus } from '@tuteliq/sdk';
import { severityEmoji } from '../formatters.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;
const ADDITIVE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: true } as const;

export function registerAdminTools(server: McpServer, client: Tuteliq): void {

  // =========================================================================
  // Webhook Management
  // =========================================================================

  server.registerTool(
    'list_webhooks',
    {
      title: 'List Webhooks',
      description: 'List all webhooks configured for your account.',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      const result = await client.listWebhooks();
      if (result.webhooks.length === 0) {
        return { content: [{ type: 'text', text: 'No webhooks configured.' }] };
      }
      const lines = result.webhooks.map(w =>
        `- ${w.is_active ? '\u{1F7E2}' : '⚪'} **${w.name}** — \`${w.url}\`\n  Events: ${w.events.join(', ')} _(${w.id})_`
      ).join('\n');
      return { content: [{ type: 'text', text: `## Webhooks\n\n${lines}` }] };
    },
  );

  server.registerTool(
    'create_webhook',
    {
      title: 'Create Webhook',
      description: 'Create a new webhook endpoint.',
      annotations: ADDITIVE,
      inputSchema: {
        name: z.string().describe('Display name for the webhook'),
        url: z.string().describe('HTTPS URL to receive webhook payloads'),
        events: z.array(z.string()).describe('Event types to subscribe to'),
      },
    },
    async ({ name, url, events }) => {
      const result = await client.createWebhook({
        name,
        url,
        events: events as WebhookEventType[],
      });
      return { content: [{ type: 'text', text: `## ✅ Webhook Created\n\n**ID:** ${result.id}\n**Name:** ${result.name}\n**URL:** ${result.url}\n**Events:** ${result.events.join(', ')}\n\n⚠️ **Secret (save this — shown only once):**\n\`${result.secret}\`` }] };
    },
  );

  server.registerTool(
    'update_webhook',
    {
      title: 'Update Webhook',
      description: 'Update an existing webhook configuration.',
      annotations: DESTRUCTIVE,
      inputSchema: {
        id: z.string().describe('Webhook ID'),
        name: z.string().optional().describe('New display name'),
        url: z.string().optional().describe('New HTTPS URL'),
        events: z.array(z.string()).optional().describe('New event subscriptions'),
        is_active: z.boolean().optional().describe('Enable or disable the webhook'),
      },
    },
    async ({ id, name, url, events, is_active }) => {
      const result = await client.updateWebhook(id, {
        name,
        url,
        events: events as WebhookEventType[] | undefined,
        isActive: is_active,
      });
      return { content: [{ type: 'text', text: `## ✅ Webhook Updated\n\n**ID:** ${result.id}\n**Name:** ${result.name}\n**Active:** ${result.is_active ? '\u{1F7E2} Yes' : '⚪ No'}` }] };
    },
  );

  server.registerTool(
    'delete_webhook',
    {
      title: 'Delete Webhook',
      description: 'Permanently delete a webhook.',
      annotations: DESTRUCTIVE,
      inputSchema: { id: z.string().describe('Webhook ID to delete') },
    },
    async ({ id }) => {
      await client.deleteWebhook(id);
      return { content: [{ type: 'text', text: `## ✅ Webhook Deleted\n\nWebhook \`${id}\` has been permanently deleted.` }] };
    },
  );

  server.registerTool(
    'test_webhook',
    {
      title: 'Test Webhook',
      description: 'Send a test payload to a webhook to verify it is working correctly.',
      annotations: ADDITIVE,
      inputSchema: { id: z.string().describe('Webhook ID to test') },
    },
    async ({ id }) => {
      const result = await client.testWebhook(id);
      return { content: [{ type: 'text', text: `## ${result.success ? '✅' : '❌'} Webhook Test\n\n**Success:** ${result.success}\n**Status Code:** ${result.status_code}\n**Latency:** ${result.latency_ms}ms${result.error ? `\n**Error:** ${result.error}` : ''}` }] };
    },
  );

  server.registerTool(
    'regenerate_webhook_secret',
    {
      title: 'Regenerate Webhook Secret',
      description: 'Regenerate a webhook signing secret. Invalidates the previous secret immediately.',
      annotations: DESTRUCTIVE,
      inputSchema: { id: z.string().describe('Webhook ID') },
    },
    async ({ id }) => {
      const result = await client.regenerateWebhookSecret(id);
      return { content: [{ type: 'text', text: `## ✅ Secret Regenerated\n\nThe old secret has been invalidated.\n\n⚠️ **New Secret (save this — shown only once):**\n\`${result.secret}\`` }] };
    },
  );

  // =========================================================================
  // Pricing
  // =========================================================================

  server.registerTool(
    'get_pricing',
    {
      title: 'Pricing Plans',
      description: 'Get available pricing plans for Tuteliq.',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      const result = await client.getPricing();
      const lines = result.plans.map(p =>
        `### ${p.name}\n**Price:** ${p.price}\n${p.features.map(f => `- ${f}`).join('\n')}`
      ).join('\n\n');
      return { content: [{ type: 'text', text: `## Tuteliq Pricing\n\n${lines}` }] };
    },
  );

  server.registerTool(
    'get_pricing_details',
    {
      title: 'Pricing Details',
      description: 'Get detailed pricing plans with features, limits, and rate caps.',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      const result = await client.getPricingDetails();
      // -1 is the internal sentinel for "unlimited / custom" (used on the
      // Enterprise tier). Render it as "Custom" rather than echoing the
      // sentinel verbatim, which previously surfaced as "Monthly: -1/mo".
      const fmtMoney = (n: number | undefined | null) =>
        n == null ? '—' : n === -1 ? 'Custom' : n === 0 ? 'Free' : `$${n}`;
      const fmtCount = (n: number | undefined | null) =>
        n == null ? '—' : n === -1 ? 'Unlimited' : n.toLocaleString();
      const lines = result.plans.map(p =>
        `### ${p.name}\n**Monthly:** ${fmtMoney(p.price_monthly)} | **Yearly:** ${fmtMoney(p.price_yearly)}\n**API Calls:** ${fmtCount(p.api_calls_per_month)}/mo | **Rate Limit:** ${fmtCount(p.rate_limit)}/min\n${p.features.map(f => `- ${f}`).join('\n')}`
      ).join('\n\n');
      return { content: [{ type: 'text', text: `## Tuteliq Pricing Details\n\n${lines}` }] };
    },
  );

  // =========================================================================
  // Usage & Billing
  // =========================================================================

  server.registerTool(
    'get_usage_history',
    {
      title: 'Usage History',
      description: 'Get daily usage history for the past N days.',
      annotations: READ_ONLY,
      inputSchema: { days: z.number().optional().describe('Number of days to retrieve (1-30, default: 7)') },
    },
    async ({ days }) => {
      const result = await client.getUsageHistory(days);
      if (result.days.length === 0) {
        return { content: [{ type: 'text', text: 'No usage data available.' }] };
      }
      const lines = result.days.map(d =>
        `| ${d.date} | ${d.total_requests} | ${d.success_requests} | ${d.error_requests} |`
      ).join('\n');
      return { content: [{ type: 'text', text: `## Usage History\n\n| Date | Total | Success | Errors |\n|------|-------|---------|--------|\n${lines}` }] };
    },
  );

  server.registerTool(
    'get_usage_by_tool',
    {
      title: 'Usage by Tool',
      description: 'Get usage broken down by tool/endpoint for a specific date.',
      annotations: READ_ONLY,
      inputSchema: { date: z.string().optional().describe('Date in YYYY-MM-DD format (default: today)') },
    },
    async ({ date }) => {
      const result = await client.getUsageByTool(date);
      const toolLines = Object.entries(result.tools).map(([tool, count]) => `- **${tool}:** ${count}`).join('\n');
      const endpointLines = Object.entries(result.endpoints).map(([ep, count]) => `- **${ep}:** ${count}`).join('\n');
      return { content: [{ type: 'text', text: `## Usage by Tool — ${result.date}\n\n### By Tool\n${toolLines || '_No data_'}\n\n### By Endpoint\n${endpointLines || '_No data_'}` }] };
    },
  );

  server.registerTool(
    'get_usage_monthly',
    {
      title: 'Monthly Usage',
      description: 'Get monthly usage summary with billing-period totals and remaining quota.',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      const result = await client.getUsageMonthly();
      const text = `## Monthly Usage

**Tier:** ${result.tier_display_name}
**Billing Period:** ${result.billing.current_period_start} → ${result.billing.current_period_end} (${result.billing.days_remaining} days left)

### Usage
**Used:** ${result.usage.used} / ${result.usage.limit} (${result.usage.percent_used.toFixed(1)}%)
**Remaining:** ${result.usage.remaining}
**Rate Limit:** ${result.rate_limit.requests_per_minute}/min

${result.recommendations ? `### Recommendation\n${result.recommendations.reason}\n**Suggested Tier:** ${result.recommendations.suggested_tier}\n[Upgrade](${result.recommendations.upgrade_url})` : ''}`;
      return { content: [{ type: 'text', text }] };
    },
  );

  // =========================================================================
  // GDPR Account
  // =========================================================================

  server.registerTool(
    'delete_account_data',
    {
      title: 'Delete Account Data',
      description: 'Delete all account data (GDPR Right to Erasure). This is irreversible.',
      annotations: DESTRUCTIVE,
      inputSchema: {},
    },
    async () => {
      const result = await client.deleteAccountData();
      return { content: [{ type: 'text', text: `## ✅ Account Data Deleted\n\n**Message:** ${result.message}\n**Records Deleted:** ${result.deleted_count}` }] };
    },
  );

  server.registerTool(
    'export_account_data',
    {
      title: 'Export Account Data',
      description: 'Export all account data as JSON (GDPR Data Portability).',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      const result = await client.exportAccountData();
      const collections = Object.keys(result.data).join(', ');
      return { content: [{ type: 'text', text: `## \u{1F4E6} Account Data Export\n\n**User ID:** ${result.userId}\n**Exported At:** ${result.exportedAt}\n**Collections:** ${collections}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2).slice(0, 5000)}\n\`\`\`` }] };
    },
  );

  const consentTypeEnum = z.enum(['data_processing', 'analytics', 'marketing', 'third_party_sharing', 'child_safety_monitoring']);

  server.registerTool(
    'record_consent',
    {
      title: 'Record Consent',
      description: 'Record user consent for data processing (GDPR Article 7).',
      annotations: ADDITIVE,
      inputSchema: {
        consent_type: consentTypeEnum.describe('Type of consent to record'),
        version: z.string().describe('Policy version the user is consenting to'),
      },
    },
    async ({ consent_type, version }) => {
      const result = await client.recordConsent({ consent_type: consent_type as ConsentType, version });
      return { content: [{ type: 'text', text: `## ✅ Consent Recorded\n\n**Type:** ${result.consent.consent_type}\n**Status:** ${result.consent.status}\n**Version:** ${result.consent.version}` }] };
    },
  );

  server.registerTool(
    'get_consent_status',
    {
      title: 'Consent Status',
      description: 'Get current consent status, optionally filtered by consent type.',
      annotations: READ_ONLY,
      inputSchema: { type: consentTypeEnum.optional().describe('Optional: filter by consent type') },
    },
    async ({ type }) => {
      const result = await client.getConsentStatus(type as ConsentType | undefined);
      if (result.consents.length === 0) {
        return { content: [{ type: 'text', text: 'No consent records found.' }] };
      }
      const lines = result.consents.map(c =>
        `- **${c.consent_type}**: ${c.status === 'granted' ? '✅' : '❌'} ${c.status} (v${c.version})`
      ).join('\n');
      return { content: [{ type: 'text', text: `## Consent Status\n\n${lines}` }] };
    },
  );

  server.registerTool(
    'withdraw_consent',
    {
      title: 'Withdraw Consent',
      description: 'Withdraw a previously granted consent.',
      annotations: DESTRUCTIVE,
      inputSchema: { type: consentTypeEnum.describe('Type of consent to withdraw') },
    },
    async ({ type }) => {
      const result = await client.withdrawConsent(type as ConsentType);
      return { content: [{ type: 'text', text: `## ⚠️ Consent Withdrawn\n\n**Type:** ${result.consent.consent_type}\n**Status:** ${result.consent.status}` }] };
    },
  );

  server.registerTool(
    'rectify_data',
    {
      title: 'Rectify Data',
      description: 'Rectify (correct) user data (GDPR Right to Rectification). Overwrites existing field values.',
      annotations: DESTRUCTIVE,
      inputSchema: {
        collection: z.string().describe('Collection name'),
        document_id: z.string().describe('Document ID to rectify'),
        fields: z.record(z.string(), z.unknown()).describe('Fields to update'),
      },
    },
    async ({ collection, document_id, fields }) => {
      const result = await client.rectifyData({ collection, document_id, fields: fields as Record<string, unknown> });
      return { content: [{ type: 'text', text: `## ✅ Data Rectified\n\n**Message:** ${result.message}\n**Updated Fields:** ${result.updated_fields.join(', ')}` }] };
    },
  );

  server.registerTool(
    'get_audit_logs',
    {
      title: 'Audit Logs',
      description: 'Get audit trail of data operations.',
      annotations: READ_ONLY,
      inputSchema: {
        action: z.enum(['data_access', 'data_export', 'data_deletion', 'data_rectification', 'consent_granted', 'consent_withdrawn', 'breach_notification']).optional().describe('Filter by action type'),
        limit: z.number().optional().describe('Maximum number of results'),
      },
    },
    async ({ action, limit }) => {
      const result = await client.getAuditLogs({ action: action as AuditAction | undefined, limit });
      if (result.audit_logs.length === 0) {
        return { content: [{ type: 'text', text: 'No audit logs found.' }] };
      }
      const logLines = result.audit_logs.map(l =>
        `- \`${l.created_at}\` **${l.action}** _(${l.id})_`
      ).join('\n');
      return { content: [{ type: 'text', text: `## \u{1F4CB} Audit Logs\n\n${logLines}` }] };
    },
  );

  // =========================================================================
  // Breach Management
  // =========================================================================

  server.registerTool(
    'log_breach',
    {
      title: 'Log Data Breach',
      description: 'Log a new data breach (GDPR Article 33/34). Starts the 72-hour notification clock.',
      annotations: ADDITIVE,
      inputSchema: {
        title: z.string().describe('Brief title of the breach'),
        description: z.string().describe('Detailed description'),
        severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Breach severity'),
        affected_user_ids: z.array(z.string()).describe('List of affected user IDs'),
        data_categories: z.array(z.string()).describe('Categories of data affected'),
        reported_by: z.string().describe('Who reported the breach'),
      },
    },
    async ({ title, description, severity, affected_user_ids, data_categories, reported_by }) => {
      const result = await client.logBreach({
        title,
        description,
        severity: severity as BreachSeverity,
        affected_user_ids,
        data_categories,
        reported_by,
      });
      const b = result.breach;
      return { content: [{ type: 'text', text: `## ⚠️ Breach Logged\n\n**ID:** ${b.id}\n**Title:** ${b.title}\n**Severity:** ${severityEmoji[b.severity] || '⚪'} ${b.severity}\n**Status:** ${b.status}\n**Notification Deadline:** ${b.notification_deadline}\n**Affected Users:** ${b.affected_user_ids.length}\n**Data Categories:** ${b.data_categories.join(', ')}` }] };
    },
  );

  const breachStatusEnum = z.enum(['detected', 'investigating', 'contained', 'reported', 'resolved']);

  server.registerTool(
    'list_breaches',
    {
      title: 'List Data Breaches',
      description: 'List all data breaches, optionally filtered by status.',
      annotations: READ_ONLY,
      inputSchema: {
        status: breachStatusEnum.optional().describe('Filter by status'),
        limit: z.number().optional().describe('Maximum number of results'),
      },
    },
    async ({ status, limit }) => {
      const result = await client.listBreaches({ status: status as BreachStatus | undefined, limit });
      if (result.breaches.length === 0) {
        return { content: [{ type: 'text', text: 'No breaches found.' }] };
      }
      const breachLines = result.breaches.map(b =>
        `- ${severityEmoji[b.severity] || '⚪'} **${b.title}** — ${b.status} _(${b.id})_`
      ).join('\n');
      return { content: [{ type: 'text', text: `## Data Breaches\n\n${breachLines}` }] };
    },
  );

  server.registerTool(
    'get_breach',
    {
      title: 'Data Breach Details',
      description: 'Get details of a specific data breach.',
      annotations: READ_ONLY,
      inputSchema: { id: z.string().describe('Breach ID') },
    },
    async ({ id }) => {
      const result = await client.getBreach(id);
      const b = result.breach;
      return { content: [{ type: 'text', text: `## Breach Details\n\n**ID:** ${b.id}\n**Title:** ${b.title}\n**Severity:** ${severityEmoji[b.severity] || '⚪'} ${b.severity}\n**Status:** ${b.status}\n**Notification:** ${b.notification_status}\n**Reported By:** ${b.reported_by}\n**Deadline:** ${b.notification_deadline}\n**Created:** ${b.created_at}\n**Updated:** ${b.updated_at}\n\n### Description\n${b.description}\n\n**Affected Users:** ${b.affected_user_ids.join(', ')}\n**Data Categories:** ${b.data_categories.join(', ')}` }] };
    },
  );

  server.registerTool(
    'update_breach_status',
    {
      title: 'Update Breach Status',
      description: 'Update a breach status and notification progress.',
      annotations: DESTRUCTIVE,
      inputSchema: {
        id: z.string().describe('Breach ID'),
        status: breachStatusEnum.describe('New breach status'),
        notification_status: z.enum(['pending', 'users_notified', 'dpa_notified', 'completed']).optional().describe('Notification progress'),
        notes: z.string().optional().describe('Additional notes'),
      },
    },
    async ({ id, status, notification_status, notes }) => {
      const result = await client.updateBreachStatus(id, {
        status: status as BreachStatus,
        notification_status: notification_status as BreachNotificationStatus | undefined,
        notes,
      });
      const b = result.breach;
      return { content: [{ type: 'text', text: `## ✅ Breach Updated\n\n**ID:** ${b.id}\n**Status:** ${b.status}\n**Notification:** ${b.notification_status}` }] };
    },
  );
}
