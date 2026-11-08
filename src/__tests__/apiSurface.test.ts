import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../index.js';
import {
    formatDsaReportSummary,
    formatSafetyClassification,
    formatApiStatus,
    formatComponentPing,
    formatFleet,
    formatVerificationConfig,
    formatNicknameResult,
    formatSpeakerAndRouting,
} from '../formatters.js';

/**
 * The inputs, result fields and tools added to bring the server up to date
 * with SDK 3.0.0 and the API. Driven through the real server and the real
 * SDK; only `fetch` is stubbed, so each test checks what goes on the wire and
 * what the assistant reads back.
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

const BULLYING = { is_bullying: false, bullying_type: [], confidence: 0.9, rationale: 'r', recommended_action: 'none', risk_score: 0, severity: 'low' };
const UNSAFE = { unsafe: false, categories: [], confidence: 0.9, rationale: 'r', recommended_action: 'none', risk_score: 0, severity: 'low' };
const GROOMING = { grooming_risk: 'none', confidence: 0.9, flags: [], rationale: 'r', risk_score: 0, recommended_action: 'none', analysis_status: 'ok' };
const unified = (endpoint: string, extra: Record<string, unknown> = {}) => ({
    endpoint, detected: false, severity: 0, level: 'none', risk_score: 0.1, confidence: 0.8, categories: [], rationale: 'r',
    recommended_action: 'monitor', language: 'en', language_status: 'stable', ...extra,
});

describe('declared context reaches the API in its wire format', () => {
    const context = {
        conversation_type: 'education',
        sender: { role: 'educator', age_group: 'adult' },
        recipients: [{ role: 'child', age_group: '11-13', relationship_to_sender: 'student_of_sender' }],
        minor_disclosure_check: true,
    };
    const wire = {
        conversation_type: 'education',
        sender: { role: 'educator', age_group: 'adult' },
        recipients: [{ role: 'child', age_group: '11-13', relationship_to_sender: 'student_of_sender' }],
        minor_disclosure_check: true,
    };

    it.each([
        ['detect_bullying', { content: 'x' }, BULLYING],
        ['detect_unsafe', { content: 'x' }, UNSAFE],
        ['detect_grooming', { messages: [{ role: 'adult', content: 'a' }] }, GROOMING],
        ['detect_romance_scam', { content: 'x' }, unified('romance_scam')],
    ])('%s', async (name, args, response) => {
        reply = response;
        await call(name as string, { ...(args as object), context });
        expect(sent[0].body.context).toMatchObject(wire);
    });

    it('analyse_multi', async () => {
        reply = { results: [], summary: { total_endpoints: 1, detected_count: 0, highest_risk: { endpoint: 'bullying', risk_score: 0 }, overall_risk_level: 'none' } };
        await call('analyse_multi', { content: 'x', endpoints: ['bullying', 'tfgbv', 'distress-signals', 'synthetic-content'], context, flag_risk_terms: true, flag_profanity: false });
        expect(sent[0].body.context).toMatchObject(wire);
        expect(sent[0].body.endpoints).toEqual(['bullying', 'tfgbv', 'distress-signals', 'synthetic-content']);
        expect(sent[0].body.options.flag_risk_terms).toBe(true);
        expect(sent[0].body.options.flag_profanity).toBe(false);
    });

    it('detect_distress_signals sends author_role', async () => {
        reply = unified('distress_signals');
        await call('detect_distress_signals', { content: 'x', context: { author_role: 'responder' } });
        expect(sent[0].body.context.author_role).toBe('responder');
    });

    it('only detect_distress_signals advertises author_role', async () => {
        const tools = (await (await connect()).listTools()).tools;
        const has = (n: string) => !!(tools.find((t) => t.name === n)!.inputSchema as any).properties.context.properties.author_role;
        expect(has('detect_distress_signals')).toBe(true);
        expect(has('detect_romance_scam')).toBe(false);
    });
});

describe('new request fields', () => {
    it('attestation and message_id on the text detectors', async () => {
        reply = BULLYING;
        await call('detect_bullying', { content: 'x', attestation: true, message_id: 'm-1' });
        expect(sent[0].body).toMatchObject({ attestation: true, message_id: 'm-1' });
        reply = unified('coercive_control');
        await call('detect_coercive_control', { content: 'x', attestation: true, message_id: 'm-2', metadata: { a: 1 }, incident_moderation_enabled: false });
        expect(sent[1].body).toMatchObject({ attestation: true, message_id: 'm-2', metadata: { a: 1 }, incident_moderation_enabled: false });
    });

    it('detect_grooming include_relationship_frame, rendered when returned', async () => {
        reply = { ...GROOMING, relationship_frame: 'online_only' };
        const out = await call('detect_grooming', { messages: [{ role: 'adult', content: 'a' }], include_relationship_frame: true });
        expect(JSON.stringify(sent[0].body)).toContain('"include_relationship_frame":true');
        expect(out).toContain('**Relationship frame:** online only');
    });

    it('detect_unsafe new_conversation', async () => {
        reply = UNSAFE;
        await call('detect_unsafe', { content: 'x', continuation_token: 't', new_conversation: true });
        expect(sent[0].body.new_conversation).toBe(true);
    });

    it('analyze_video analysis_type, max_frames and flag_risk_terms; risk terms rendered', async () => {
        reply = { file_id: 'clip.mp4', frames_analyzed: 4, flagged_timestamps: [], overall_risk_score: 0, overall_severity: 'none', recommended_action: 'none', risk_terms: { detected: true, matches: [{ term: 'knife', category: 'violence' }] } };
        const out = await call('analyze_video', { base64: Buffer.from('x').toString('base64'), filename: 'clip.mp4', analysis_type: 'unsafe', max_frames: 4, flag_risk_terms: true });
        const form = sent[0].body as FormData;
        expect(form.get('analysis_type')).toBe('unsafe');
        expect(form.get('max_frames')).toBe('4');
        expect(form.get('flag_risk_terms')).toBe('true');
        expect(out).toContain('**Risk Terms:** knife (violence)');
    });

    it('analyze_document split_by_sender', async () => {
        reply = {
            file_id: 'chat.png', document_hash: 'h', total_pages: 1, pages_analyzed: 1, extraction_summary: { text_layer_pages: 0, ocr_pages: 1, failed_pages: 0 },
            flagged_pages: [], page_results: [], detected_endpoints: [], overall_risk_score: 0, overall_severity: 'none', credits_used: 2,
        };
        await call('analyze_document', { base64: Buffer.from('x').toString('base64'), filename: 'chat.png', split_by_sender: true });
        expect((sent[0].body as FormData).get('split_by_sender')).toBe('true');
    });

    it('update_detection_settings default_conversation_type', async () => {
        reply = { success: true, message: 'ok' };
        await call('update_detection_settings', { default_conversation_type: 'gaming_chat' });
        expect(sent[0].body.default_conversation_type).toBe('gaming_chat');
    });

    it('list_incidents accepts severity moderate and still accepts medium', async () => {
        reply = { incidents: [], next_cursor: null };
        const client = await connect();
        for (const severity of ['moderate', 'medium']) {
            const r: any = await client.callTool({ name: 'list_incidents', arguments: { severity } });
            expect(r.isError, `${severity}: ${text(r)}`).toBeFalsy();
        }
        expect(sent.map((s) => new URL(s.url).searchParams.get('severity'))).toEqual(['moderate', 'medium']);
    });

    it('review_incident sends medium as moderate', async () => {
        reply = { incident_id: 'i1', action: 'downgrade', original: { risk_level: 'high' }, revised: { risk_level: 'moderate' } };
        await call('review_incident', { incident_id: 'i1', action: 'downgrade', reason_code: 'false_positive', new_risk_level: 'medium', moderator_external_id: 'mod-1' });
        expect(sent[0].body.new_risk_level).toBe('moderate');
    });

    it('get_usage_summary takes a date', async () => {
        reply = { tier: 'business', date: '2026-11-01', usage: { totalRequests: 3, successRequests: 3, errorRequests: 0 }, quota: { requestsPerMinute: 60, requestsPerDay: -1, remainingToday: -1 } };
        const out = await call('get_usage_summary', { date: '2026-11-01' });
        expect(new URL(sent[0].url).searchParams.get('date')).toBe('2026-11-01');
        expect(out).toContain('**Date:** 2026-11-01');
    });

    it('create_verification_session sends chip_policy', async () => {
        reply = { session_id: 's', mobile_url: 'https://verify.example/s', expires_at: 1762561800000, mode: 'age', chip_policy: 'required' };
        const out = await call('create_verification_session', { mode: 'age', chip_policy: 'required' });
        expect(sent[0].body.chip_policy).toBe('required');
        expect(out).toContain('**Chip policy:** required');
    });

    it('a used-up verification allowance is a plain sentence with no purchase link', async () => {
        replyStatus = 402;
        reply = { error: { code: 'VERIFY_11014', message: 'Monthly verification allowance used', details: { next_period_start: '2026-12-01T00:00:00Z', buy_credits_url: 'https://tuteliq.ai/dashboard/credits' } } };
        const out = await call('create_verification_session', { mode: 'age' });
        expect(out).toContain('allowance for the month is used up');
        expect(out).toContain('2026-12-01T00:00:00Z');
        expect(out).not.toMatch(/https?:\/\//);
    });
});

describe('routing outcomes are in the text, with the API\'s reason', () => {
    it.each([
        ['detect_bullying', { content: 'x' }, { ...BULLYING, recommended_action: 'flag_for_review', bullying_reported: true, bullying_reported_by: 'bystander', bullying_reported_reason: 'A bystander describes it.' }, /Bullying reported:\*\* the speaker is reporting bullying by a bystander, not doing it\. A bystander describes it\./],
        ['detect_unsafe', { content: 'x' }, { ...UNSAFE, third_party_concern: true, third_party_concern_reason: 'A child reports a friend at risk.' }, /Third-party concern:\*\* route this to your safeguarding process\. A child reports a friend at risk\./],
        ['detect_coercive_control', { content: 'x' }, unified('coercive_control', { disclosure_capped: true, disclosure_capped_reason: 'The writer tells their own story.' }), /Disclosure:\*\*.*The writer tells their own story\./],
        ['detect_radicalisation', { content: 'x' }, unified('radicalisation', { priority_review: true, priority_review_reason: 'Involves a declared minor.' }), /Priority review:\*\*.*Involves a declared minor\./],
        ['detect_app_fraud', { content: 'x' }, unified('app_fraud', { target_report: true, target_report_reason: 'The writer was defrauded.' }), /Target report:\*\*.*The writer was defrauded\./],
        ['detect_distress_signals', { content: 'x' }, unified('distress_signals', { support_suggested: true }), /Support suggested:\*\*/],
    ])('%s', async (name, args, response, expected) => {
        reply = response;
        expect(await call(name as string, args as Record<string, unknown>)).toMatch(expected as RegExp);
    });

    it('minor disclosure, declared age, setting in effect and attestation', () => {
        const out = formatSpeakerAndRouting({
            conversation_type_in_effect: 'gaming_chat', conversation_type_source: 'account_default',
            participants_applied: { age_group: '11-13' },
            declared_age_overridden: true, declared_age_overridden_reason: 'The speaker says they are 12.',
            minor_disclosure: { detected: true, evidence_type: 'school_year', message_index: 0, suggested_age_group: '13-15', reason: 'Mentions year 8.' },
            attestation: { v: 'tlq-att-1' },
        });
        expect(out).toContain('**Conversation type in effect:** `gaming_chat` (the account default)');
        expect(out).toContain('**Declared participants applied:** age group 11-13');
        expect(out).toContain('**Declared age overridden:** The speaker says they are 12.');
        expect(out).toContain('**Minor disclosure:** the speaker indicates they are a minor (suggested age group 13-15). Mentions year 8.');
        expect(out).toContain('**Attestation:** signed attestation attached');
        expect(out).not.toContain('tlq-att-1');
    });

    it('an attestation that could not be produced says why', () => {
        expect(formatSpeakerAndRouting({ attestation: null, attestation_reason: 'nothing_detected' })).toContain('**Attestation:** not produced (`nothing_detected`).');
    });

    it('analyse_multi passes each result through the routing lines and shows crisis support', async () => {
        reply = {
            results: [unified('bullying', { detected: true, level: 'medium', recommended_action: 'flag_for_review', bullying_reported: true, bullying_reported_by: 'target' })],
            summary: { total_endpoints: 1, detected_count: 1, highest_risk: { endpoint: 'bullying', risk_score: 0.6, close_calls: [{ endpoint: 'unsafe', risk_score: 0.58 }] }, overall_risk_level: 'medium', analysis_status: 'complete' },
            support: { country: 'GB', helplines: [{ name: 'Childline', number: '0800 1111' }] },
        };
        const out = await call('analyse_multi', { content: 'x', endpoints: ['bullying', 'unsafe'] });
        expect(out).toContain('Bullying reported:** the speaker is reporting bullying by the person it is happening to');
        expect(out).toContain('**Read together with:** unsafe');
        expect(out).not.toContain('58%');
        expect(out).toContain('Childline');
        expect(out).not.toMatch(/Incomplete/);
    });
});

