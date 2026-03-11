import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tuteliq, WebhookEventType, ConsentType, AuditAction, BreachSeverity, BreachStatus, BreachNotificationStatus } from '@tuteliq/sdk';
import { severityEmoji } from '../formatters.js';

export function registerAdminTools(server: McpServer, client: Tuteliq): void {

  // =========================================================================
  // Webhook Management
  // =========================================================================

  server.tool('list_webhooks', 'List all webhooks configured for your account.', {}, async () => {
    const result = await client.listWebhooks();
    if (result.webhooks.length === 0) {
      return { content: [{ type: 'text', text: 'No webhooks configured.' }] };
    }
    const lines = result.webhooks.map(w =>
      `- ${w.is_active ? '\u{1F7E2}' : '\u26AA'} **${w.name}** \u2014 \`${w.url}\`\n  Events: ${w.events.join(', ')} _(${w.id})_`
    ).join('\n');
    return { content: [{ type: 'text', text: `## Webhooks\n\n${lines}` }] };
  });

  server.tool(
    'create_webhook',
    'Create a new webhook endpoint.',
    {
      name: z.string().describe('Display name for the webhook'),
      url: z.string().describe('HTTPS URL to receive webhook payloads'),
      events: z.array(z.string()).describe('Event types to subscribe to'),
    },
    async ({ name, url, events }) => {
      const result = await client.createWebhook({
        name,
        url,
        events: events as WebhookEventType[],
      });
      return { content: [{ type: 'text', text: `## \u2705 Webhook Created\n\n**ID:** ${result.id}\n**Name:** ${result.name}\n**URL:** ${result.url}\n**Events:** ${result.events.join(', ')}\n\n\u26A0\uFE0F **Secret (save this \u2014 shown only once):**\n\`${result.secret}\`` }] };
    },
  );

  server.tool(
    'update_webhook',
    'Update an existing webhook configuration.',
    {
      id: z.string().describe('Webhook ID'),
      name: z.string().optional().describe('New display name'),
      url: z.string().optional().describe('New HTTPS URL'),
      events: z.array(z.string()).optional().describe('New event subscriptions'),
      is_active: z.boolean().optional().describe('Enable or disable the webhook'),
    },
    async ({ id, name, url, events, is_active }) => {
      const result = await client.updateWebhook(id, {
        name,
        url,
        events: events as WebhookEventType[] | undefined,
        isActive: is_active,
      });
      return { content: [{ type: 'text', text: `## \u2705 Webhook Updated\n\n**ID:** ${result.id}\n**Name:** ${result.name}\n**Active:** ${result.is_active ? '\u{1F7E2} Yes' : '\u26AA No'}` }] };
    },
  );

  server.tool(
    'delete_webhook',
    'Permanently delete a webhook.',
    { id: z.string().describe('Webhook ID to delete') },
    async ({ id }) => {
      await client.deleteWebhook(id);
      return { content: [{ type: 'text', text: `## \u2705 Webhook Deleted\n\nWebhook \`${id}\` has been permanently deleted.` }] };
    },
  );

  server.tool(
    'test_webhook',
    'Send a test payload to a webhook to verify it is working correctly.',
    { id: z.string().describe('Webhook ID to test') },
    async ({ id }) => {
      const result = await client.testWebhook(id);
      return { content: [{ type: 'text', text: `## ${result.success ? '\u2705' : '\u274C'} Webhook Test\n\n**Success:** ${result.success}\n**Status Code:** ${result.status_code}\n**Latency:** ${result.latency_ms}ms${result.error ? `\n**Error:** ${result.error}` : ''}` }] };
    },
  );

  server.tool(
    'regenerate_webhook_secret',
    'Regenerate a webhook signing secret.',
    { id: z.string().describe('Webhook ID') },
    async ({ id }) => {
      const result = await client.regenerateWebhookSecret(id);
      return { content: [{ type: 'text', text: `## \u2705 Secret Regenerated\n\nThe old secret has been invalidated.\n\n\u26A0\uFE0F **New Secret (save this \u2014 shown only once):**\n\`${result.secret}\`` }] };
    },
  );

  // =========================================================================
  // Pricing
  // =========================================================================

  server.tool('get_pricing', 'Get available pricing plans for Tuteliq.', {}, async () => {
    const result = await client.getPricing();
    const lines = result.plans.map(p =>
      `### ${p.name}\n**Price:** ${p.price}\n${p.features.map(f => `- ${f}`).join('\n')}`
    ).join('\n\n');
    return { content: [{ type: 'text', text: `## Tuteliq Pricing\n\n${lines}` }] };
  });

  server.tool('get_pricing_details', 'Get detailed pricing plans.', {}, async () => {
    const result = await client.getPricingDetails();
    const lines = result.plans.map(p =>
      `### ${p.name}\n**Monthly:** ${p.price_monthly}/mo | **Yearly:** ${p.price_yearly}/mo\n**API Calls:** ${p.api_calls_per_month}/mo | **Rate Limit:** ${p.rate_limit}/min\n${p.features.map(f => `- ${f}`).join('\n')}`
    ).join('\n\n');
    return { content: [{ type: 'text', text: `## Tuteliq Pricing Details\n\n${lines}` }] };
  });

  // =========================================================================
  // Usage & Billing
  // =========================================================================

  server.tool(
    'get_usage_history',
    'Get daily usage history for the past N days.',
    { days: z.number().optional().describe('Number of days to retrieve (1-30, default: 7)') },
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

  server.tool(
    'get_usage_by_tool',
    'Get usage broken down by tool/endpoint for a specific date.',
    { date: z.string().optional().describe('Date in YYYY-MM-DD format (default: today)') },
    async ({ date }) => {
      const result = await client.getUsageByTool(date);
      const toolLines = Object.entries(result.tools).map(([tool, count]) => `- **${tool}:** ${count}`).join('\n');
      const endpointLines = Object.entries(result.endpoints).map(([ep, count]) => `- **${ep}:** ${count}`).join('\n');
      return { content: [{ type: 'text', text: `## Usage by Tool \u2014 ${result.date}\n\n### By Tool\n${toolLines || '_No data_'}\n\n### By Endpoint\n${endpointLines || '_No data_'}` }] };
    },
  );

  server.tool('get_usage_monthly', 'Get monthly usage summary.', {}, async () => {
    const result = await client.getUsageMonthly();
    const text = `## Monthly Usage

**Tier:** ${result.tier_display_name}
**Billing Period:** ${result.billing.current_period_start} \u2192 ${result.billing.current_period_end} (${result.billing.days_remaining} days left)

### Usage
**Used:** ${result.usage.used} / ${result.usage.limit} (${result.usage.percent_used.toFixed(1)}%)
**Remaining:** ${result.usage.remaining}
**Rate Limit:** ${result.rate_limit.requests_per_minute}/min

${result.recommendations ? `### Recommendation\n${result.recommendations.reason}\n**Suggested Tier:** ${result.recommendations.suggested_tier}\n[Upgrade](${result.recommendations.upgrade_url})` : ''}`;
    return { content: [{ type: 'text', text }] };
  });

  // =========================================================================
  // GDPR Account
  // =========================================================================

  server.tool('delete_account_data', 'Delete all account data (GDPR Right to Erasure).', {}, async () => {
    const result = await client.deleteAccountData();
    return { content: [{ type: 'text', text: `## \u2705 Account Data Deleted\n\n**Message:** ${result.message}\n**Records Deleted:** ${result.deleted_count}` }] };
  });

  server.tool('export_account_data', 'Export all account data as JSON (GDPR Data Portability).', {}, async () => {
    const result = await client.exportAccountData();
    const collections = Object.keys(result.data).join(', ');
    return { content: [{ type: 'text', text: `## \u{1F4E6} Account Data Export\n\n**User ID:** ${result.userId}\n**Exported At:** ${result.exportedAt}\n**Collections:** ${collections}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2).slice(0, 5000)}\n\`\`\`` }] };
  });

  const consentTypeEnum = z.enum(['data_processing', 'analytics', 'marketing', 'third_party_sharing', 'child_safety_monitoring']);

  server.tool(
    'record_consent',
    'Record user consent for data processing (GDPR Article 7).',
    {
      consent_type: consentTypeEnum.describe('Type of consent to record'),
      version: z.string().describe('Policy version the user is consenting to'),
    },
    async ({ consent_type, version }) => {
      const result = await client.recordConsent({ consent_type: consent_type as ConsentType, version });
      return { content: [{ type: 'text', text: `## \u2705 Consent Recorded\n\n**Type:** ${result.consent.consent_type}\n**Status:** ${result.consent.status}\n**Version:** ${result.consent.version}` }] };
    },
  );

  server.tool(
    'get_consent_status',
    'Get current consent status.',
    { type: consentTypeEnum.optional().describe('Optional: filter by consent type') },
    async ({ type }) => {
      const result = await client.getConsentStatus(type as ConsentType | undefined);
      if (result.consents.length === 0) {
        return { content: [{ type: 'text', text: 'No consent records found.' }] };
      }
      const lines = result.consents.map(c =>
        `- **${c.consent_type}**: ${c.status === 'granted' ? '\u2705' : '\u274C'} ${c.status} (v${c.version})`
      ).join('\n');
      return { content: [{ type: 'text', text: `## Consent Status\n\n${lines}` }] };
    },
  );

  server.tool(
    'withdraw_consent',
    'Withdraw a previously granted consent.',
    { type: consentTypeEnum.describe('Type of consent to withdraw') },
    async ({ type }) => {
      const result = await client.withdrawConsent(type as ConsentType);
      return { content: [{ type: 'text', text: `## \u26A0\uFE0F Consent Withdrawn\n\n**Type:** ${result.consent.consent_type}\n**Status:** ${result.consent.status}` }] };
    },
  );

  server.tool(
    'rectify_data',
    'Rectify (correct) user data (GDPR Right to Rectification).',
    {
      collection: z.string().describe('Collection name'),
      document_id: z.string().describe('Document ID to rectify'),
      fields: z.record(z.string(), z.unknown()).describe('Fields to update'),
    },
    async ({ collection, document_id, fields }) => {
      const result = await client.rectifyData({ collection, document_id, fields: fields as Record<string, unknown> });
      return { content: [{ type: 'text', text: `## \u2705 Data Rectified\n\n**Message:** ${result.message}\n**Updated Fields:** ${result.updated_fields.join(', ')}` }] };
    },
  );

  server.tool(
    'get_audit_logs',
    'Get audit trail of data operations.',
    {
      action: z.enum(['data_access', 'data_export', 'data_deletion', 'data_rectification', 'consent_granted', 'consent_withdrawn', 'breach_notification']).optional().describe('Filter by action type'),
      limit: z.number().optional().describe('Maximum number of results'),
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

  server.tool(
    'log_breach',
    'Log a new data breach (GDPR Article 33/34).',
    {
      title: z.string().describe('Brief title of the breach'),
      description: z.string().describe('Detailed description'),
      severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Breach severity'),
      affected_user_ids: z.array(z.string()).describe('List of affected user IDs'),
      data_categories: z.array(z.string()).describe('Categories of data affected'),
      reported_by: z.string().describe('Who reported the breach'),
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
      return { content: [{ type: 'text', text: `## \u26A0\uFE0F Breach Logged\n\n**ID:** ${b.id}\n**Title:** ${b.title}\n**Severity:** ${severityEmoji[b.severity] || '\u26AA'} ${b.severity}\n**Status:** ${b.status}\n**Notification Deadline:** ${b.notification_deadline}\n**Affected Users:** ${b.affected_user_ids.length}\n**Data Categories:** ${b.data_categories.join(', ')}` }] };
    },
  );

  const breachStatusEnum = z.enum(['detected', 'investigating', 'contained', 'reported', 'resolved']);

  server.tool(
    'list_breaches',
    'List all data breaches.',
    {
      status: breachStatusEnum.optional().describe('Filter by status'),
      limit: z.number().optional().describe('Maximum number of results'),
    },
    async ({ status, limit }) => {
      const result = await client.listBreaches({ status: status as BreachStatus | undefined, limit });
      if (result.breaches.length === 0) {
        return { content: [{ type: 'text', text: 'No breaches found.' }] };
      }
      const breachLines = result.breaches.map(b =>
        `- ${severityEmoji[b.severity] || '\u26AA'} **${b.title}** \u2014 ${b.status} _(${b.id})_`
      ).join('\n');
      return { content: [{ type: 'text', text: `## Data Breaches\n\n${breachLines}` }] };
    },
  );

  server.tool(
    'get_breach',
    'Get details of a specific data breach.',
    { id: z.string().describe('Breach ID') },
    async ({ id }) => {
      const result = await client.getBreach(id);
      const b = result.breach;
      return { content: [{ type: 'text', text: `## Breach Details\n\n**ID:** ${b.id}\n**Title:** ${b.title}\n**Severity:** ${severityEmoji[b.severity] || '\u26AA'} ${b.severity}\n**Status:** ${b.status}\n**Notification:** ${b.notification_status}\n**Reported By:** ${b.reported_by}\n**Deadline:** ${b.notification_deadline}\n**Created:** ${b.created_at}\n**Updated:** ${b.updated_at}\n\n### Description\n${b.description}\n\n**Affected Users:** ${b.affected_user_ids.join(', ')}\n**Data Categories:** ${b.data_categories.join(', ')}` }] };
    },
  );

  server.tool(
    'update_breach_status',
    'Update a breach status and notification progress.',
    {
      id: z.string().describe('Breach ID'),
      status: breachStatusEnum.describe('New breach status'),
      notification_status: z.enum(['pending', 'users_notified', 'dpa_notified', 'completed']).optional().describe('Notification progress'),
      notes: z.string().optional().describe('Additional notes'),
    },
    async ({ id, status, notification_status, notes }) => {
      const result = await client.updateBreachStatus(id, {
        status: status as BreachStatus,
        notification_status: notification_status as BreachNotificationStatus | undefined,
        notes,
      });
      const b = result.breach;
      return { content: [{ type: 'text', text: `## \u2705 Breach Updated\n\n**ID:** ${b.id}\n**Status:** ${b.status}\n**Notification:** ${b.notification_status}` }] };
    },
  );
}
