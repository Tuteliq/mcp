import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Where this package lives on disk, and what version it is.
 *
 * These used to be hard-coded relative hops (`../../package.json`,
 * `../../../dist-ui`) counted from the compiled layout, so they only resolved
 * when the modules ran out of `dist/`. Run the same file from source — `tsx`,
 * or a test importing `src/tools/*` — and the hops landed one directory above
 * the package, reading a `package.json` that belongs to something else or
 * failing outright. Walking up to the package's own manifest works from either
 * layout.
 */
function findPackageRoot(start: string): string {
    let dir = start;
    for (let depth = 0; depth < 8; depth++) {
        const manifest = resolve(dir, 'package.json');
        if (existsSync(manifest)) {
            try {
                if (JSON.parse(readFileSync(manifest, 'utf-8')).name === '@tuteliq/mcp') return dir;
            } catch {
                // Unreadable or malformed — keep walking rather than give up here.
            }
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return start;
}

export const PACKAGE_ROOT = findPackageRoot(dirname(fileURLToPath(import.meta.url)));

export const PACKAGE_VERSION = (() => {
    try {
        return JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'package.json'), 'utf-8')).version ?? '0.0.0';
    } catch {
        return '0.0.0';
    }
})();

/** Built widget bundles. Produced by `npm run build:ui`. */
export const WIDGET_DIR = resolve(PACKAGE_ROOT, 'dist-ui');

/** Read a built widget bundle by basename, e.g. `detection-result.html`. */
export function loadWidget(name: string): string {
    return readFileSync(resolve(WIDGET_DIR, name), 'utf-8');
}
