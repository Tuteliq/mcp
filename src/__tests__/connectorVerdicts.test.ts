import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../index.js';

/**
 * Three things an independent evaluation found through the hosted connector
 * (2026-08/09), each reachable over REST but not through these tools:
 *
 *   1. A platform could not declare the conversation type (helpline,
 *      support_disclosure, clinical...). The API has accepted
 *      `context.conversation_type` on these endpoints for months; no tool
 *      here advertised it, so an assistant had no way to know it existed.
 *   2. When the grooming engine could not produce a verdict, the API returns
 *      `analysis_status: engine_error`, `grooming_risk: none`, score 0 and
 *      `flag_for_review`. The tool printed "No Grooming Detected" over that.
 *      A failure must never read as an all-clear.
 *   3. `speaker_role` / `speaker_stance` (a bystander reporting, a child
 *      disclosing) came back in the result but never in the text the
 *      assistant reads.
 *
 * Driven through the real server and the real SDK; only `fetch` is stubbed.
 */

const KEY = 'test_key_for_registration_only_0123456789';
let sent: Array<{ url: string; body: any }> = [];
let reply: Record<string, unknown> = {};

beforeEach(() => {
    sent = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: { body?: string }) => {
        sent.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : undefined });
        return new Response(JSON.stringify(reply), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
});
afterEach(() => vi.unstubAllGlobals());

async function connect() {
    const server = createServer(KEY);
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 't', version: '0' });
    await Promise.all([server.connect(a), client.connect(b)]);
    return client;
}

const text = (r: any): string => r.content.map((c: any) => c.text).join('\n');

const GROOMING_TOOLS_WITH_TYPE = [
    'detect_bullying', 'detect_grooming', 'detect_unsafe',
    'detect_social_engineering', 'detect_app_fraud', 'detect_romance_scam', 'detect_mule_recruitment',
    'detect_gambling_harm', 'detect_coercive_control', 'detect_vulnerability_exploitation',
    'detect_radicalisation', 'detect_distress_signals', 'detect_tfgbv', 'analyse_multi',
];

describe('1. a platform can declare the conversation type', () => {
    it.each(GROOMING_TOOLS_WITH_TYPE)('%s advertises context.conversation_type with the API\'s values', async (name) => {
        const client = await connect();
        const tool = (await client.listTools()).tools.find((t) => t.name === name)!;
        const ct = (tool.inputSchema as any).properties.context?.properties?.conversation_type;
        expect(ct, `${name} has no context.conversation_type`).toBeDefined();
        expect(ct.enum).toEqual(expect.arrayContaining(['helpline', 'support_disclosure', 'clinical', 'education', 'gaming_chat']));
    });

    it('detect_grooming sends it to the API as context.conversation_type', async () => {
        reply = { grooming_risk: 'high', confidence: 0.9, flags: [], rationale: 'r', risk_score: 0.9, recommended_action: 'flag_for_review', conversation_type_applied: 'helpline' };
        const client = await connect();
        const r = await client.callTool({ name: 'detect_grooming', arguments: {
            messages: [{ role: 'adult', content: 'a' }], context: { conversation_type: 'helpline' },
        } });
        expect(sent[0].url).toMatch(/\/safety\/grooming$/);
        expect(sent[0].body.context.conversation_type).toBe('helpline');
        // ...and says when the API confirms it changed routing.
        expect(text(r)).toMatch(/Conversation type applied:\*\* `helpline`/);
    });

    it('detect_bullying sends it to the API as context.conversation_type', async () => {
        reply = { is_bullying: false, bullying_type: [], confidence: 0.9, rationale: 'r', recommended_action: 'none', risk_score: 0, severity: 'low' };
        const client = await connect();
        await client.callTool({ name: 'detect_bullying', arguments: { content: 'x', context: { conversation_type: 'support_disclosure' } } });
        expect(sent[0].body.context.conversation_type).toBe('support_disclosure');
    });
});

describe('2. a failed analysis never reads as an all-clear', () => {
    const ENGINE_ERROR = {
        grooming_risk: 'none', confidence: 0, flags: [], risk_score: 0,
        rationale: 'The analysis engine could not produce a verdict for this conversation.',
        recommended_action: 'flag_for_review', analysis_status: 'engine_error',
    };

    it('detect_grooming on engine_error says the analysis did not complete, with no 0% score', async () => {
        reply = ENGINE_ERROR;
        const client = await connect();
        const out = text(await client.callTool({ name: 'detect_grooming', arguments: { messages: [{ role: 'adult', content: 'a' }] } }));
        expect(out).not.toMatch(/No Grooming Detected/);
        expect(out).toMatch(/Analysis Incomplete/);
        expect(out).not.toMatch(/Risk Score:\*\* 0%/);
        expect(out).toMatch(/flag_for_review/);
    });

    it('detect_grooming with no risk but a live action reads as flagged for review', async () => {
        reply = { ...ENGINE_ERROR, analysis_status: 'ok', confidence: 0.8, rationale: 'r' };
        const client = await connect();
        const out = text(await client.callTool({ name: 'detect_grooming', arguments: { messages: [{ role: 'adult', content: 'a' }] } }));
        expect(out).not.toMatch(/No Grooming Detected/);
        expect(out).toMatch(/Flagged for Review/);
    });

    it('a shared-shape detector with nothing detected but a live action reads as flagged for review', async () => {
        reply = { endpoint: 'coercive_control', detected: false, level: 'none', risk_score: 0.1, confidence: 0.8, categories: [], rationale: 'r', recommended_action: 'flag_for_review' };
        const client = await connect();
        const out = text(await client.callTool({ name: 'detect_coercive_control', arguments: { content: 'x' } }));
        expect(out).not.toMatch(/No Coercive Control Detected/);
        expect(out).toMatch(/Flagged for Review/);
    });
});

describe('3. who is speaking is in the text', () => {
    it('detect_bullying shows speaker_role', async () => {
        reply = { is_bullying: true, bullying_type: ['exclusion'], confidence: 0.9, rationale: 'r', recommended_action: 'flag_for_review', risk_score: 0.6, severity: 'medium', speaker_role: 'reporting_other' };
        const client = await connect();
        const out = text(await client.callTool({ name: 'detect_bullying', arguments: { content: 'x' } }));
        expect(out).toMatch(/Speaker role:\*\* `reporting_other`/);
    });

    it('detect_grooming shows speaker_stance', async () => {
        reply = { grooming_risk: 'high', confidence: 0.9, flags: ['secrecy'], rationale: 'r', risk_score: 0.8, recommended_action: 'flag_for_review', speaker_stance: 'describing_third_party' };
        const client = await connect();
        const out = text(await client.callTool({ name: 'detect_grooming', arguments: { messages: [{ role: 'child', content: 'a' }] } }));
        expect(out).toMatch(/Speaker stance:\*\* `describing_third_party`/);
    });

    it('a shared-shape detector shows speaker_role', async () => {
        reply = { endpoint: 'coercive_control', detected: true, level: 'high', risk_score: 0.8, confidence: 0.9, categories: [], rationale: 'r', recommended_action: 'flag_for_review', speaker_role: 'experiencing' };
        const client = await connect();
        const out = text(await client.callTool({ name: 'detect_coercive_control', arguments: { content: 'x' } }));
        expect(out).toMatch(/Speaker role:\*\* `experiencing`/);
    });
});
