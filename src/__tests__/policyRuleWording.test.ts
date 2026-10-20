import { describe, it, expect } from 'vitest';
import { toJSONSchema } from 'zod/v4/core';
import { createServer } from '../index.js';

/**
 * A POLICY RULE LABELS A RESULT. IT SENDS NOTHING.
 *
 * A matching rule adds `policy_action` to the detection result returned to the
 * caller; the account's own system applies it. Tuteliq does not block, contact
 * or notify anyone, and `escalate_to` and `notify_channel` are stored labels.
 * The definitions said otherwise ("e.g., email", "slack", "without a human or
 * agent in the loop"), and OpenAI's directory scan held both tools for review
 * on 2026-10-20. Every description a client sees must say what the tool does.
 */
type Registered = { description?: string; inputSchema?: unknown };
const tools = (createServer('test_key_for_registration_only_0123456789') as unknown as { _registeredTools: Record<string, Registered> })._registeredTools;
const RULE_TOOLS = ['create_policy_rule', 'update_policy_rule'];

const text = (name: string): string => {
    // The SDK registers the shape as its own zod object (zod/mini), so read it with core's converter.
    const json = toJSONSchema(tools[name].inputSchema as Parameters<typeof toJSONSchema>[0]);
    return `${tools[name].description ?? ''}\n${JSON.stringify(json)}`;
};

describe('policy rule definitions', () => {
    it.each(RULE_TOOLS)('%s is registered with its action fields, so this cannot pass vacuously', (name) => {
        expect(text(name)).toContain('escalate_to');
        expect(text(name)).toContain('notify_channel');
    });

    it.each(RULE_TOOLS)('%s names no destination Tuteliq would send to', (name) => {
        expect(text(name)).not.toMatch(/e\.g\., (email|slack)|webhook url/i);
    });

    it.each(RULE_TOOLS)('%s says the routing fields are labels Tuteliq sends nothing to', (name) => {
        const json = text(name);
        for (const field of ['escalate_to', 'notify_channel']) {
            expect(json).toMatch(new RegExp(`"${field}":\\{[^}]*Tuteliq sends nothing`));
        }
    });

    it('create_policy_rule says the result is labelled for the caller, not acted on', () => {
        const d = tools.create_policy_rule.description ?? '';
        expect(d).not.toMatch(/without a human/i);
        expect(d).toMatch(/policy_action/);
        expect(d).toMatch(/does not block, contact or notify anyone/);
    });
});
