import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * server.json is what the MCP Registry tells clients about us. It is edited
 * by hand at release time, so it drifts silently: it once advertised 3.22.2
 * while the package was at 4.2.6.
 *
 * The hosted remote authenticates with MCP OAuth (a 401 points the client at
 * the protected-resource metadata). Declaring a required Authorization header
 * here would make registry clients ask for a pasted API key and skip the
 * OAuth sign-in, so the remote must not declare one.
 */

const ROOT = join(__dirname, '..', '..');
const readJson = (file: string) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));

const pkg = readJson('package.json');
const entry = readJson('server.json');

describe('MCP Registry entry (server.json)', () => {
    it('uses the package name the registry knows us by', () => {
        expect(entry.name).toBe(pkg.mcpName);
    });

    it('advertises the current package version', () => {
        expect(entry.version).toBe(pkg.version);
        for (const p of entry.packages) {
            expect(p.version).toBe(pkg.version);
        }
    });

    it('leaves hosted remotes to OAuth instead of a pasted API key header', () => {
        expect(entry.remotes.length).toBeGreaterThan(0);
        for (const remote of entry.remotes) {
            const auth = (remote.headers ?? []).find(
                (h: { name: string }) => h.name.toLowerCase() === 'authorization',
            );
            expect(auth, `${remote.url} declares an Authorization header`).toBeUndefined();
        }
    });
});
