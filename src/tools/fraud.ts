import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq, ContextInput } from '@tuteliq/sdk';
import { formatDetectionResult } from '../formatters.js';

const DETECTION_WIDGET_URI = 'ui://tuteliq/detection-result.html';

interface FraudToolDef {
  name: string;
  title: string;
  description: string;
  method: string;
  invoking: string;
  invoked: string;
}

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
  },
  {
    name: 'detect_vulnerability_exploitation',
    title: 'Detect Vulnerability Exploitation',
    description: 'Detect exploitation of vulnerable individuals including targeting the elderly, disabled, financially distressed, or emotionally vulnerable.',
    method: 'detectVulnerabilityExploitation',
    invoking: 'Analyzing for vulnerability exploitation...',
    invoked: 'Vulnerability exploitation analysis complete.',
  },
  {
    name: 'detect_radicalisation',
    title: 'Detect Radicalisation',
    description: 'Detect radicalisation indicators such as extremist rhetoric, us-vs-them framing, calls to action, conspiracy narratives, and ideological grooming.',
    method: 'detectRadicalisation',
    invoking: 'Analyzing for radicalisation indicators...',
    invoked: 'Radicalisation analysis complete.',
  },
];

const fraudInputSchema = {
  content: z.string().describe('Text content to analyze'),
  context: z.record(z.string(), z.unknown()).optional().describe('Optional analysis context'),
  include_evidence: z.boolean().optional().describe('Include supporting evidence excerpts'),
  external_id: z.string().optional().describe('External tracking ID'),
  customer_id: z.string().optional().describe('Customer identifier'),
};

export function registerFraudTools(server: McpServer, client: Tuteliq): void {
  for (const tool of FRAUD_TOOLS) {
    registerAppTool(
      server,
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
        inputSchema: fraudInputSchema,
        _meta: {
          ui: { resourceUri: DETECTION_WIDGET_URI },
          'openai/widgetDescription': `Shows ${tool.title.toLowerCase()} results with risk indicators`,
          'openai/toolInvocation/invoking': tool.invoking,
          'openai/toolInvocation/invoked': tool.invoked,
        },
      },
      async ({ content, context, include_evidence, external_id, customer_id }) => {
        const fn = (client as any)[tool.method].bind(client);
        const result = await fn({
          content,
          context: { ...context, platform: 'mcp' } as ContextInput,
          includeEvidence: include_evidence,
          external_id,
          customer_id,
        });

        return {
          structuredContent: { toolName: tool.name, result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: `${tool.title} analysis complete. See the interactive widget above. Do not add any additional commentary.` }],
        };
      },
    );
  }
}
