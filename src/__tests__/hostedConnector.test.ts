import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../index.js';

/**
 * WHERE DATA GOES IS SET IN THE DASHBOARD, NOT IN A CHAT.
 *
 * A webhook receives incidents and, for `verification.completed`, the fields
 * read from a person's identity document. `create_webhook` and
 * `update_webhook` choose that address. Through a hosted connector an
 * assistant calls them with whatever it was told, including by a message or
 * document it read: one injected instruction would send every later incident
 * and verification to someone else. OpenAI's directory scan held
 * `create_webhook` for review on 2026-10-20. A host can leave the two out;
 * the tools that only read, test, remove or re-sign a webhook stay.
 */
const KEY = 'test_key_for_registration_only_0123456789';
const names = (options?: Parameters<typeof createServer>[1]) =>
    Object.keys((createServer(KEY, options) as unknown as { _registeredTools: object })._registeredTools);
const DESTINATIONS = ['create_webhook', 'update_webhook'];
const KEPT = ['list_webhooks', 'test_webhook', 'delete_webhook', 'regenerate_webhook_secret'];

describe('a host can leave out the tools that choose where data is sent', () => {
    it('registers them by default, for anyone running this package themselves', () => {
        expect(names()).toEqual(expect.arrayContaining([...DESTINATIONS, ...KEPT]));
    });

    it('registers neither, and every other tool, when the group is excluded', () => {
        const all = names();
        const without = names({ exclude: ['webhook-destinations'] });
        expect(without.filter((n) => DESTINATIONS.includes(n))).toEqual([]);
        expect(without).toEqual(expect.arrayContaining(KEPT));
        expect(without.slice().sort()).toEqual(all.filter((n) => !DESTINATIONS.includes(n)).sort());
    });

    it('combines with leaving out verification', () => {
        const both = names({ exclude: ['verification', 'webhook-destinations'] });
        expect(both).not.toContain('create_webhook');
        expect(both).not.toContain('create_verification_session');
    });
});

describe('the server says who it is', () => {
    it('with a title, a website and an icon a dark page can show', async () => {
        const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
        const server = createServer(KEY);
        const client = new Client({ name: 'test', version: '0' });
        await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
        const info = client.getServerVersion();
        await client.close();
        expect(info).toMatchObject({ name: 'tuteliq-mcp', title: 'Tuteliq', websiteUrl: 'https://tuteliq.ai' });
        expect(info?.icons).toEqual([{ src: 'https://api.tuteliq.ai/favicon.png', mimeType: 'image/png', sizes: ['512x512'] }]);
    });
});

/**
 * WHAT CHANGES THE ACCOUNT ITSELF IS DONE IN THE DASHBOARD.
 *
 * Deleting every record, choosing the key incidents are encrypted to,
 * recording or withdrawing a person's consent, correcting their data and
 * logging a breach (which starts the 72-hour notification clock) are legal or
 * irreversible acts. Through a hosted connector an assistant performs them on
 * whatever it was told, including by a message it read. OpenAI's directory
 * scan flagged register_encryption_key on 2026-10-20. A host can leave the
 * group out; reading the same records stays.
 */
const ADMINISTRATION = ['delete_account_data', 'record_consent', 'withdraw_consent', 'rectify_data', 'log_breach', 'update_breach_status', 'register_encryption_key', 'revoke_encryption_key'];
const STILL_READABLE = ['export_account_data', 'get_consent_status', 'list_breaches', 'get_breach', 'get_encryption_key', 'get_audit_logs'];

describe('a host can leave out the tools that administer the account', () => {
    it('registers them by default', () => {
        expect(names()).toEqual(expect.arrayContaining(ADMINISTRATION));
    });

    it('registers none of them, and every other tool, when the group is excluded', () => {
        const all = names();
        const without = names({ exclude: ['account-administration'] });
        expect(without.filter((n) => ADMINISTRATION.includes(n))).toEqual([]);
        expect(without).toEqual(expect.arrayContaining(STILL_READABLE));
        expect(without.slice().sort()).toEqual(all.filter((n) => !ADMINISTRATION.includes(n)).sort());
    });

    it('offers none of them to a client, and refuses a call to one', async () => {
        const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
        const server = createServer(KEY, { exclude: ['account-administration'] });
        const client = new Client({ name: 'test', version: '0' });
        await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
        const offered = (await client.listTools()).tools.map((t) => t.name);
        const call = await client.callTool({ name: 'delete_account_data', arguments: {} }).then(
            (r) => r.isError === true, () => true);
        await client.close();
        expect(offered.filter((n) => ADMINISTRATION.includes(n))).toEqual([]);
        expect(call).toBe(true);
    });
});

describe('annotations of tools that cannot easily be undone', () => {
    type Registered = { annotations?: Record<string, boolean> };
    const tools = (createServer(KEY) as unknown as { _registeredTools: Record<string, Registered> })._registeredTools;
    it.each([
        // Rotating replaces the key new incidents are encrypted to; a lost private key loses them.
        'register_encryption_key',
        // The same decision as review_incident, on up to 100 incidents.
        'batch_review_incidents',
        // Starts the statutory 72-hour notification clock.
        'log_breach',
    ])('%s is marked destructive, so a client confirms before calling it', (name) => {
        expect(tools[name].annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    });
});
