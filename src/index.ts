#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { TuteliqClient } from '@tuteliq/sdk';

// Initialize Tuteliq client
const apiKey = process.env.TUTELIQ_API_KEY;
if (!apiKey) {
  console.error('Error: TUTELIQ_API_KEY environment variable is required');
  process.exit(1);
}

const client = new TuteliqClient(apiKey);

// Severity emoji mapping
const severityEmoji: Record<string, string> = {
  low: '🟡',
  medium: '🟠',
  high: '🔴',
  critical: '⛔',
};

const riskEmoji: Record<string, string> = {
  safe: '✅',
  none: '✅',
  low: '🟡',
  medium: '🟠',
  high: '🔴',
  critical: '⛔',
};

const trendEmoji: Record<string, string> = {
  improving: '📈',
  stable: '➡️',
  worsening: '📉',
};

// Tool definitions
const tools: Tool[] = [
  {
    name: 'detect_bullying',
    description: 'Analyze text content to detect bullying, harassment, or harmful language. Returns severity, type of bullying, confidence score, and recommended actions.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The text content to analyze for bullying',
        },
        context: {
          type: 'object',
          description: 'Optional context for better analysis',
          properties: {
            language: { type: 'string' },
            ageGroup: { type: 'string' },
            relationship: { type: 'string' },
            platform: { type: 'string' },
          },
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'detect_grooming',
    description: 'Analyze a conversation for grooming patterns and predatory behavior. Identifies manipulation tactics, boundary violations, and isolation attempts.',
    inputSchema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          description: 'Array of messages in the conversation',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['adult', 'child', 'unknown'],
                description: 'Role of the message sender',
              },
              content: {
                type: 'string',
                description: 'Message content',
              },
            },
            required: ['role', 'content'],
          },
        },
        childAge: {
          type: 'number',
          description: 'Age of the child in the conversation',
        },
      },
      required: ['messages'],
    },
  },
  {
    name: 'detect_unsafe',
    description: 'Detect unsafe content including self-harm, violence, drugs, explicit material, or other harmful content categories.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The text content to analyze for unsafe content',
        },
        context: {
          type: 'object',
          description: 'Optional context for better analysis',
          properties: {
            language: { type: 'string' },
            ageGroup: { type: 'string' },
            platform: { type: 'string' },
          },
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'analyze',
    description: 'Quick comprehensive safety analysis that checks for both bullying and unsafe content. Best for general content screening.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The text content to analyze',
        },
        include: {
          type: 'array',
          items: { type: 'string', enum: ['bullying', 'unsafe'] },
          description: 'Which checks to run (default: both)',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'analyze_emotions',
    description: 'Analyze emotional content and mental state indicators. Identifies dominant emotions, trends, and provides follow-up recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The text content to analyze for emotions',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_action_plan',
    description: 'Generate age-appropriate guidance and action steps for handling a safety situation. Tailored for children, parents, or educators.',
    inputSchema: {
      type: 'object',
      properties: {
        situation: {
          type: 'string',
          description: 'Description of the situation needing guidance',
        },
        childAge: {
          type: 'number',
          description: 'Age of the child involved',
        },
        audience: {
          type: 'string',
          enum: ['child', 'parent', 'educator', 'platform'],
          description: 'Who the guidance is for (default: parent)',
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Severity of the situation',
        },
      },
      required: ['situation'],
    },
  },
  {
    name: 'generate_report',
    description: 'Generate a comprehensive incident report from a conversation. Includes summary, risk level, and recommended next steps.',
    inputSchema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          description: 'Array of messages in the incident',
          items: {
            type: 'object',
            properties: {
              sender: { type: 'string', description: 'Name/ID of sender' },
              content: { type: 'string', description: 'Message content' },
            },
            required: ['sender', 'content'],
          },
        },
        childAge: {
          type: 'number',
          description: 'Age of the child involved',
        },
        incidentType: {
          type: 'string',
          description: 'Type of incident (e.g., bullying, grooming)',
        },
      },
      required: ['messages'],
    },
  },
  // GDPR Account Tools
  {
    name: 'delete_account_data',
    description: 'Delete all account data (GDPR Article 17 — Right to Erasure). Permanently removes all stored user data.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'export_account_data',
    description: 'Export all account data as JSON (GDPR Article 20 — Right to Data Portability).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'record_consent',
    description: 'Record user consent for a specific data processing purpose (GDPR Article 7).',
    inputSchema: {
      type: 'object',
      properties: {
        consent_type: {
          type: 'string',
          enum: ['data_processing', 'analytics', 'marketing', 'third_party_sharing', 'child_safety_monitoring'],
          description: 'Type of consent to record',
        },
        version: {
          type: 'string',
          description: 'Policy version the user is consenting to',
        },
      },
      required: ['consent_type', 'version'],
    },
  },
  {
    name: 'get_consent_status',
    description: 'Get current consent status for all or a specific consent type (GDPR Article 7).',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['data_processing', 'analytics', 'marketing', 'third_party_sharing', 'child_safety_monitoring'],
          description: 'Optional: filter by consent type',
        },
      },
      required: [],
    },
  },
  {
    name: 'withdraw_consent',
    description: 'Withdraw a previously granted consent (GDPR Article 7.3).',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['data_processing', 'analytics', 'marketing', 'third_party_sharing', 'child_safety_monitoring'],
          description: 'Type of consent to withdraw',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'rectify_data',
    description: 'Rectify (correct) user data in a specific collection (GDPR Article 16 — Right to Rectification).',
    inputSchema: {
      type: 'object',
      properties: {
        collection: {
          type: 'string',
          description: 'Firestore collection name',
        },
        document_id: {
          type: 'string',
          description: 'Document ID to rectify',
        },
        fields: {
          type: 'object',
          description: 'Fields to update (only allowlisted fields accepted)',
        },
      },
      required: ['collection', 'document_id', 'fields'],
    },
  },
  {
    name: 'get_audit_logs',
    description: 'Get audit trail of all data operations (GDPR Article 15 — Right of Access).',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['data_access', 'data_export', 'data_deletion', 'data_rectification', 'consent_granted', 'consent_withdrawn', 'breach_notification'],
          description: 'Optional: filter by action type',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
        },
      },
      required: [],
    },
  },
  // Breach Management Tools
  {
    name: 'log_breach',
    description: 'Log a new data breach (GDPR Article 33/34). Records breach details and starts the 72-hour notification clock.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Brief title of the breach' },
        description: { type: 'string', description: 'Detailed description of what happened' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Breach severity' },
        affected_user_ids: { type: 'array', items: { type: 'string' }, description: 'List of affected user IDs' },
        data_categories: { type: 'array', items: { type: 'string' }, description: 'Categories of data affected (e.g. email, name, address)' },
        reported_by: { type: 'string', description: 'Who reported the breach' },
      },
      required: ['title', 'description', 'severity', 'affected_user_ids', 'data_categories', 'reported_by'],
    },
  },
  {
    name: 'list_breaches',
    description: 'List all data breaches, optionally filtered by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['detected', 'investigating', 'contained', 'reported', 'resolved'], description: 'Filter by breach status' },
        limit: { type: 'number', description: 'Maximum number of results' },
      },
      required: [],
    },
  },
  {
    name: 'get_breach',
    description: 'Get details of a specific data breach by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Breach ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_breach_status',
    description: 'Update a breach status and notification progress.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Breach ID' },
        status: { type: 'string', enum: ['detected', 'investigating', 'contained', 'reported', 'resolved'], description: 'New breach status' },
        notification_status: { type: 'string', enum: ['pending', 'users_notified', 'dpa_notified', 'completed'], description: 'Notification progress status' },
        notes: { type: 'string', description: 'Additional notes about the update' },
      },
      required: ['id', 'status'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'tuteliq-mcp',
    version: '1.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'detect_bullying': {
        const result = await client.detectBullying({
          content: args.content as string,
          context: args.context as Record<string, string> | undefined,
        });

        const emoji = severityEmoji[result.severity] || '⚪';
        const response = `## ${result.is_bullying ? '⚠️ Bullying Detected' : '✅ No Bullying Detected'}

**Severity:** ${emoji} ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

${result.is_bullying ? `**Types:** ${result.bullying_type.join(', ')}` : ''}

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\``;

        return { content: [{ type: 'text', text: response }] };
      }

      case 'detect_grooming': {
        const messages = (args.messages as Array<{ role: string; content: string }>).map((m) => ({
          role: m.role as 'adult' | 'child' | 'unknown',
          content: m.content,
        }));

        const result = await client.detectGrooming({
          messages,
          childAge: args.childAge as number | undefined,
        });

        const emoji = riskEmoji[result.grooming_risk] || '⚪';
        const response = `## ${result.grooming_risk === 'none' ? '✅ No Grooming Detected' : '⚠️ Grooming Risk Detected'}

**Risk Level:** ${emoji} ${result.grooming_risk.charAt(0).toUpperCase() + result.grooming_risk.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

${result.flags.length > 0 ? `**Warning Flags:**\n${result.flags.map(f => `- 🚩 ${f}`).join('\n')}` : ''}

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\``;

        return { content: [{ type: 'text', text: response }] };
      }

      case 'detect_unsafe': {
        const result = await client.detectUnsafe({
          content: args.content as string,
          context: args.context as Record<string, string> | undefined,
        });

        const emoji = severityEmoji[result.severity] || '⚪';
        const response = `## ${result.unsafe ? '⚠️ Unsafe Content Detected' : '✅ Content is Safe'}

**Severity:** ${emoji} ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

${result.unsafe ? `**Categories:**\n${result.categories.map(c => `- ⚠️ ${c}`).join('\n')}` : ''}

### Rationale
${result.rationale}

### Recommended Action
\`${result.recommended_action}\``;

        return { content: [{ type: 'text', text: response }] };
      }

      case 'analyze': {
        const result = await client.analyze({
          content: args.content as string,
          include: args.include as Array<'bullying' | 'unsafe'> | undefined,
        });

        const emoji = riskEmoji[result.risk_level] || '⚪';
        const response = `## Safety Analysis Results

**Overall Risk:** ${emoji} ${result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)}
**Risk Score:** ${(result.risk_score * 100).toFixed(0)}%

### Summary
${result.summary}

### Recommended Action
\`${result.recommended_action}\`

---
${result.bullying ? `
**Bullying Check:** ${result.bullying.is_bullying ? '⚠️ Detected' : '✅ Clear'}
` : ''}${result.unsafe ? `
**Unsafe Content:** ${result.unsafe.unsafe ? '⚠️ Detected' : '✅ Clear'}
` : ''}`;

        return { content: [{ type: 'text', text: response }] };
      }

      case 'analyze_emotions': {
        const result = await client.analyzeEmotions({
          content: args.content as string,
        });

        const emoji = trendEmoji[result.trend] || '➡️';

        // Format emotion scores
        const emotionScoresList = Object.entries(result.emotion_scores)
          .sort((a, b) => b[1] - a[1])
          .map(([emotion, score]) => `- ${emotion}: ${(score * 100).toFixed(0)}%`)
          .join('\n');

        const response = `## Emotion Analysis

**Dominant Emotions:** ${result.dominant_emotions.join(', ')}
**Trend:** ${emoji} ${result.trend.charAt(0).toUpperCase() + result.trend.slice(1)}

### Emotion Scores
${emotionScoresList}

### Summary
${result.summary}

### Recommended Follow-up
${result.recommended_followup}`;

        return { content: [{ type: 'text', text: response }] };
      }

      case 'get_action_plan': {
        const result = await client.getActionPlan({
          situation: args.situation as string,
          childAge: args.childAge as number | undefined,
          audience: args.audience as 'child' | 'parent' | 'educator' | 'platform' | undefined,
          severity: args.severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
        });

        const response = `## Action Plan

**Audience:** ${result.audience}
**Tone:** ${result.tone}
${result.reading_level ? `**Reading Level:** ${result.reading_level}` : ''}

### Steps
${result.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;

        return { content: [{ type: 'text', text: response }] };
      }

      case 'generate_report': {
        const messages = (args.messages as Array<{ sender: string; content: string }>).map((m) => ({
          sender: m.sender,
          content: m.content,
        }));

        const result = await client.generateReport({
          messages,
          childAge: args.childAge as number | undefined,
          incident: args.incidentType ? { type: args.incidentType as string } : undefined,
        });

        const emoji = riskEmoji[result.risk_level] || '⚪';
        const response = `## 📋 Incident Report

**Risk Level:** ${emoji} ${result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)}

