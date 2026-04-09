import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tuteliq } from '@tuteliq/sdk';
import { readFileSync } from 'fs';
import {
  formatSyntheticTextResult,
  formatSyntheticImageResult,
  formatSyntheticAudioResult,
  formatSyntheticVideoResult,
  formatSyntheticProfile,
} from '../formatters.js';

function filenameFromPath(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

function handleTierError(err: any, toolName: string, featureLabel: string) {
  if (err?.status === 403 || err?.response?.status === 403) {
    const message = `Your current plan does not include ${featureLabel.toLowerCase()}. Upgrade your plan or purchase additional credits to unlock this feature.`;
    return {
      content: [{ type: 'text' as const, text: `\u26A0\uFE0F ${message}\n\nUpgrade at: https://tuteliq.ai/dashboard` }],
    };
  }
  return null;
}

export function registerSyntheticTools(server: McpServer, client: Tuteliq): void {

  // ── detect_synthetic_text ──────────────────────────────────────────────────
  server.tool(
    'detect_synthetic_text',
    'Detect AI-generated text content. Analyzes text for synthetic indicators across 10 child-safety categories including synthetic CSAM narratives, deepfake impersonation scripts, and AI-generated grooming content. Returns classification, confidence, risk score, and rationale.',
    {
      content: z.string().describe('Text content to analyze for AI-generation indicators'),
      context: z.record(z.string(), z.unknown()).optional().describe('Optional analysis context (ageGroup, language, platform)'),
      support_threshold: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Minimum severity to show crisis support resources (default: high)'),
      external_id: z.string().optional().describe('External tracking ID'),
      customer_id: z.string().optional().describe('Customer identifier'),
    },
    async ({ content, context, support_threshold, external_id, customer_id }) => {
      try {
        const result = await client.detectSyntheticText({
          content,
          context: context as any,
          supportThreshold: support_threshold,
          external_id,
          customer_id,
        });

        return {
          content: [{ type: 'text' as const, text: formatSyntheticTextResult(result) }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_synthetic_text', 'Synthetic Text Detection');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── detect_synthetic_image ─────────────────────────────────────────────────
  server.tool(
    'detect_synthetic_image',
    'Detect AI-generated images using a 6-signal forensic pipeline: vision AI analysis, EXIF metadata extraction, pixel statistics, C2PA Content Credentials, watermark detection, and perceptual hashing. Detects synthetic CSAM, deepfake faces, and AI-generated content. Supports png, jpg, jpeg, gif, webp.',
    {
      file_path: z.string().describe('Absolute path to the image file on disk'),
      age_group: z.string().optional().describe('Age group for calibrated analysis (e.g., "13-15")'),
      language: z.string().optional().describe('Language hint (ISO 639-1)'),
      platform: z.string().optional().describe('Platform name for context'),
      external_id: z.string().optional().describe('External tracking ID'),
      customer_id: z.string().optional().describe('Customer identifier'),
    },
    async ({ file_path, age_group, language, platform, external_id, customer_id }) => {
      try {
        const buffer = readFileSync(file_path);
        const filename = filenameFromPath(file_path);

        const result = await client.detectSyntheticImage({
          file: buffer,
          filename,
          ageGroup: age_group,
          language,
          platform,
          external_id,
          customer_id,
        });

        return {
          content: [{ type: 'text' as const, text: formatSyntheticImageResult(result) }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_synthetic_image', 'Synthetic Image Detection');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── detect_synthetic_audio ─────────────────────────────────────────────────
  server.tool(
    'detect_synthetic_audio',
    'Detect AI-generated audio using dual-signal forensics: transcript analysis + mel spectrogram vision + quantitative audio statistics. Detects AI voice clones, TTS output, and synthetic speech. Supports mp3, wav, m4a, ogg, flac, webm, mp4.',
    {
      file_path: z.string().describe('Absolute path to the audio file on disk'),
      age_group: z.string().optional().describe('Age group for calibrated analysis'),
      language: z.string().optional().describe('Language hint (ISO 639-1)'),
      platform: z.string().optional().describe('Platform name for context'),
      external_id: z.string().optional().describe('External tracking ID'),
      customer_id: z.string().optional().describe('Customer identifier'),
    },
    async ({ file_path, age_group, language, platform, external_id, customer_id }) => {
      try {
        const buffer = readFileSync(file_path);
        const filename = filenameFromPath(file_path);

        const result = await client.detectSyntheticAudio({
          file: buffer,
          filename,
          ageGroup: age_group,
          language,
          platform,
          external_id,
          customer_id,
        });

        return {
          content: [{ type: 'text' as const, text: formatSyntheticAudioResult(result) }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_synthetic_audio', 'Synthetic Audio Detection');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── detect_synthetic_video ─────────────────────────────────────────────────
  server.tool(
    'detect_synthetic_video',
    'Detect AI-generated or deepfake video using 5-track analysis: per-frame vision forensics, temporal face consistency, lip-sync correlation, spectral audio analysis, and transcript detection. Supports mp4, webm, avi, mov.',
    {
      file_path: z.string().describe('Absolute path to the video file on disk'),
      max_frames: z.number().optional().describe('Maximum frames to extract (default: 6, max: 20)'),
      age_group: z.string().optional().describe('Age group for calibrated analysis'),
      language: z.string().optional().describe('Language hint (ISO 639-1)'),
      platform: z.string().optional().describe('Platform name for context'),
      external_id: z.string().optional().describe('External tracking ID'),
      customer_id: z.string().optional().describe('Customer identifier'),
    },
    async ({ file_path, max_frames, age_group, language, platform, external_id, customer_id }) => {
      try {
        const buffer = readFileSync(file_path);
        const filename = filenameFromPath(file_path);

        const result = await client.detectSyntheticVideo({
          file: buffer,
          filename,
          maxFrames: max_frames,
          ageGroup: age_group,
          language,
          platform,
          external_id,
          customer_id,
        });

        return {
          content: [{ type: 'text' as const, text: formatSyntheticVideoResult(result) }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'detect_synthetic_video', 'Synthetic Video Detection');
        if (upsell) return upsell;
        throw err;
      }
    },
  );

  // ── get_synthetic_profile ──────────────────────────────────────────────────
  server.tool(
    'get_synthetic_profile',
    'Get account-level synthetic content profile for a customer. Returns 30-day rolling window with total items analyzed, synthetic vs. authentic counts, category distribution, trend detection, and composite account synthetic score.',
    {
      customer_id: z.string().describe('Customer identifier to retrieve profile for'),
    },
    async ({ customer_id }) => {
      try {
        const result = await client.getSyntheticProfile(customer_id);

        return {
          content: [{ type: 'text' as const, text: formatSyntheticProfile(result) }],
        };
      } catch (err: any) {
        const upsell = handleTierError(err, 'get_synthetic_profile', 'Synthetic Profiling');
        if (upsell) return upsell;
        throw err;
      }
    },
  );
}