describe('account outputs', () => {
    it('export_account_data warns when collections could not be read in full', async () => {
        reply = { userId: 'u', exportedAt: '2026-11-08T00:00:00Z', data: { incidents: [] }, incompleteCollections: ['incidents'] };
        const out = await call('export_account_data', {});
        expect(out).toMatch(/Export incomplete:\*\* incidents could not be read in full/);
    });

    it('get_usage_monthly shows the verification allowance on a verification plan', async () => {
        reply = {
            tier: 'enterprise', tier_display_name: 'Verification 5k',
            billing: { current_period_start: '2026-11-01', current_period_end: '2026-11-30', days_remaining: 22 },
            usage: { used: 120, limit: 5000, remaining: 4880, percent_used: 2.4 },
            rate_limit: { requests_per_minute: 600 },
            recommendations: null, links: {},
            verification: { period: '2026-11', usage_timezone: 'UTC', next_period_start: '2026-12-01T00:00:00Z', included_per_month: 5000, included_used: 120, pack_used: 0, packs_remaining: 0, remaining: 4880, limit_reached: false, total: 120, in_progress: 3 },
        };
        const out = await call('get_usage_monthly', {});
        expect(out).toContain('**Plan:** Verification 5k');
        expect(out).toContain('**Used:** 120 / 5000 verifications');
        expect(out).toContain('**Completed:** 120 | **In progress:** 3');
    });
});

