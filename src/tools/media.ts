import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq } from '@tuteliq/sdk';
import { loadWidget } from '../package-root.js';
import { severityEmoji, trendEmoji, formatVideoResult, formatDocumentResult, formatDeterministicFlags } from '../formatters.js';
import { withViewId } from '../view-id.js';
import { resolveFile } from '../resolveFile.js';
import { widgetUri } from '../widget-uri.js';
import { FETCHES_FROM_URL } from './hints.js';

const MEDIA_WIDGET_URI = widgetUri('media-result');

function handleTierError(err: any, toolName: string, featureLabel: string) {
  if (err?.status === 403 || err?.response?.status === 403) {
    const upsellResult = {
      error: 'tier_restricted',
      tier_restricted: true,
      upgrade: true,
      message: `Your current plan does not include ${featureLabel.toLowerCase()}. Upgrade your plan or purchase additional credits to unlock this feature.`,
    };
    return {
      structuredContent: { toolName, result: upsellResult, branding: { appName: 'Tuteliq' } },
      content: [{ type: 'text' as const, text: `\u26A0\uFE0F ${upsellResult.message}` }],
    };
  }
  return null;
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
      description: 'Analyze an audio file for safety concerns. Transcribes the speech, then runs safety analysis on the transcript. Supports mp3, wav, m4a, ogg, flac, webm, mp4. Provide EXACTLY ONE of file_path, url or base64. Supplying more than one is an error.',
      annotations: FETCHES_FROM_URL,
      inputSchema: {
        file_path: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. Absolute path to the audio file on disk'),
        url: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. URL to download the audio from'),
        base64: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. Base64-encoded audio data (with or without data URI prefix)'),
        filename: z.string().optional().describe('Filename hint (e.g., "voice.mp3") — required with base64, optional otherwise'),
        analysis_type: z.enum(['bullying', 'unsafe', 'grooming', 'emotions', 'all']).optional().describe('Type of analysis to run on the transcript (default: all)'),
        child_age: z.number().optional().describe('Child age (used for grooming analysis)'),
        language: z.string().optional().describe('Language hint for transcription (e.g., "en", "es")'),
      },
      _meta: {
        ui: { resourceUri: MEDIA_WIDGET_URI },
      },
    },
    async ({ file_path, url, base64, filename: filenameHint, analysis_type, child_age, language }) => {
      try {
        const { buffer, filename } = await resolveFile({ file_path, url, base64, filename: filenameHint });

        const result = await client.analyzeVoice({
          file: buffer,
          filename,
          analysisType: analysis_type || 'all',
          language,
          childAge: child_age,
        });

        const emoji = severityEmoji[result.overall_severity] || '\u2705';
        const segmentLines = result.transcription.segments
          .slice(0, 20)
          .map(s => `\`${s.start.toFixed(1)}s\u2013${s.end.toFixed(1)}s\` ${s.text}`)
          .join('\n');

        const analysisLines: string[] = [];
        if (result.analysis.bullying) {
          analysisLines.push(`**Bullying:** ${result.analysis.bullying.is_bullying ? '\u26A0\uFE0F Detected' : '\u2705 Clear'} (${(result.analysis.bullying.risk_score * 100).toFixed(0)}%)`);
        }
        if (result.analysis.unsafe) {
          analysisLines.push(`**Unsafe:** ${result.analysis.unsafe.unsafe ? '\u26A0\uFE0F Detected' : '\u2705 Clear'} (${(result.analysis.unsafe.risk_score * 100).toFixed(0)}%)`);
        }
        if (result.analysis.grooming) {
          analysisLines.push(`**Grooming:** ${result.analysis.grooming.grooming_risk !== 'none' ? '\u26A0\uFE0F ' + result.analysis.grooming.grooming_risk : '\u2705 Clear'} (${(result.analysis.grooming.risk_score * 100).toFixed(0)}%)`);
        }
        if (result.analysis.emotions) {
          analysisLines.push(`**Emotions:** ${result.analysis.emotions.dominant_emotions.join(', ')} (${trendEmoji[result.analysis.emotions.trend] || ''} ${result.analysis.emotions.trend})`);
        }

        const text = `## \u{1F399}\uFE0F Voice Analysis

**Overall Severity:** ${emoji} ${result.overall_severity}
**Overall Risk Score:** ${(result.overall_risk_score * 100).toFixed(0)}%
**Language:** ${result.transcription.language}
**Duration:** ${result.transcription.duration.toFixed(1)}s

### Transcript
${result.transcription.text}

### Timestamped Segments
${segmentLines}${result.transcription.segments.length > 20 ? `\n_...and ${result.transcription.segments.length - 20} more segments_` : ''}

### Analysis Results
${analysisLines.join('\n')}`;

        return withViewId({
          structuredContent: { toolName: 'analyze_voice', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyze_voice', 'Voice Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── analyze_image ──────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'analyze_image',
    {
      title: 'Analyze Image',
      description: 'Analyze an image for visual safety concerns and OCR text extraction. Supports png, jpg, jpeg, gif, webp. Provide EXACTLY ONE of file_path, url or base64. Supplying more than one is an error.',
      annotations: FETCHES_FROM_URL,
      inputSchema: {
        file_path: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. Absolute path to the image file on disk'),
        url: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. URL to download the image from'),
        base64: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. Base64-encoded image data (with or without data URI prefix)'),
        filename: z.string().optional().describe('Filename hint (e.g., "photo.jpg") — required with base64, optional otherwise'),
        analysis_type: z.enum(['bullying', 'unsafe', 'emotions', 'all']).optional().describe('Type of analysis to run on extracted text (default: all)'),
        flag_risk_terms: z.boolean().optional().describe('Additive word-list flag for bare drug and violence terms in the extracted text. Adds a `risk_terms` field; purely lexical, so it fires on benign uses too, and never affects severity, risk score or the recommended action. Omit to use the account default.'),
      },
      _meta: {
        ui: { resourceUri: MEDIA_WIDGET_URI },
      },
    },
    async ({ file_path, url, base64, filename: filenameHint, analysis_type, flag_risk_terms }) => {
      try {
        const { buffer, filename } = await resolveFile({ file_path, url, base64, filename: filenameHint });

        const result = await client.analyzeImage({
          file: buffer,
          filename,
          analysisType: analysis_type || 'all',
          flagRiskTerms: flag_risk_terms,
        });

        const emoji = severityEmoji[result.overall_severity] || '\u2705';
        const textAnalysisLines: string[] = [];
        if (result.text_analysis?.bullying) {
          textAnalysisLines.push(`**Bullying:** ${result.text_analysis.bullying.is_bullying ? '\u26A0\uFE0F Detected' : '\u2705 Clear'} (${(result.text_analysis.bullying.risk_score * 100).toFixed(0)}%)`);
        }
        if (result.text_analysis?.unsafe) {
          textAnalysisLines.push(`**Unsafe:** ${result.text_analysis.unsafe.unsafe ? '\u26A0\uFE0F Detected' : '\u2705 Clear'} (${(result.text_analysis.unsafe.risk_score * 100).toFixed(0)}%)`);
        }
        if (result.text_analysis?.emotions) {
          textAnalysisLines.push(`**Emotions:** ${result.text_analysis.emotions.dominant_emotions.join(', ')}`);
        }

        const text = `## \u{1F5BC}\uFE0F Image Analysis

**Overall Severity:** ${emoji} ${result.overall_severity}
**Overall Risk Score:** ${(result.overall_risk_score * 100).toFixed(0)}%

### Vision Results
**Description:** ${result.vision.visual_description}
**Visual Severity:** ${severityEmoji[result.vision.visual_severity] || '\u2705'} ${result.vision.visual_severity}
**Visual Confidence:** ${(result.vision.visual_confidence * 100).toFixed(0)}%
**Contains Text:** ${result.vision.contains_text ? 'Yes' : 'No'}
**Contains Faces:** ${result.vision.contains_faces ? 'Yes' : 'No'}
${result.vision.visual_categories.length > 0 ? `**Visual Categories:** ${result.vision.visual_categories.join(', ')}` : ''}

${result.vision.extracted_text ? `### Extracted Text (OCR)\n${result.vision.extracted_text}` : ''}

${textAnalysisLines.length > 0 ? `### Text Analysis Results\n${textAnalysisLines.join('\n')}` : ''}
${formatDeterministicFlags(result)}`;

        return withViewId({
          structuredContent: { toolName: 'analyze_image', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyze_image', 'Image Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── analyze_video ──────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'analyze_video',
    {
      title: 'Analyze Video',
      description: 'Analyze a video file for safety concerns. Samples frames across the video and runs safety classification. Supports mp4, mov, avi, webm. Provide EXACTLY ONE of file_path, url or base64. Supplying more than one is an error.',
      annotations: FETCHES_FROM_URL,
      inputSchema: {
        file_path: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. Absolute path to the video file on disk'),
        url: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. URL to download the video from'),
        base64: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. Base64-encoded video data (with or without data URI prefix)'),
        filename: z.string().optional().describe('Filename hint (e.g., "clip.mp4") — required with base64, optional otherwise'),
        age_group: z.string().optional().describe('Age group for calibrated analysis (e.g., "child", "teen", "adult")'),
        analysis_type: z.enum(['unsafe', 'all']).optional().describe('Analysis to run on the sampled frames (default: all)'),
        max_frames: z.number().int().min(1).max(20).optional().describe('Frames to sample across the video (default 10, at most 20)'),
        flag_risk_terms: z.boolean().optional().describe('Additive word-list flag for bare drug and violence terms in the extracted text. Adds a `risk_terms` field; purely lexical, so it fires on benign uses too, and never affects severity, risk score or the recommended action. Omit to use the account default.'),
      },
      _meta: {
        ui: { resourceUri: MEDIA_WIDGET_URI },
      },
    },
    async ({ file_path, url, base64, filename: filenameHint, age_group, analysis_type, max_frames, flag_risk_terms }) => {
      try {
        const { buffer, filename } = await resolveFile({ file_path, url, base64, filename: filenameHint });

        const result = await client.analyzeVideo({
          file: buffer,
          filename,
          ageGroup: age_group,
          analysisType: analysis_type,
          maxFrames: max_frames,
          flagRiskTerms: flag_risk_terms,
        });

        return withViewId({
          structuredContent: { toolName: 'analyze_video', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: formatVideoResult(result) }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyze_video', 'Video Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── analyze_document ────────────────────────────────────────────────────────
  registerAppTool(
    server,
    'analyze_document',
    {
      title: 'Analyze Document',
      description: 'Analyze a PDF document, or a single image read as a one-page document, for safety and compliance concerns. Reads the text of each page, runs the chosen detection endpoints, and returns per-page results with an overall risk assessment. Zero-retention: no document data is stored after processing. Supports PDF (max 50MB, 100 pages) and png, jpeg or webp images. For a messaging screenshot, set `split_by_sender` to judge the last received message with the rest of the conversation as history. Provide EXACTLY ONE of file_path, url or base64. Supplying more than one is an error.',
      annotations: FETCHES_FROM_URL,
      inputSchema: {
        file_path: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. Absolute path to the PDF or image file on disk'),
        url: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. URL to download the PDF or image from'),
        base64: z.string().optional().describe('EXACTLY ONE of file_path, url or base64. Base64-encoded PDF or image data (with or without data URI prefix)'),
        filename: z.string().optional().describe('Filename hint (e.g., "report.pdf", "chat.png"), required with base64, optional otherwise'),
        endpoints: z.array(z.enum(['unsafe', 'bullying', 'grooming', 'social-engineering', 'coercive-control', 'radicalisation', 'romance-scam', 'mule-recruitment'])).optional().describe('Detection endpoints to run per page (default: unsafe, coercive-control, radicalisation)'),
        age_group: z.string().optional().describe('Age group for calibrated analysis (e.g., "13-15")'),
        language: z.string().optional().describe('Language hint (e.g., "en", "sv")'),
        support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to include crisis helplines (default: high)'),
        split_by_sender: z.boolean().optional().describe('Images only. For a messaging screenshot, split it into messages with the side each came from, so the last received message is judged with the rest as history. Costs one extra call.'),
      },
      _meta: {
        ui: { resourceUri: MEDIA_WIDGET_URI },
      },
    },
    async ({ file_path, url, base64, filename: filenameHint, endpoints, age_group, language, support_threshold, split_by_sender }) => {
      try {
        const { buffer, filename } = await resolveFile({ file_path, url, base64, filename: filenameHint });

        const result = await client.analyzeDocument({
          file: buffer,
          filename,
          endpoints,
          ageGroup: age_group,
          language,
          supportThreshold: support_threshold,
          splitBySender: split_by_sender,
        });

        return withViewId({
          structuredContent: { toolName: 'analyze_document', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: formatDocumentResult(result) }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'analyze_document', 'Document Analysis');
        if (upsell) return upsell;
        throw err;
      }
    },
  );
}
