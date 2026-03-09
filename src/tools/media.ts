import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq } from '@tuteliq/sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { severityEmoji, trendEmoji, formatVideoResult } from '../formatters.js';

const MEDIA_WIDGET_URI = 'ui://tuteliq/media-result.html';

function loadWidget(name: string): string {
  return readFileSync(resolve(__dirname, '../../dist-ui', name), 'utf-8');
}

function filenameFromPath(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

export function registerMediaTools(server: McpServer, client: Tuteliq): void {
  registerAppResource(
    server as any,
    MEDIA_WIDGET_URI,
    MEDIA_WIDGET_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [{
        uri: MEDIA_WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: loadWidget('media-result.html'),
      }],
    }),
  );

  // ── analyze_voice ──────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'analyze_voice',
    {
      title: 'Analyze Voice',
      description: 'Analyze an audio file for safety concerns. Transcribes the audio via Whisper, then runs safety analysis on the transcript. Supports mp3, wav, m4a, ogg, flac, webm, mp4.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        file_path: z.string().describe('Absolute path to the audio file on disk'),
        analysis_type: z.enum(['bullying', 'unsafe', 'grooming', 'emotions', 'all']).optional().describe('Type of analysis to run on the transcript (default: all)'),
        child_age: z.number().optional().describe('Child age (used for grooming analysis)'),
        language: z.string().optional().describe('Language hint for transcription (e.g., "en", "es")'),
      },
      _meta: {
        ui: { resourceUri: MEDIA_WIDGET_URI },
        'openai/widgetDescription': 'Shows voice analysis results with transcript and safety findings',
        'openai/toolInvocation/invoking': 'Transcribing and analyzing audio...',
        'openai/toolInvocation/invoked': 'Voice analysis complete.',
      },
    },
    async ({ file_path, analysis_type, child_age, language }) => {
      const buffer = readFileSync(file_path);
      const filename = filenameFromPath(file_path);

      const result = await client.analyzeVoice({
        file: buffer,
        filename,
        analysisType: analysis_type || 'all',
        language,
        childAge: child_age,
        platform: 'mcp',
      });

      return {
        structuredContent: { toolName: 'analyze_voice', result, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text: `Voice analysis complete. See the interactive widget above. Do not add any additional commentary.` }],
      };
    },
  );

  // ── analyze_image ──────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'analyze_image',
    {
      title: 'Analyze Image',
      description: 'Analyze an image for visual safety concerns and OCR text extraction. Supports png, jpg, jpeg, gif, webp.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        file_path: z.string().describe('Absolute path to the image file on disk'),
        analysis_type: z.enum(['bullying', 'unsafe', 'emotions', 'all']).optional().describe('Type of analysis to run on extracted text (default: all)'),
      },
      _meta: {
        ui: { resourceUri: MEDIA_WIDGET_URI },
        'openai/widgetDescription': 'Shows image analysis results with visual and text safety findings',
        'openai/toolInvocation/invoking': 'Analyzing image for safety concerns...',
        'openai/toolInvocation/invoked': 'Image analysis complete.',
      },
    },
    async ({ file_path, analysis_type }) => {
      const buffer = readFileSync(file_path);
      const filename = filenameFromPath(file_path);

      const result = await client.analyzeImage({
        file: buffer,
        filename,
        analysisType: analysis_type || 'all',
        platform: 'mcp',
      });

      return {
        structuredContent: { toolName: 'analyze_image', result, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text: `Image analysis complete. See the interactive widget above. Do not add any additional commentary.` }],
      };
    },
  );

  // ── analyze_video ──────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'analyze_video',
    {
      title: 'Analyze Video',
      description: 'Analyze a video file for safety concerns. Extracts key frames and runs safety classification. Supports mp4, mov, avi, webm, mkv.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        file_path: z.string().describe('Absolute path to the video file on disk'),
        age_group: z.string().optional().describe('Age group for calibrated analysis (e.g., "child", "teen", "adult")'),
      },
      _meta: {
        ui: { resourceUri: MEDIA_WIDGET_URI },
        'openai/widgetDescription': 'Shows video analysis results with timestamped safety findings',
        'openai/toolInvocation/invoking': 'Analyzing video for safety concerns...',
        'openai/toolInvocation/invoked': 'Video analysis complete.',
      },
    },
    async ({ file_path, age_group }) => {
      const buffer = readFileSync(file_path);
      const filename = filenameFromPath(file_path);

      const result = await client.analyzeVideo({
        file: buffer,
        filename,
        ageGroup: age_group,
        platform: 'mcp',
      });

      return {
        structuredContent: { toolName: 'analyze_video', result, branding: { appName: 'Tuteliq' } },
        content: [{ type: 'text' as const, text: `Video analysis complete. See the interactive widget above. Do not add any additional commentary.` }],
      };
    },
  );
}
