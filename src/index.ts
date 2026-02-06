#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SafeNestClient } from '@safenest/sdk';

// Initialize SafeNest client
const apiKey = process.env.SAFENEST_API_KEY;
if (!apiKey) {
  console.error('Error: SAFENEST_API_KEY environment variable is required');
  process.exit(1);
}

const client = new SafeNestClient(apiKey);

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
];

// Create MCP server
const server = new Server(
  {
    name: 'safenest-mcp',
    version: '1.0.0',
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
  const { name, arguments: args } = request.params;

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
  console.error('SafeNest MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
