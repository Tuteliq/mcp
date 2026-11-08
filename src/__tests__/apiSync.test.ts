import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../index.js';
import {
    formatSyntheticVideoResult,
    formatSyntheticImageResult,
    formatSyntheticAudioResult,
    formatVerificationSessionResult,
} from '../formatters.js';

/**
 * Tools against the response shapes the API serves today (SDK 3.0.0).
 *
 * Each block below reproduces a defect found by comparing the tools with the
 * API: a tool that threw on a served response, an input the API rejects, a
 * result section read from a field the API renamed, and results that read
 * as clean when nothing was analysed. Driven through the real server and the
 * real SDK where an input is involved; only `fetch` is stubbed.
 */

const KEY = 'test_key_for_registration_only_0123456789';
let sent: Array<{ url: string; method: string; body: any }> = [];
let reply: unknown = {};
let replyStatus = 200;

beforeEach(() => {
    sent = [];
    reply = {};
    replyStatus = 200;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: { method?: string; body?: unknown }) => {
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
        sent.push({ url: String(url), method: init?.method ?? 'GET', body });
        return new Response(JSON.stringify(reply), { status: replyStatus, headers: { 'content-type': 'application/json' } });
    }));
});
afterEach(() => vi.unstubAllGlobals());

async function connect(options?: Parameters<typeof createServer>[1]) {
    const server = createServer(KEY, options);
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 't', version: '0' });
    await Promise.all([server.connect(a), client.connect(b)]);
    return client;
}

const text = (r: any): string => r.content.map((c: any) => c.text).join('\n');
const call = async (name: string, args: Record<string, unknown>) => text(await (await connect()).callTool({ name, arguments: args }));

const SYNTHETIC_BASE = {
    endpoint: 'synthetic_content', detected: true, classification: 'suspected_synthetic', severity: 0.6,
    confidence: 0.7, risk_score: 0.6, level: 'medium', categories: [], recommended_action: 'flag_for_review',
    rationale: 'r', language: 'en', language_status: 'stable', credits_used: 5,
};

describe('tools that threw on a served response', () => {
    // What /safety/synthetic-content returns for a video with face tracking and lip-sync.
    const video = {
        ...SYNTHETIC_BASE,
        input_type: 'video',
        video: { duration_seconds: 12.5, frames_analyzed: 6, has_audio: true },
        temporal_consistency: {
            score: 0.42, identity_consistency: 0.38, landmark_stability: 0.61, frames_with_faces: 6,
            anomalous_pairs: [{ frame_a: 2, frame_b: 3, distance: 0.71 }],
        },
        lip_sync: { correlation: 0.12, has_silent_mouth_movement: true, has_voice_without_movement: false },
    };

    it('detect_synthetic_video renders the served temporal and lip-sync fields', () => {
        const out = formatSyntheticVideoResult(video as any);
        expect(out).toContain('**Identity Consistency:** 38%');
        expect(out).toContain('**Landmark Stability:** 61%');
        expect(out).toContain('**Overall Score:** 42%');
        expect(out).toContain('frames 2');
        expect(out).not.toMatch(/NaN|undefined/);
    });

    // What the session poll returns after the one-time release of the extracted fields.
    const completed = {
        session_id: 'vs_1', status: 'completed', step_progress: 'done', chip_policy: 'optional', capture: null,
        created_at: 1762560000000, expires_at: 1762561800000, verification_mode: 'full',
        result: {
            status: 'verified', age: 34, is_minor: false, face_match: { matched: true, confidence: 0.93 },
            liveness: { valid: true }, document: { ocr_confidence: 91 }, failure_reasons: null,
        },
    };

    it('get_verification_session renders a face match with no distance and null failure reasons', () => {
        const out = formatVerificationSessionResult(completed as any);
        expect(out).toContain('**Matched:** ✅ Yes');
        expect(out).not.toMatch(/undefined|NaN/);
    });

    it('get_verification_session renders a result with failure reasons absent', () => {
        const { failure_reasons: _f, ...result } = completed.result;
        expect(() => formatVerificationSessionResult({ ...completed, result } as any)).not.toThrow();
    });

    it('get_verification_session shows why a failed session failed', () => {
        const failed = {
            ...completed, status: 'failed',
            result: { ...completed.result, status: 'failed', face_match: { matched: false, confidence: 0.2 }, failure_reasons: ['The face did not match the document photo.'] },
        };
        const out = formatVerificationSessionResult(failed as any);
        expect(out).toContain('The face did not match the document photo.');
    });

    it('get_verification_session renders timestamps as dates, not epoch milliseconds', () => {
        const out = formatVerificationSessionResult(completed as any);
        expect(out).not.toContain('1762560000000');
        expect(out).toContain('2025-11-08T00:00:00.000Z');
    });
});

