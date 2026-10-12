import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../index.js';

/**
 * TOOL ANNOTATIONS ARE CLAIMS WE SIGN FOR.
 *
 * Both directory submissions ask us to justify every annotation, and OpenAI's
 * scan compares what the server reports against what we declared. Until
 * 2026-09-29 every tool claimed `openWorldHint: true`, which says a tool may
 * interact with an open world of external entities. For a detection call
 * against our own service on user-supplied content that is not true: the domain
 * is closed, like a database query rather than a web search. It over-claimed on
 * 77 of 80 tools.
 *
 * Three tools reach outward by their purpose, and they are pinned first below.
 * (Two further kinds of tool reach outward as a consequence of an input they
 * take; those are pinned in the second half of this file.) `test_webhook` dispatches to a customer-supplied URL; `create_webhook`
 * and `update_webhook` configure that destination.
 *
 * The second assertion exists because of a mistake made while fixing the first:
 * pointing `update_webhook` at the new constant silently downgraded its
 * `destructiveHint` from true to false. A destructive hint is what tells a
 * client to confirm before calling, so weakening one by accident is worse than
 * the over-claim being fixed.
 */

const TOOLS_DIR = join(__dirname, '..', 'tools');
const EXTERNAL = ['create_webhook', 'update_webhook', 'test_webhook'];

function toolSources(): string {
    return readdirSync(TOOLS_DIR)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
        .map((f) => readFileSync(join(TOOLS_DIR, f), 'utf8'))
        .join('\n');
}

describe('tool annotations', () => {
    it('finds tool sources, so this cannot pass vacuously', () => {
        expect(toolSources().length).toBeGreaterThan(1000);
    });

    it('KEEPS update_webhook destructive: the fix must not weaken a safety hint', () => {
        const src = readFileSync(join(TOOLS_DIR, 'admin.ts'), 'utf8');
        const i = src.indexOf("'update_webhook',");
        expect(i).toBeGreaterThan(-1);
        const block = src.slice(i, i + 400);
        const ann = block.match(/annotations:\s*(\w+)/)?.[1];
        expect(ann).toBeTruthy();
        // Whichever constant it points at must still assert destructiveHint.
        const constDef = src.match(new RegExp(`const ${ann} = \\{[^}]*\\}`))?.[0] ?? '';
        expect(
            constDef,
            `update_webhook points at ${ann}, which does not set destructiveHint: true; `
            + 'a client relies on that to confirm before overwriting a webhook configuration',
        ).toMatch(/destructiveHint:\s*true/);
    });

    it('the external-destination tools are exactly the ones that reach outward', () => {
        const src = readFileSync(join(TOOLS_DIR, 'admin.ts'), 'utf8');
        for (const name of EXTERNAL) {
            const i = src.indexOf(`'${name}',`);
            expect(i, `${name} not found`).toBeGreaterThan(-1);
            const ann = src.slice(i, i + 400).match(/annotations:\s*(\w+)/)?.[1] ?? '';
            expect(
                ann,
                `${name} dispatches to or configures a customer-supplied URL and must claim openWorldHint`,
            ).toMatch(/EXTERNAL_DESTINATION/);
        }
    });
});

/**
 * THE SAME CLAIMS, CHECKED ON THE SERVER AS IT IS REGISTERED.
 *
 * The 2026-09-29 correction above went too far in one direction. It marked
 * every detection tool read-only and closed-world, including the ones that
 * take correlation fields because a detection is stored as an incident and
 * delivered to the account's webhooks, and the ones that download their input
 * from a URL the caller names. A directory scan on 2026-10-12 flagged both.
 *
 * These read the registered tools, not the source text, so a tool cannot gain
 * such an input and keep the wrong claim.
 */
describe('annotations follow from what a tool takes', () => {
    type Registered = { annotations?: Record<string, boolean>; inputSchema?: unknown };
    const server = createServer('test_key_for_registration_only_0123456789') as unknown as { _registeredTools: Record<string, Registered> };
    const tools = server._registeredTools;
    const names = Object.keys(tools);
    const inputs = (name: string): string[] => {
        const schema = tools[name].inputSchema as { shape?: Record<string, unknown>; def?: { shape?: Record<string, unknown> } } | undefined;
        return Object.keys(schema?.shape ?? schema?.def?.shape ?? {});
    };
    const CORRELATION = ['external_id', 'customer_id', 'metadata', 'incident_moderation_enabled'];
    // `list_incidents` takes external_id as a filter on a read. `create_verification_session` is already declared
    // as writing. `batch_analyze` takes the correlation fields per item, one level down.
    const recordsAndNotifies = [
        ...names.filter((n) => inputs(n).some((k) => CORRELATION.includes(k)) && n !== 'list_incidents' && n !== 'create_verification_session'),
        'batch_analyze',
    ];
    // Any input whose name ends in `url`, not only one named exactly `url`: `redirect_url` on
    // `create_verification_session` passed the narrower rule and was left closed-world.
    const takesUrl = names.filter((n) => inputs(n).some((k) => /url$/i.test(k)) && !EXTERNAL.includes(n));
    const fetchesUrl = takesUrl;

    it('reads the registered tools, so this cannot pass vacuously', () => {
        expect(names.length).toBeGreaterThan(70);
        expect(inputs('detect_bullying')).toContain('external_id');
        expect(recordsAndNotifies.length).toBeGreaterThanOrEqual(19);
        expect(fetchesUrl).toEqual(expect.arrayContaining(['analyze_voice', 'analyze_image', 'analyze_video', 'analyze_document']));
        expect(takesUrl).toContain('create_verification_session');
    });

    it.each(recordsAndNotifies)('%s can store an incident and notify a webhook: not read-only, not closed-world, not destructive', (name) => {
        expect(tools[name].annotations).toMatchObject({ readOnlyHint: false, openWorldHint: true, destructiveHint: false });
    });

    it.each(fetchesUrl)('%s takes a URL the caller names: not closed-world', (name) => {
        expect(tools[name].annotations).toMatchObject({ openWorldHint: true });
    });

    it('claims openWorldHint on exactly those tools and the three webhook tools, and on no other', () => {
        const claimed = names.filter((n) => tools[n].annotations?.openWorldHint === true).sort();
        expect(claimed).toEqual([...new Set([...recordsAndNotifies, ...fetchesUrl, ...EXTERNAL])].sort());
    });

    it('every tool declares all three hints', () => {
        for (const name of names) {
            expect(Object.keys(tools[name].annotations ?? {}), name).toEqual(expect.arrayContaining(['readOnlyHint', 'openWorldHint', 'destructiveHint']));
        }
    });
});

describe('a host can leave the verification tools out', () => {
    const list = (options?: Parameters<typeof createServer>[1]) =>
        Object.keys((createServer('test_key_for_registration_only_0123456789', options) as unknown as { _registeredTools: object })._registeredTools);
    const VERIFICATION = ['create_verification_session', 'get_verification_session', 'cancel_verification_session'];

    it('registers them by default', () => {
        expect(list()).toEqual(expect.arrayContaining(VERIFICATION));
    });

    it('registers none of them, and every other tool, when the group is excluded', () => {
        const all = list();
        const without = list({ exclude: ['verification'] });
        expect(without.filter((n) => VERIFICATION.includes(n))).toEqual([]);
        expect(without.slice().sort()).toEqual(all.filter((n) => !VERIFICATION.includes(n)).sort());
    });
});
