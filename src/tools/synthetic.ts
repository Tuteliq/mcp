import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { Tuteliq } from '@tuteliq/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  formatSyntheticTextResult,
  formatSyntheticImageResult,
  formatSyntheticAudioResult,
  formatSyntheticVideoResult,
  // formatSyntheticProfile removed with get_synthetic_profile (v3.15.4)
} from '../formatters.js';
import { resolveFile } from '../resolveFile.js';
import { withViewId } from '../view-id.js';

/**
 * V3.15.4 — permissive boolean parser.
 *
 * MCP hosts (Claude Desktop, Cursor, OpenAI tool runtime, agent
 * orchestrators, etc.) serialize tool inputs inconsistently — some
 * preserve booleans through JSON, others stringify "true"/"false" or
 * "1"/"0" at various layers of the transport. A strict `z.boolean()`
 * makes the field unreachable from any host that doesn't carefully
 * type-preserve, which defeats the point of having an opt-out at all.
 *
 * This helper accepts boolean, "true"/"false", "1"/"0" and normalizes
 * to a real boolean. Anything else stays undefined (treated as the
 * default-false case downstream).
 */
const bypassCacheInput = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const lower = v.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  if (typeof v === 'number') return v !== 0;
  return v;
}, z.boolean().optional());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SYNTHETIC_WIDGET_URI = 'ui://tuteliq/synthetic-result.html';

function loadWidget(name: string): string {
  return readFileSync(resolve(__dirname, '../../../dist-ui', name), 'utf-8');
}

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
      content: [{ type: 'text' as const, text: `\u26A0\uFE0F ${upsellResult.message}\n\nUpgrade at: https://tuteliq.ai/dashboard` }],
    };
  }
  return null;
}

