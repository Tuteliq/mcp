import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * server.json is what the MCP Registry tells clients about us. It is edited
 * by hand at release time, so it drifts silently: it once advertised 3.22.2
 * while the package was at 4.2.6, and its hosted remote never said it needs
 * an API key, so automated checkers read the 401 as a broken server.
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

    it('declares that every hosted remote needs a secret API key', () => {
        expect(entry.remotes.length).toBeGreaterThan(0);
        for (const remote of entry.remotes) {
            const auth = (remote.headers ?? []).find(
                (h: { name: string }) => h.name === 'Authorization',
            );
            expect(auth, `${remote.url} declares no Authorization header`).toBeDefined();
            expect(auth.isRequired).toBe(true);
            expect(auth.isSecret || Object.values(auth.variables ?? {}).some((v: any) => v.isSecret)).toBe(true);
        }
    });
});
