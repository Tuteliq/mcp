import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tuteliq } from '@tuteliq/sdk';
import { VerificationMode } from '@tuteliq/sdk';
import { formatVerificationSession, formatVerificationSessionResult } from '../formatters.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;
const ADDITIVE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: true } as const;

function handleTierError(err: any, toolName: string, featureLabel: string) {
  if (err?.status === 403 || err?.response?.status === 403) {
    const message = `Your current plan does not include ${featureLabel.toLowerCase()}. Upgrade your plan or purchase additional credits to unlock this feature.`;
    return {
      content: [{ type: 'text' as const, text: `⚠️ ${message}\n\nUpgrade at: https://tuteliq.ai/dashboard` }],
    };
  }
  return null;
}

export function registerVerificationTools(server: McpServer, client: Tuteliq): void {

  // ── create_verification_session ────────────────────────────────────────────
  server.registerTool(
    'create_verification_session',
    {
      title: 'Create Verification Session',
      description: 'Create a verification session for age or identity verification. Returns a URL that the user opens in a browser to complete document capture, liveness check, and selfie. The web UI handles the entire verification flow — the MCP tool only creates the session and provides the URL. Costs 10 credits (age) or 15 credits (identity) on completion.',
      annotations: ADDITIVE,
      inputSchema: {
        mode: z.enum(['age', 'identity']).describe('Verification mode: "age" for age verification, "identity" for full identity verification'),
        document_type: z.enum(['passport', 'id_card', 'drivers_license']).optional().describe('Preferred document type hint for the web UI'),
        redirect_url: z.string().optional().describe('URL to redirect the user after verification completes'),
        external_id: z.string().optional().describe('Your external reference ID for this verification'),
        customer_id: z.string().optional().describe('Your end-customer identifier'),
      },
    },
    async ({ mode, document_type, redirect_url, external_id, customer_id }) => {
      try {
        const result = await client.createVerificationSession({
          mode: mode === 'age' ? VerificationMode.AGE : VerificationMode.IDENTITY,
          document_type: document_type as any,
          redirect_url,
          external_id,
          customer_id,
        });

        return {
          content: [{ type: 'text' as const, text: formatVerificationSession(result, mode) }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'create_verification_session', 'Verification');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── get_verification_session ───────────────────────────────────────────────
  server.registerTool(
    'get_verification_session',
    {
      title: 'Verification Session Status',
      description: 'Poll the status of a verification session. When status is "completed", the result contains full document intelligence: MRZ validation, PDF417 barcode reading, 45-country document number validation, AI-powered document authenticity, face matching, and liveness check.',
      annotations: READ_ONLY,
      inputSchema: {
        session_id: z.string().describe('The verification session ID to check'),
      },
    },
    async ({ session_id }) => {
      try {
        const result = await client.getVerificationSession(session_id);

        return {
          content: [{ type: 'text' as const, text: formatVerificationSessionResult(result) }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'get_verification_session', 'Verification');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── cancel_verification_session ────────────────────────────────────────────
  server.registerTool(
    'cancel_verification_session',
    {
      title: 'Cancel Verification Session',
      description: 'Cancel an active verification session. No credits are consumed for cancelled sessions.',
      annotations: DESTRUCTIVE,
      inputSchema: {
        session_id: z.string().describe('The verification session ID to cancel'),
      },
    },
    async ({ session_id }) => {
      try {
        await client.cancelVerificationSession(session_id);

        return {
          content: [{ type: 'text' as const, text: `✅ Verification session \`${session_id}\` has been cancelled. No credits were consumed.` }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'cancel_verification_session', 'Verification');
        if (upsell) return upsell;
        throw err;
      }
    },
  );
}