export function registerSyntheticTools(server: McpServer, client: Tuteliq): void {
  registerAppResource(
    server as any,
    SYNTHETIC_WIDGET_URI,
    SYNTHETIC_WIDGET_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [{
        uri: SYNTHETIC_WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: loadWidget('synthetic-result.html'),
      }],
    }),
  );

  // ── detect_synthetic_text ──────────────────────────────────────────────────
  registerAppTool(
    server,
    'detect_synthetic_text',
    {
      title: 'Detect Synthetic Text',
      description: 'Detect AI-generated text content. Analyzes text for synthetic indicators across 10 child-safety categories including synthetic CSAM narratives, deepfake impersonation scripts, and AI-generated grooming content. Returns classification, confidence, risk score, and rationale.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        content: z.string().describe('Text content to analyze for AI-generation indicators'),
        context: z.record(z.string(), z.unknown()).optional().describe('Optional analysis context (ageGroup, language, platform)'),
        support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to show crisis support resources (default: high)'),
        external_id: z.string().optional().describe('External tracking ID'),
        customer_id: z.string().optional().describe('Customer identifier'),
        bypass_cache: bypassCacheInput.describe('Skip the verdict cache for both read and write. Use for forensic re-tests or regression probes when a guaranteed fresh evaluation is required. Cache keys are SHA-256 of the input bytes (one-way; we never store the content itself) and verdicts expire after 1 hour by default. Accepts boolean true/false or string "true"/"false"/"1"/"0" for MCP host compatibility.'),
      },
      _meta: {
        ui: { resourceUri: SYNTHETIC_WIDGET_URI },
        'openai/widgetDescription': 'Shows synthetic text detection results with classification and forensic analysis',
        'openai/toolInvocation/invoking': 'Analyzing text for synthetic indicators...',
        'openai/toolInvocation/invoked': 'Synthetic text analysis complete.',
      },
    },
    async ({ content, context, support_threshold, external_id, customer_id, bypass_cache }) => {
      try {
        const result = await client.detectSyntheticText({
          content,
          context: context as any,
          supportThreshold: support_threshold,
          external_id,
          customer_id,
          bypassCache: bypass_cache,
        });

        return withViewId({
          structuredContent: { toolName: 'detect_synthetic_text', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: formatSyntheticTextResult(result) }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_synthetic_text', 'Synthetic Text Detection');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── detect_synthetic_image ─────────────────────────────────────────────────
  registerAppTool(
    server,
    'detect_synthetic_image',
    {
      title: 'Detect Synthetic Image',
      description: 'Detect AI-generated images using a 6-signal forensic pipeline: vision AI analysis, EXIF metadata extraction, pixel statistics, C2PA Content Credentials, watermark detection, and perceptual hashing. Supports png, jpg, jpeg, gif, webp. Provide a file_path, url, or base64-encoded image.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        file_path: z.string().optional().describe('Absolute path to the image file on disk'),
        url: z.string().optional().describe('URL to download the image from'),
        base64: z.string().optional().describe('Base64-encoded image data (with or without data URI prefix)'),
        filename: z.string().optional().describe('Filename hint (e.g., "photo.jpg") — required with base64, optional otherwise'),
        age_group: z.string().optional().describe('Age group for calibrated analysis (e.g., "13-15")'),
        language: z.string().optional().describe('Language hint (ISO 639-1)'),
        platform: z.string().optional().describe('Platform name for context'),
        external_id: z.string().optional().describe('External tracking ID'),
        customer_id: z.string().optional().describe('Customer identifier'),
        bypass_cache: bypassCacheInput.describe('Skip the verdict cache for both read and write. Use for forensic re-tests or regression probes when a guaranteed fresh evaluation is required. Cache keys are SHA-256 of the input bytes; verdicts expire after 1 hour by default. Accepts boolean or string "true"/"false" for MCP host compatibility.'),
      },
      _meta: {
        ui: { resourceUri: SYNTHETIC_WIDGET_URI },
        'openai/widgetDescription': 'Shows synthetic image detection with multi-signal forensic analysis',
        'openai/toolInvocation/invoking': 'Running 6-signal forensic analysis on image...',
        'openai/toolInvocation/invoked': 'Synthetic image analysis complete.',
      },
    },
    async ({ file_path, url, base64, filename: filenameHint, age_group, language, platform, external_id, customer_id, bypass_cache }) => {
      try {
        const { buffer, filename } = await resolveFile({ file_path, url, base64, filename: filenameHint });

        const result = await client.detectSyntheticImage({
          file: buffer,
          filename,
          ageGroup: age_group,
          language,
          platform,
          external_id,
          customer_id,
          bypassCache: bypass_cache,
        });

        return withViewId({
          structuredContent: { toolName: 'detect_synthetic_image', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: formatSyntheticImageResult(result) }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_synthetic_image', 'Synthetic Image Detection');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── detect_synthetic_audio ─────────────────────────────────────────────────
  registerAppTool(
    server,
    'detect_synthetic_audio',
    {
      title: 'Detect Synthetic Audio',
      description: 'Detect AI-generated audio using dual-signal forensics: transcript analysis + mel spectrogram vision + quantitative audio statistics. Supports mp3, wav, m4a, ogg, flac, webm, mp4. Provide a file_path, url, or base64-encoded audio.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        file_path: z.string().optional().describe('Absolute path to the audio file on disk'),
        url: z.string().optional().describe('URL to download the audio from'),
        base64: z.string().optional().describe('Base64-encoded audio data (with or without data URI prefix)'),
        filename: z.string().optional().describe('Filename hint (e.g., "voice.mp3") — required with base64, optional otherwise'),
        age_group: z.string().optional().describe('Age group for calibrated analysis'),
        language: z.string().optional().describe('Language hint (ISO 639-1)'),
        platform: z.string().optional().describe('Platform name for context'),
        external_id: z.string().optional().describe('External tracking ID'),
        customer_id: z.string().optional().describe('Customer identifier'),
        bypass_cache: bypassCacheInput.describe('Skip the verdict cache for both read and write. Use for forensic re-tests when a guaranteed fresh evaluation is required. Accepts boolean or string "true"/"false" for MCP host compatibility.'),
      },
      _meta: {
        ui: { resourceUri: SYNTHETIC_WIDGET_URI },
        'openai/widgetDescription': 'Shows synthetic audio detection with spectral forensics',
        'openai/toolInvocation/invoking': 'Analyzing audio with spectral forensics...',
        'openai/toolInvocation/invoked': 'Synthetic audio analysis complete.',
      },
    },
    async ({ file_path, url, base64, filename: filenameHint, age_group, language, platform, external_id, customer_id, bypass_cache }) => {
      try {
        const { buffer, filename } = await resolveFile({ file_path, url, base64, filename: filenameHint });

        const result = await client.detectSyntheticAudio({
          file: buffer,
          filename,
          ageGroup: age_group,
          language,
          platform,
          external_id,
          customer_id,
          bypassCache: bypass_cache,
        });

        return withViewId({
          structuredContent: { toolName: 'detect_synthetic_audio', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: formatSyntheticAudioResult(result) }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_synthetic_audio', 'Synthetic Audio Detection');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── detect_synthetic_video ─────────────────────────────────────────────────
  registerAppTool(
    server,
    'detect_synthetic_video',
    {
      title: 'Detect Synthetic Video',
      description: 'Detect AI-generated or deepfake video using 5-track analysis: per-frame vision forensics, temporal face consistency, lip-sync correlation, spectral audio analysis, and transcript detection. Supports mp4, webm, avi, mov. Provide a file_path, url, or base64-encoded video.',
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
      inputSchema: {
        file_path: z.string().optional().describe('Absolute path to the video file on disk'),
        url: z.string().optional().describe('URL to download the video from'),
        base64: z.string().optional().describe('Base64-encoded video data (with or without data URI prefix)'),
        filename: z.string().optional().describe('Filename hint (e.g., "clip.mp4") — required with base64, optional otherwise'),
        max_frames: z.number().optional().describe('Maximum frames to extract (default: 6, max: 20)'),
        age_group: z.string().optional().describe('Age group for calibrated analysis'),
        language: z.string().optional().describe('Language hint (ISO 639-1)'),
        platform: z.string().optional().describe('Platform name for context'),
        external_id: z.string().optional().describe('External tracking ID'),
        customer_id: z.string().optional().describe('Customer identifier'),
        bypass_cache: bypassCacheInput.describe('Skip the verdict cache for both read and write. Use for forensic re-tests when a guaranteed fresh evaluation is required. Accepts boolean or string "true"/"false" for MCP host compatibility.'),
      },
      _meta: {
        ui: { resourceUri: SYNTHETIC_WIDGET_URI },
        'openai/widgetDescription': 'Shows deepfake video detection with temporal and lip-sync analysis',
        'openai/toolInvocation/invoking': 'Running 5-track deepfake analysis on video...',
        'openai/toolInvocation/invoked': 'Synthetic video analysis complete.',
      },
    },
    async ({ file_path, url, base64, filename: filenameHint, max_frames, age_group, language, platform, external_id, customer_id, bypass_cache }) => {
      try {
        const { buffer, filename } = await resolveFile({ file_path, url, base64, filename: filenameHint });

        const result = await client.detectSyntheticVideo({
          file: buffer,
          filename,
          maxFrames: max_frames,
          ageGroup: age_group,
          language,
          platform,
          external_id,
          customer_id,
          bypassCache: bypass_cache,
        });

        return withViewId({
          structuredContent: { toolName: 'detect_synthetic_video', result, branding: { appName: 'Tuteliq' } },
          content: [{ type: 'text' as const, text: formatSyntheticVideoResult(result) }],
        });
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_synthetic_video', 'Synthetic Video Detection');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── get_synthetic_profile ──────────────────────────────────────────────────
  // REMOVED in v3.15.4 — the backing API route
  // GET /api/v1/safety/synthetic-content/profile/:customer_id was never
  // shipped, so this tool advertised a capability that 404'd at call time.
  // Removed from the tool list to avoid surfacing a broken capability.
  // If you reintroduce the route, restore the tool block from git history
  // (last present at e5b0d45). The SDK method client.getSyntheticProfile()
  // is also being removed in @tuteliq/sdk 2.13.0.
}