describe('new tools', () => {
    const NEW = ['detect_nickname', 'generate_dsa_transparency_report', 'get_safety_classification', 'get_service_status', 'get_fleet', 'get_fleet_device', 'get_verification_config'];
    const LEFT_OUT = ['verify_image_match', 'get_api_key_quota', 'detect_csam', 'prescreen', 'watermark', 'redact'];

    it('registers the new tools and none of the ones left out', async () => {
        const names = (await (await connect()).listTools()).tools.map((t) => t.name);
        expect(names).toEqual(expect.arrayContaining(NEW));
        expect(names.filter((n) => LEFT_OUT.some((l) => n.includes(l)))).toEqual([]);
    });

    it.each(NEW)('%s is read-only and closed-world', async (name) => {
        const tool = (await (await connect()).listTools()).tools.find((t) => t.name === name)!;
        expect(tool.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: false, destructiveHint: false });
    });

    it('the hosted connector set carries generate_dsa_transparency_report and leaves get_verification_config out', async () => {
        const names = (await (await connect({ exclude: ['verification', 'webhook-destinations', 'account-administration'] })).listTools()).tools.map((t) => t.name);
        expect(names).toContain('generate_dsa_transparency_report');
        expect(names).not.toContain('get_verification_config');
    });

    it('detect_nickname sends the name and context in the wire format and renders the advice', async () => {
        reply = {
            signal: 'review', categories: ['impersonation_of_staff_or_support'], parts: [{ text: 'mod', reading: 'concerning', category: 'impersonation_of_staff_or_support' }],
            rationale: 'Reads as a staff name.', recommendation: 'ask_to_rename', recommendation_detail: 'Ask for another name.',
            confidence: 0.8, language: 'en', strictness: 'balanced', reading_complete: true, credits_used: 1,
        };
        const out = await call('detect_nickname', { name: 'mod_helper', context: { age_group: '11-13', conversation_type: 'gaming_chat', platform_reserved: ['ModTeam'] } });
        expect(sent[0].body).toMatchObject({ name: 'mod_helper', context: { age_group: '11-13', conversation_type: 'gaming_chat', platform_reserved: ['ModTeam'] } });
        expect(out).toContain('Ask to rename');
        expect(out).toContain('`mod`: concerning (impersonation_of_staff_or_support)');
    });

    it('generate_dsa_transparency_report calls the report and summarises it', async () => {
        reply = {
            report: 'dsa_transparency_report_data', template: { regulation: 'Implementing Regulation (EU) 2024/2835', annex: 'I', categories: 'x' },
            reporting_period: { from: '2026-01-01', to: '2026-06-30' }, generated_at: 'g', notice: 'Aggregates only.',
            scope: { incidents_scanned: 10, incidents_counted: 9, test_incidents_excluded: 1 },
            sections: [{ section: 's', title: 't', legal_basis: 'l', availability: 'partial', fields: [{ indicator: 'i', availability: 'not_held_by_tuteliq', value: null, reason: 'not_held_by_tuteliq' }] }],
            own_initiative_by_category: [], unmapped_categories: [], supporting_data: {}, category_mapping: [], credits_used: 1,
        };
        const out = await call('generate_dsa_transparency_report', { from: '2026-01-01', to: '2026-06-30' });
        expect(sent[0].url).toMatch(/\/compliance\/dsa-transparency-report\?/);
        expect(new URL(sent[0].url).searchParams.get('from')).toBe('2026-01-01');
        expect(out).toContain('**Incidents counted:** 9 (test traffic excluded: 1)');
        expect(out).toContain('1 template fields are not held by Tuteliq');
    });

    it('get_safety_classification: not classified is not zero', async () => {
        replyStatus = 404;
        reply = { error: { code: 'no_classification', message: 'No classification yet' } };
        const out = await call('get_safety_classification', {});
        expect(out).toMatch(/not been classified yet\. That is not a score of zero/);
    });

    it('get_service_status renders a degraded answer instead of failing', async () => {
        replyStatus = 503;
        reply = {
            status: 'major_outage', updated_at: 'u',
            components: { api: { status: 'operational' }, database: { status: 'outage', message: 'down' }, cache: { status: 'operational' }, analysis_engine: { status: 'degraded' } },
            uptime: { last_24h: '99.1', last_7d: '99.8', last_30d: '99.9' }, incidents: { active: 1, recent: [{ id: '1', title: 'Database', status: 'investigating', created_at: 'c' }] },
        };
        const out = await call('get_service_status', {});
        expect(out).toContain('Service Status: major outage');
        expect(out).toContain('**database:** \u{1F534} outage (down)');
    });

    it('get_fleet_device reads one device', async () => {
        reply = { device: { device_id: 'd1', agent_version: '1.0', platform: 'macos', policy_id: 'p', passed: false, results: [{ rule: { name: 'disk_encryption' }, passed: false, detail: 'off' }], attested_at: 'a', org_id: 'o', expires_at: 'e' }, credits_used: 1 };
        const out = await call('get_fleet_device', { device_id: 'd1' });
        expect(sent[0].url).toMatch(/\/agent\/fleet\/d1$/);
        expect(out).toContain('disk_encryption: off');
    });
});

