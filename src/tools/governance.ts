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
}
