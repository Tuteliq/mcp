import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * NO PURCHASE LINKS IN MCP TOOL OUTPUT.
 *
 * This is a compliance claim, not a style preference. The ChatGPT plugin
 * submission asks whether the plugin "links or directs users out of ChatGPT to
 * make purchases", and we answer no. That answer is only true while no tool
 * emits a checkout or upgrade URL.
 *
 * It was not true before 2026-09-29: eight call sites emitted one, seven as
 * "Upgrade at: https://tuteliq.ai/dashboard" on a feature gate and one as an
 * [Upgrade](...) link once a customer passed 80% of quota. Those are easy to
 * reintroduce, because adding an upsell to a new gated tool is a natural thing
 * to do and nothing else would notice.
 *
 * The feature-gate MESSAGES stay. Telling a customer their plan does not cover
 * something is useful and is not commerce. Pointing them at a payment page from
 * inside ChatGPT is what the rule is about.
 *
 * Documentation links (docs.tuteliq.ai) are deliberately allowed.
 */

const TOOLS_DIR = join(__dirname, '..', 'tools');

/** Anything that would take a user to a place where money changes hands. */
const COMMERCE_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
    ['an upgrade call to action with a URL', /Upgrade at:\s*https?:\/\//i],
    ['a markdown Upgrade link', /\[Upgrade\]\(/i],
    ['the credits purchase page', /dashboard\/credits/i],
    ['the public pricing page', /tuteliq\.ai\/pricing/i],
    ['a buy_credits field echoed into output', /buy_credits/],
    ['an upgrade_url field echoed into output', /upgrade_url/],
    ['a checkout URL', /https?:\/\/[^\s'"`)]*checkout/i],
];

function toolFiles(): string[] {
    return readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
}

describe('MCP tool output carries no route to a purchase', () => {
    it('finds tool files to check, so this test cannot pass vacuously', () => {
        expect(toolFiles().length).toBeGreaterThan(5);
    });

    it.each(toolFiles())('%s emits no commerce link', (file) => {
        const src = readFileSync(join(TOOLS_DIR, file), 'utf8');
        for (const [label, pattern] of COMMERCE_PATTERNS) {
            expect(
                pattern.test(src),
                `${file} contains ${label}. The plugin submission declares that we do not direct `
                + 'users out of ChatGPT to make purchases; this would make that declaration false.',
            ).toBe(false);
        }
    });

    it('still allows documentation links, which are not commerce', () => {
        const src = readFileSync(join(TOOLS_DIR, 'resources.ts'), 'utf8');
        expect(src).toMatch(/docs\.tuteliq\.ai/);
    });

    it('KEEPS the feature-gate messages: the fix removed links, not information', () => {
        const gated = ['detection.ts', 'analysis.ts', 'media.ts', 'verification.ts'];
        for (const f of gated) {
            const src = readFileSync(join(TOOLS_DIR, f), 'utf8');
            expect(
                /plan does not include|upsellResult\.message/.test(src),
                `${f} lost its plan-limitation message; a customer now gets a bare failure`,
            ).toBe(true);
        }
    });
});