describe('new formatters', () => {
    it('formatSafetyClassification with too little data is not a bad score', () => {
        const out = formatSafetyClassification({ exists: true, classification: { date: 'd', score: null, band: null, insufficient_data: true, reason: 'Fewer than 10 incidents.', period: 'all_time', components: [], evidence: {} as any, calculated_at: 'c', updated_at: 'u', disclaimer: 'Not a certification.' } });
        expect(out).toContain('not available yet');
        expect(out).toContain('Not a certification.');
        expect(out).not.toMatch(/\b0 \/ 100/);
    });

    it('formatComponentPing, formatFleet and formatVerificationConfig never print undefined', () => {
        const out = [
            formatComponentPing({ component: 'ocr', healthy: false, skipped: true, timestamp: 't' }),
            formatFleet({ devices: [], summary: { total: 0, compliant: 0, non_compliant: 0, compliance_pct: 0 }, credits_used: 1 }),
            formatVerificationConfig({ mode: 'liveness_only', age_threshold: 18 }),
            formatApiStatus({ status: 'operational', updated_at: 'u', components: {} as any, uptime: undefined as any, incidents: undefined as any }),
            formatNicknameResult({ signal: 'none', categories: [], parts: [], rationale: '', recommendation: 'allow', recommendation_detail: '', confidence: 0.9, language: null, strictness: 'balanced', reading_complete: true, credits_used: 1 }),
            formatDsaReportSummary({ reporting_period: { from: 'a', to: 'b' }, template: { regulation: 'r' }, scope: { incidents_counted: 0, test_incidents_excluded: 0 }, sections: [], own_initiative_by_category: [], unmapped_categories: [], notice: 'n' } as any),
        ].join('\n');
        expect(out).not.toMatch(/undefined|NaN|\[object Object\]/);
        expect(out).toContain('not checked on this deployment');
        expect(out).toContain('live face only');
    });
});
