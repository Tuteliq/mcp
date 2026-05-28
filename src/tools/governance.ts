/**
 * EU AI Act + privacy-hardening tools.
 *
 * - Customer-managed encryption keys (#35 in API): register / get / revoke an
 *   RSA public key so Tuteliq cannot decrypt your incident records.
 * - Art 12 audit receipts (#33): fetch a signed receipt for a past inference.
 * - Art 14 moderator review (#24): override a model decision and emit a
 *   linked, signed receipt.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tuteliq, ModeratorAction, ModeratorReasonCode, RetentionClass, CustomerKeyAlgorithm } from '@tuteliq/sdk';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;
const ADDITIVE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: true } as const;

export function registerGovernanceTools(server: McpServer, client: Tuteliq): void {

  // =========================================================================
  // Encryption keys (E2E for incident records)
  // =========================================================================

  server.registerTool(
    'register_encryption_key',
    {
      title: 'Register Customer Encryption Key',
      description:
        'Register (or rotate) the RSA public key Tuteliq uses to encrypt your incident records (rationale, visual_description, source_data, metadata). After registration, those fields are wrapped with a per-record AES key encrypted to your RSA key — Tuteliq cannot decrypt; only the holder of the matching private key can. The private key is YOUR responsibility — Tuteliq cannot recover incidents encrypted under a lost key.',
      annotations: ADDITIVE,
      inputSchema: {
        algorithm: z.enum(['RSA-OAEP-2048', 'RSA-OAEP-4096']).describe('RSA-OAEP key size. 2048 is faster; 4096 is more conservative.'),
        public_key_pem: z.string().describe('PEM-encoded SPKI public key (begins with "-----BEGIN PUBLIC KEY-----")'),
      },
    },
    async ({ algorithm, public_key_pem }) => {
      const key = await client.registerEncryptionKey({
        algorithm: algorithm as CustomerKeyAlgorithm,
        public_key_pem,
      });
      const text = `## ✅ Encryption Key Registered

**Algorithm:** ${key.algorithm}
**Fingerprint (sha256 of SPKI, hex):** \`${key.key_fingerprint}\`
**Registered at:** ${key.registered_at}${key.rotated_from ? `\n**Rotated from:** \`${key.rotated_from}\`` : ''}

From this point on, new incident records are end-to-end encrypted. Existing incidents are not retroactively re-encrypted.`;
      return { content: [{ type: 'text', text }] };
    },
  );

  server.registerTool(
    'get_encryption_key',
    {
      title: 'Get Customer Encryption Key',
      description:
        'Fetch the currently-registered public key. Returns "not registered" if no key has been set — incidents fall back to server-side encryption with a Tuteliq-held key.',
      annotations: READ_ONLY,
      inputSchema: {},
    },
    async () => {
      const key = await client.getEncryptionKey();
      if (!key) {
        return {
          content: [
            {
              type: 'text',
              text: '## No customer encryption key registered\n\nIncidents are encrypted server-side with a Tuteliq-held AES-256 key. Use `register_encryption_key` to switch to end-to-end encryption with a key only you hold.',
            },
          ],
        };
      }
      const text = `## Customer Encryption Key

**Algorithm:** ${key.algorithm}
**Fingerprint:** \`${key.key_fingerprint}\`
**Registered at:** ${key.registered_at}${key.rotated_from ? `\n**Rotated from:** \`${key.rotated_from}\`` : ''}`;
      return { content: [{ type: 'text', text }] };
    },
  );

  server.registerTool(
    'revoke_encryption_key',
    {
      title: 'Revoke Customer Encryption Key',
      description:
        'Revoke the currently-registered public key. New incidents fall back to server-side encryption from this point. Existing incidents stay encrypted under the prior key and remain readable only with that key.',
      annotations: DESTRUCTIVE,
      inputSchema: {},
    },
    async () => {
      const result = await client.revokeEncryptionKey();
      return {
        content: [
          {
            type: 'text',
            text: result.ok
              ? '## ✅ Encryption Key Revoked\n\nNew incidents will be encrypted server-side. Existing incidents remain encrypted under the prior key.'
              : '## ⚠️ Revocation Returned ok=false\n\nThe server did not confirm revocation. Re-run or check the status.',
          },
        ],
      };
    },
  );

  // =========================================================================
  // Art 12 audit receipts
  // =========================================================================

  server.registerTool(
    'get_audit_receipt',
    {
      title: 'Get Audit Receipt',
      description:
        'Fetch the signed audit receipt for a past inference (EU AI Act Art 12 record-keeping). Only the deployer that produced the receipt can fetch it. Returns the canonical signed payload, the signature, and the canonical bytes that were signed — use them for out-of-band verification against the KMS public key.',
      annotations: READ_ONLY,
      inputSchema: {
        request_id: z.string().describe('The request_id returned in the original response or `x-request-id` header'),
      },
    },
    async ({ request_id }) => {
      const receipt = await client.getAuditReceipt(request_id);
      const r = receipt.payload;
      const text = `## Audit Receipt

**Request ID:** \`${r.request_id}\`
**Timestamp:** ${r.timestamp}
**Endpoint:** ${r.endpoint}
**Decision:** ${r.decision}${r.confidence !== undefined ? `\n**Confidence:** ${r.confidence}` : ''}${r.severity !== undefined ? `\n**Severity:** ${r.severity}` : ''}
**Deployer (api-key fingerprint):** \`${r.deployer}\`
**Retention class:** ${r.retention_class}${r.model ? `\n**Model:** ${r.model.id}${r.model.version ? ` (v${r.model.version})` : ''}` : ''}

### Signature
**Algorithm:** ${receipt.signature.algorithm}
**Key ID:** \`${receipt.signature.key_id}\`
**Signed at:** ${receipt.signature.signed_at}
**Signature (base64):** \`${receipt.signature.signature}\`

### Out-of-band verification
Use the canonical bytes below + the KMS public key to verify offline:
\`\`\`
${receipt.canonical}
\`\`\``;
      return { content: [{ type: 'text', text }] };
    },
  );

  // =========================================================================
  // Art 14 moderator review
  // =========================================================================

  server.registerTool(
    'review_incident',
    {
      title: 'Submit Moderator Review of an Incident',
      description:
        'Record a deployer-side moderator decision (confirm / downgrade / escalate / reclassify / dismiss) on a past incident. The override is persisted to the incident document (preserving the original classification on first override) and a separate signed Art 12 audit receipt is emitted linking back to the original. The optional reason_comment is encrypted with the customer\'s registered public key when E2E is enabled; otherwise server-side AES.',
      annotations: DESTRUCTIVE,
      inputSchema: {
        incident_id: z.string().describe('Incident ID to review'),
        action: z.enum(['confirm', 'downgrade', 'escalate', 'reclassify', 'dismiss']).describe('Moderator decision'),
        reason_code: z
          .enum([
            'confirmed_accurate',
            'false_positive',
            'out_of_context',
            'insufficient_severity',
            'incorrect_category',
            'requires_law_enforcement',
            'parent_notified',
            'other',
          ])
          .describe('Closed enum of reason codes'),
        reason_comment: z.string().optional().describe('Free-form comment; encrypted at rest'),
        new_risk_level: z.string().optional().describe('Required for downgrade / escalate'),
        new_risk_category: z.string().optional().describe('Required for reclassify'),
        moderator_external_id: z.string().optional().describe('Opaque deployer-side moderator id; surfaces in the receipt'),
        retention_class: z
          .enum(['biometric-high-risk', 'safety-high-risk', 'limited-risk', 'minimal-risk'])
          .optional()
          .describe('Retention class for the resulting receipt (defaults to limited-risk)'),
      },
    },
    async (input) => {
      const result = await client.reviewIncident(input.incident_id, {
        action: input.action as ModeratorAction,
        reason_code: input.reason_code as ModeratorReasonCode,
        reason_comment: input.reason_comment,
        new_risk_level: input.new_risk_level,
        new_risk_category: input.new_risk_category,
        moderator_external_id: input.moderator_external_id,
        retention_class: input.retention_class as RetentionClass | undefined,
      });
      const text = `## ✅ Moderator Review Recorded

**Incident ID:** \`${result.incident_id}\`
**Action:** ${input.action}
**Reason:** ${input.reason_code}

| | Risk category | Risk level |
|---|---|---|
| **Original** | ${result.original.risk_category} | ${result.original.risk_level} |
| **Revised** | ${result.revised.risk_category} | ${result.revised.risk_level} |

${result.audit_receipt ? `### Audit receipt\n**Request ID:** \`${result.audit_receipt.request_id}\`\n**Signed at:** ${result.audit_receipt.timestamp}\n**Signature:** \`${result.audit_receipt.signature}\`` : '⚠️ No audit receipt returned (check server logs)'}`;
      return { content: [{ type: 'text', text }] };
    },
  );

  // =========================================================================
  // V3.15.5 — Read-only dashboard queries.
  //
  // Wraps GET /api/v1/incidents{,/overview,/trends,/:id}. Every tool is
  // scoped to the API key's account, decryption follows the same path as
  // the moderation dashboard (server-side for legacy AES, hybrid envelope
  // pass-through for BYOK — the MCP host or the customer's downstream
  // code is responsible for client-side decryption of envelope fields).
  // =========================================================================

  server.registerTool(
    'list_incidents',
    {
      title: 'List Incidents',
      description:
        'Paginated read of the account\'s incidents (newest first). Filter by category, severity, status, source, platform, external_id, customer_id, and/or time-window. Set include_summary=true to decrypt the summary text per row (extra credit per row). BYOK accounts: summary may come back as a hybrid envelope (key field: `_e2e_envelope_fields`) for client-side decryption. Use cursor pagination by passing the previous response\'s `next_cursor` value back as `cursor`.',
      annotations: READ_ONLY,
      inputSchema: {
        category: z.string().optional().describe('Filter by risk_category (e.g. "bullying", "grooming", "synthetic_content")'),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        status: z.enum(['new', 'reviewing', 'escalated', 'resolved', 'dismissed']).optional(),
        source: z.enum(['text', 'voice', 'image', 'video', 'video_stream']).optional(),
        from: z.string().optional().describe('ISO 8601 inclusive lower bound on created_at'),
        to: z.string().optional().describe('ISO 8601 exclusive upper bound on created_at'),
        platform: z.string().optional(),
        external_id: z.string().optional(),
        customer_id: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional().describe('Default 25, max 100'),
        cursor: z.string().optional().describe('Opaque cursor from a prior list_incidents response'),
        include_summary: z.boolean().optional().describe('Decrypt the summary text per row (extra credit per row)'),
      },
    },
    async (input) => {
      const result = await client.listIncidents({
        category: input.category,
        severity: input.severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
        status: input.status as 'new' | 'reviewing' | 'escalated' | 'resolved' | 'dismissed' | undefined,
        source: input.source as 'text' | 'voice' | 'image' | 'video' | 'video_stream' | undefined,
        from: input.from,
        to: input.to,
        platform: input.platform,
        externalId: input.external_id,
        customerId: input.customer_id,
        limit: input.limit,
        cursor: input.cursor,
        includeSummary: input.include_summary,
      });

      const rows = result.incidents.map((i) => {
        const envelopeNote = i._e2e_envelope_fields?.length
          ? ` 🔒(${i._e2e_envelope_fields.join(',')})`
          : '';
        return `| \`${i.id.slice(0, 8)}...\` | ${i.risk_category} | ${i.risk_level} | ${i.source} | ${i.status} | ${i.created_at}${envelopeNote} |`;
      }).join('\n');
      const text = `## 📋 Incidents (${result.total_returned} shown)

| id | category | severity | source | status | created_at |
|---|---|---|---|---|---|
${rows || '_(no incidents matched the filters)_'}

${result.next_cursor ? `**Next page cursor:** \`${result.next_cursor}\`` : '**No more pages.**'}
${input.include_summary ? '\n_Encrypted-with-customer-key fields are noted as 🔒 — decrypt client-side with your RSA private key._' : ''}`;
      return {
        structuredContent: { toolName: 'list_incidents', result, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text }],
      };
    },
  );

  server.registerTool(
    'get_incident',
    {
      title: 'Get Incident Detail',
      description:
        'Fetch the full detail for a single incident. Server-encrypted fields are decrypted server-side; BYOK fields come back as hybrid envelopes (`_e2e_envelope_fields` lists which) for client-side decryption with your RSA private key. Returns an error if the incident does not exist or does not belong to this account.',
      annotations: READ_ONLY,
      inputSchema: {
        incident_id: z.string().describe('The incident\'s UUID (from list_incidents or a webhook)'),
      },
    },
    async ({ incident_id }) => {
      const inc = await client.getIncident(incident_id);
      const envelopeNote = inc._e2e_envelope_fields?.length
        ? `\n\n🔒 **Encrypted fields (decrypt client-side with your RSA private key):** ${inc._e2e_envelope_fields.join(', ')}`
        : '';
      const summaryPreview = typeof inc.summary === 'string'
        ? (inc.summary.length > 280 ? inc.summary.slice(0, 280) + '…' : inc.summary)
        : inc.summary
            ? '`(encrypted envelope — decrypt to read)`'
            : '_(no summary)_';
      const text = `## 🗂️ Incident \`${inc.id}\`

| | |
|---|---|
| **Category** | ${inc.risk_category} |
| **Severity** | ${inc.risk_level} |
| **Confidence** | ${inc.confidence_score ?? 'n/a'} |
| **Source** | ${inc.source} |
| **Platform** | ${inc.platform ?? '—'} |
| **Status** | ${inc.status} |
| **Created at** | ${inc.created_at} |
| **External ID** | ${inc.external_id ?? '—'} |
| **Customer ID** | ${inc.customer_id ?? '—'} |

**Detected patterns:** ${inc.detected_patterns.join(', ') || '—'}
**Recommended actions:** ${(inc.recommended_actions ?? []).join(', ') || '—'}

### Summary
${summaryPreview}${envelopeNote}`;
      return {
        structuredContent: { toolName: 'get_incident', result: inc, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text }],
      };
    },
  );

  server.registerTool(
    'get_incidents_overview',
    {
      title: 'Incident Overview',
      description:
        'KPI snapshot of incidents over a time window (default = last 30 days): total, requires-review queue size (high/critical AND status new|reviewing), 24h/7d/30d totals, counts by category / severity / source / status, and the top 5 platforms. Cheap aggregation; no LLM call.',
      annotations: READ_ONLY,
      inputSchema: {
        from: z.string().optional().describe('ISO 8601 inclusive lower bound. Default: now - 30 days.'),
        to: z.string().optional().describe('ISO 8601 exclusive upper bound. Default: now.'),
      },
    },
    async ({ from, to }) => {
      const o = await client.getIncidentsOverview({ from, to });
      const fmtBuckets = (obj: Record<string, number>) =>
        Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- **${k}**: ${v}`).join('\n');
      const topPlatforms = o.top_platforms.length
        ? o.top_platforms.map((p) => `- **${p.platform}**: ${p.count}`).join('\n')
        : '_(none)_';
      const text = `## 📊 Incidents Overview

**Window:** ${o.timeframe.from} → ${o.timeframe.to}

| | |
|---|---|
| **Total** | ${o.total_incidents} |
| **Needs review** | ${o.requires_review_count} |
| **Last 24h** | ${o.last_24h_count} |
| **Last 7d** | ${o.last_7d_count} |
| **Last 30d** | ${o.last_30d_count} |

### By category
${fmtBuckets(o.counts_by_category)}

### By severity
${fmtBuckets(o.counts_by_severity)}

### By source
${fmtBuckets(o.counts_by_source)}

### By status
${fmtBuckets(o.counts_by_status)}

### Top platforms
${topPlatforms}`;
      return {
        structuredContent: { toolName: 'get_incidents_overview', result: o, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text }],
      };
    },
  );

  server.registerTool(
    'get_incident_trends',
    {
      title: 'Incident Trends',
      description:
        'Time-bucketed incident counts with per-bucket severity breakdown. Use for trend charts in moderator dashboards. Bucket sizes: hour, day (default), week. Window defaults to the last 30 days.',
      annotations: READ_ONLY,
      inputSchema: {
        bucket: z.enum(['hour', 'day', 'week']).optional().describe('Default: day'),
        from: z.string().optional().describe('ISO 8601 inclusive lower bound. Default: now - 30 days.'),
        to: z.string().optional().describe('ISO 8601 exclusive upper bound. Default: now.'),
      },
    },
    async ({ bucket, from, to }) => {
      const t = await client.getIncidentTrends({ bucket, from, to });
      const rows = t.series.map((b) => {
        const sev = Object.entries(b.by_severity).map(([k, v]) => `${k}=${v}`).join(', ');
        return `| ${b.bucket_start} | ${b.total} | ${sev || '—'} |`;
      }).join('\n');
      const text = `## 📈 Incident Trends (${t.bucket_size})

**Window:** ${t.timeframe.from} → ${t.timeframe.to}
**Buckets:** ${t.series.length}

| bucket_start | total | by severity |
|---|---|---|
${rows || '_(no incidents in window)_'}`;
      return {
        structuredContent: { toolName: 'get_incident_trends', result: t, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text }],
      };
    },
  );
}