### Summary
${result.summary}

### Categories
${result.categories.map(c => `- ${c}`).join('\n')}

### Recommended Next Steps
${result.recommended_next_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;

        return { content: [{ type: 'text', text: response }] };
      }

      case 'delete_account_data': {
        const result = await client.deleteAccountData();
        return { content: [{ type: 'text', text: `## ✅ Account Data Deleted\n\n**Message:** ${result.message}\n**Records Deleted:** ${result.deleted_count}` }] };
      }

      case 'export_account_data': {
        const result = await client.exportAccountData();
        const collections = Object.keys(result.data).join(', ');
        return { content: [{ type: 'text', text: `## 📦 Account Data Export\n\n**User ID:** ${result.userId}\n**Exported At:** ${result.exportedAt}\n**Collections:** ${collections}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2).slice(0, 5000)}\n\`\`\`` }] };
      }

      case 'record_consent': {
        const result = await client.recordConsent({
          consent_type: args.consent_type as string,
          version: args.version as string,
        });
        return { content: [{ type: 'text', text: `## ✅ Consent Recorded\n\n**Type:** ${result.consent.consent_type}\n**Status:** ${result.consent.status}\n**Version:** ${result.consent.version}` }] };
      }

      case 'get_consent_status': {
        const result = await client.getConsentStatus(args.type as string | undefined);
        if (result.consents.length === 0) {
          return { content: [{ type: 'text', text: 'No consent records found.' }] };
        }
        const lines = result.consents.map(c =>
          `- **${c.consent_type}**: ${c.status === 'granted' ? '✅' : '❌'} ${c.status} (v${c.version})`
        ).join('\n');
        return { content: [{ type: 'text', text: `## Consent Status\n\n${lines}` }] };
      }

      case 'withdraw_consent': {
        const result = await client.withdrawConsent(args.type as string);
        return { content: [{ type: 'text', text: `## ⚠️ Consent Withdrawn\n\n**Type:** ${result.consent.consent_type}\n**Status:** ${result.consent.status}` }] };
      }

      case 'rectify_data': {
        const result = await client.rectifyData({
          collection: args.collection as string,
          document_id: args.document_id as string,
          fields: args.fields as Record<string, unknown>,
        });
        return { content: [{ type: 'text', text: `## ✅ Data Rectified\n\n**Message:** ${result.message}\n**Updated Fields:** ${result.updated_fields.join(', ')}` }] };
      }

      case 'get_audit_logs': {
        const result = await client.getAuditLogs({
          action: args.action as string | undefined,
          limit: args.limit as number | undefined,
        });
        if (result.audit_logs.length === 0) {
          return { content: [{ type: 'text', text: 'No audit logs found.' }] };
        }
        const logLines = result.audit_logs.map(l =>
          `- \`${l.created_at}\` **${l.action}** _(${l.id})_`
        ).join('\n');
        return { content: [{ type: 'text', text: `## 📋 Audit Logs\n\n${logLines}` }] };
      }

      case 'log_breach': {
        const result = await client.logBreach({
          title: args.title as string,
          description: args.description as string,
          severity: args.severity as string,
          affected_user_ids: args.affected_user_ids as string[],
          data_categories: args.data_categories as string[],
          reported_by: args.reported_by as string,
        });
        const b = result.breach;
        return { content: [{ type: 'text', text: `## ⚠️ Breach Logged\n\n**ID:** ${b.id}\n**Title:** ${b.title}\n**Severity:** ${severityEmoji[b.severity] || '⚪'} ${b.severity}\n**Status:** ${b.status}\n**Notification Deadline:** ${b.notification_deadline}\n**Affected Users:** ${b.affected_user_ids.length}\n**Data Categories:** ${b.data_categories.join(', ')}` }] };
      }

      case 'list_breaches': {
        const result = await client.listBreaches({
          status: args.status as string | undefined,
          limit: args.limit as number | undefined,
        });
        if (result.breaches.length === 0) {
          return { content: [{ type: 'text', text: 'No breaches found.' }] };
        }
        const breachLines = result.breaches.map(b =>
          `- ${severityEmoji[b.severity] || '⚪'} **${b.title}** — ${b.status} _(${b.id})_`
        ).join('\n');
        return { content: [{ type: 'text', text: `## Data Breaches\n\n${breachLines}` }] };
      }

      case 'get_breach': {
        const result = await client.getBreach(args.id as string);
        const b = result.breach;
        return { content: [{ type: 'text', text: `## Breach Details\n\n**ID:** ${b.id}\n**Title:** ${b.title}\n**Severity:** ${severityEmoji[b.severity] || '⚪'} ${b.severity}\n**Status:** ${b.status}\n**Notification:** ${b.notification_status}\n**Reported By:** ${b.reported_by}\n**Deadline:** ${b.notification_deadline}\n**Created:** ${b.created_at}\n**Updated:** ${b.updated_at}\n\n### Description\n${b.description}\n\n**Affected Users:** ${b.affected_user_ids.join(', ')}\n**Data Categories:** ${b.data_categories.join(', ')}` }] };
      }

      case 'update_breach_status': {
        const result = await client.updateBreachStatus(args.id as string, {
          status: args.status as string,
          notification_status: args.notification_status as string | undefined,
          notes: args.notes as string | undefined,
        });
        const b = result.breach;
        return { content: [{ type: 'text', text: `## ✅ Breach Updated\n\n**ID:** ${b.id}\n**Status:** ${b.status}\n**Notification:** ${b.notification_status}` }] };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tuteliq MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
