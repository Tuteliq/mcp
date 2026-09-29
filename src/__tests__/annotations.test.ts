import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
 * Three tools genuinely do reach outward, and they are the exception this file
 * pins. `test_webhook` dispatches to a customer-supplied URL; `create_webhook`
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

    it('does NOT blanket-claim openWorldHint: true', () => {
        const src = toolSources();
        const trues = src.match(/openWorldHint:\s*true/g) ?? [];
        expect(
            trues.length,
            'openWorldHint: true appears more than the three external-destination tools justify; '
            + 'a detection call against our own service is a closed domain and claiming otherwise '
            + 'over-states what the tool may touch',
        ).toBeLessThanOrEqual(EXTERNAL.length);
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
