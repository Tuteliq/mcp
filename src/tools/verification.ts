import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tuteliq } from '@tuteliq/sdk';
import { VerificationMode, DocumentType, VerificationLimitError } from '@tuteliq/sdk';
import { formatVerificationSession, formatVerificationSessionResult, formatVerificationConfig } from '../formatters.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const ADDITIVE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const;

/**
 * Inputs this tool once offered that the API never read: it strips them, so a
 * redirect never happened and no reference was stored. They are no longer
 * advertised; one passed anyway is ignored with a note on the result. With
 * `redirect_url` gone the tool names no outside destination, so it is
 * closed-world.
 */
const IGNORED_CREATE_FIELDS = ['redirect_url', 'external_id', 'customer_id', 'metadata'] as const;

const DOCUMENT_TYPES: Record<string, DocumentType> = {
  passport: DocumentType.PASSPORT,
  national_id: DocumentType.NATIONAL_ID,
  // The value this tool used to offer; the API's name for it is national_id.
  id_card: DocumentType.NATIONAL_ID,
  drivers_license: DocumentType.DRIVERS_LICENSE,
};

/** The monthly verification allowance is used up: say so, with no purchase link. */
function handleLimitError(err: unknown) {
  if (!(err instanceof VerificationLimitError)) return null;
  const next = err.limitDetails?.next_period_start;
  return {
    content: [{ type: 'text' as const, text: `⚠️ This account's verification allowance for the month is used up, so no session was created.${next ? ` A new allowance starts ${next}.` : ''}` }],
  };
}

function handleTierError(err: any, toolName: string, featureLabel: string) {
  if (err?.status === 403 || err?.response?.status === 403) {
    const message = `Your current plan does not include ${featureLabel.toLowerCase()}. Upgrade your plan or purchase additional credits to unlock this feature.`;
    return {
      content: [{ type: 'text' as const, text: `⚠️ ${message}` }],
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
      description: 'Create a verification session for age or identity verification. Returns a URL that the user opens in a browser to complete the verification flow there. The web UI handles the whole flow, including any document and face capture; the MCP tool only creates the session and provides the URL. Credits are charged when the session completes; see get_pricing_details.',
      annotations: ADDITIVE,
      // Passthrough so a field this tool no longer advertises still reaches
      // the handler, which ignores it with a note instead of dropping it silently.
      inputSchema: z.object({
        mode: z.enum(['age', 'identity']).describe('Verification mode: "age" for age verification, "identity" for full identity verification'),
        document_type: z.enum(['passport', 'national_id', 'drivers_license', 'id_card']).optional().describe('Preferred document type hint for the web UI: passport, national_id or drivers_license (`id_card` is accepted as national_id)'),
        chip_policy: z.enum(['optional', 'required', 'instead_of_photo']).optional().describe('How a passport or ID card chip read counts as document evidence. `optional` (default): the document photo is required and a chip read adds to it. `required`: the photo and a valid chip read are both required. `instead_of_photo`: a chip read that proves itself genuine replaces the photo; otherwise the session asks for a photo.'),
      }).passthrough(),
    },
    async (input) => {
      const { mode, document_type, chip_policy } = input;
      const ignored = IGNORED_CREATE_FIELDS.filter((k) => (input as Record<string, unknown>)[k] !== undefined);
      const notices = ignored.length > 0
        ? [`${ignored.map((k) => `\`${k}\``).join(', ')} ${ignored.length > 1 ? 'were' : 'was'} ignored: the API does not accept ${ignored.length > 1 ? 'them' : 'it'}. Set the redirect address in the dashboard verification settings.`]
        : [];
      try {
        const result = await client.createVerificationSession({
          mode: mode === 'age' ? VerificationMode.AGE : VerificationMode.IDENTITY,
          document_type: document_type ? DOCUMENT_TYPES[document_type] : undefined,
          chip_policy,
        });

        return {
          content: [{ type: 'text' as const, text: formatVerificationSession(result, mode, notices) }],
        };
      } catch (err: any) {
        const limit = handleLimitError(err);
        if (limit) return limit;
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
      description: 'Poll the status of a verification session. Once it has completed or failed, the result holds the decision (verified, failed or needs review), the age, whether the person is a minor, the document evidence, the face match and liveness outcomes, and any failure reasons. The extracted document fields, date of birth and failure reasons are released once, to the first authenticated poll after the session finishes; polling here consumes them. If your platform needs them, take them from the `verification.completed` webhook instead.',
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

  // ── get_verification_config ────────────────────────────────────────────────
  server.registerTool(
    'get_verification_config',
    {
      title: 'Verification Settings for a Market',
      description: 'Which age check a user in a given country or region gets under this API key (document and live face, or live face only), and the age from which a person counts as an adult there. Use it before creating a session to tell the user what to expect.',
      annotations: READ_ONLY,
      inputSchema: {
        country: z.string().length(2).optional().describe('ISO 3166-1 alpha-2 country code of the end user, e.g. "DE"'),
        region: z.string().optional().describe('Region or state code within the country, e.g. "CA"'),
      },
    },
    async ({ country, region }) => {
      const result = await client.getVerificationConfig({ country, region });
      return {
        structuredContent: { toolName: 'get_verification_config', result },
        content: [{ type: 'text' as const, text: formatVerificationConfig(result) }],
      };
    },
  );

  // ── cancel_verification_session ────────────────────────────────────────────
  server.registerTool(
    'cancel_verification_session',
    {
      title: 'Cancel Verification Session',
      description: 'Cancel an active verification session. No credits are consumed for a cancelled session, which then reads as expired.',
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