describe('inputs the API rejected or ignored', () => {
    const SESSION = { session_id: 'vs_1', mobile_url: 'https://verify.example/s/vs_1', expires_at: 1762561800000, mode: 'identity' };

    it('create_verification_session accepts document_type id_card and sends national_id', async () => {
        reply = SESSION;
        await call('create_verification_session', { mode: 'identity', document_type: 'id_card' });
        expect(sent[0].body.document_type).toBe('national_id');
    });

    it('create_verification_session ignores fields the API never read, and says so', async () => {
        reply = SESSION;
        const out = await call('create_verification_session', { mode: 'age', redirect_url: 'https://example.com/back', external_id: 'x1' });
        expect(sent[0].body).not.toHaveProperty('redirect_url');
        expect(sent[0].body).not.toHaveProperty('external_id');
        expect(out).toMatch(/redirect_url.*ignored|ignored.*redirect_url/i);
    });

    it('get_action_plan accepts audience educator, sends parent, and says so', async () => {
        reply = { audience: 'parent', steps: ['Talk to them'], tone: 'calm', approx_reading_level: 'Grade 7' };
        const out = await call('get_action_plan', { situation: 's', audience: 'educator' });
        expect(sent[0].body.audience).toBe('parent');
        expect(out).toMatch(/educator/i);
        expect(out).toContain('**Reading Level:** Grade 7');
    });

    it('detect_synthetic_image renders semantic_analysis', () => {
        const out = formatSyntheticImageResult({
            ...SYNTHETIC_BASE,
            semantic_analysis: { is_likely_synthetic: true, synthetic_confidence: 0.8, artifacts: ['smooth skin'], overall_assessment: 'Likely generated' },
        } as any);
        expect(out).toContain('Likely generated');
    });

    it('detect_synthetic_audio renders rms_level', () => {
        const out = formatSyntheticAudioResult({ ...SYNTHETIC_BASE, audio_stats: { rms_level: -18.25, dynamic_range: 40 } } as any);
        expect(out).toContain('-18.3');
    });
});

describe('an analysis that did not complete never reads as clean', () => {
    it('analyse_multi shows a partial run, the detectors that did not answer and the summary action', async () => {
        reply = {
            results: [{ endpoint: 'bullying', detected: false, severity: 0, confidence: 0.9, risk_score: 0, level: 'none', categories: [], recommended_action: 'none', rationale: 'r' }],
            summary: {
                total_endpoints: 2, detected_count: 0, highest_risk: { endpoint: 'bullying', risk_score: 0 }, overall_risk_level: 'none',
                analysis_status: 'partial', recommended_action: 'flag_for_review', action_detail: 'One detector did not answer.',
                failed_endpoints: [{ endpoint: 'grooming', code: 'ENGINE_ERROR', error: 'did not answer' }],
            },
        };
        const out = await call('analyse_multi', { content: 'x', endpoints: ['bullying', 'grooming'] });
        expect(out).toMatch(/Incomplete/i);
        expect(out).toContain('grooming');
        expect(out).toContain('flag_for_review');
    });

    it('detect_grooming on out_of_scope_adults does not print No Grooming Detected', async () => {
        reply = { grooming_risk: 'none', confidence: 0, flags: [], risk_score: 0, rationale: 'r', recommended_action: 'none', analysis_status: 'out_of_scope_adults' };
        const out = await call('detect_grooming', { messages: [{ role: 'adult', content: 'a' }] });
        expect(out).not.toMatch(/No Grooming Detected/);
        expect(out).not.toMatch(/Risk Score:\*\* 0%/);
        expect(out).toMatch(/not analysed/i);
    });

    it('detect_nickname with reading_complete false reads as not analysed, never clean', async () => {
        reply = {
            signal: 'none', categories: [], parts: [], rationale: '', recommendation: 'allow', recommendation_detail: '',
            confidence: 0, language: null, strictness: 'balanced', reading_complete: false, credits_used: 0,
        };
        const out = await call('detect_nickname', { name: 'someone' });
        expect(out).toMatch(/not analysed/i);
        expect(out).not.toMatch(/\ballow\b.*✅|No concern/i);
    });
});

describe('tools promise only what their endpoint returns', () => {
    it.each(['detect_coercive_control', 'detect_vulnerability_exploitation', 'detect_distress_signals'])(
        '%s does not promise a conversation risk section', async (name) => {
            const tool = (await (await connect()).listTools()).tools.find((t) => t.name === name)!;
            expect(tool.description).not.toMatch(/Conversation risk|trajectory_risk|severity_series/);
        });
});

describe('public text describes capabilities, not implementation', () => {
    // Vendor and model names, and implementation detail, in any text this repo publishes.
    const LEAKS = /whisper|gemini|mistral|vertex|openai|nsfwjs|onnx|mivolo|mel spectrogram|\d+-signal forensic pipeline|\d+-track analysis|vision ai|sender_trust|fully suppressed/i;
    const ROOT = join(__dirname, '..', '..');

    it('no tool description names a vendor, a model or a pipeline', async () => {
        const tools = (await (await connect()).listTools()).tools;
        for (const t of tools) {
            expect(`${t.name}: ${t.description}`).not.toMatch(LEAKS);
            expect(`${t.name}: ${JSON.stringify(t.inputSchema)}`).not.toMatch(LEAKS);
        }
    });

    it.each(['src/tools/resources.ts', 'README.md', 'llms.txt', 'server.json', 'package.json'])('%s names no vendor, model or decision rule', (file) => {
        expect(readFileSync(join(ROOT, file), 'utf8')).not.toMatch(LEAKS);
    });

    it('synthetic image text does not list forensic sources or their confidence boosts', () => {
        const out = formatSyntheticImageResult({
            ...SYNTHETIC_BASE,
            forensic_signals: { signal_count: 3, combined_confidence_boost: 0.2, sources: [{ name: 'exif', signal_count: 2, confidence_boost: 0.1 }] },
        } as any);
        expect(out).not.toMatch(/Boost|exif/i);
        expect(out).toContain('3');
    });
});
