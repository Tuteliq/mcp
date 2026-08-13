import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

/**
 * Resource URI for a widget, carrying the package version.
 *
 * MCP hosts cache `ui://` resources by URI, and these URIs used to be fixed
 * (`ui://tuteliq/detection-result.html`). A client that had loaded a widget
 * once kept serving its cached copy for good, so no widget change reached an
 * existing connection: 3.21.3 shipped a redesigned card and connected clients
 * still rendered the 3.21.2 one, chrome bar and all.
 *
 * Putting the version in the path makes every release a distinct resource the
 * host has never seen, so it fetches the new copy. The trade is one extra fetch
 * per widget per release, which is the point.
 *
 * `name` is the widget's basename in `dist-ui`, without the extension.
 */
export function widgetUri(name: string): string {
  return `ui://tuteliq/${pkg.version}/${name}.html`;
}
