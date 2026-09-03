/**
 * Freshness report for the npm `overrides` block.
 *
 * Dependabot cannot see this block. It raises PRs for direct dependencies and
 * security alerts for anything vulnerable, but it has no rule that rewrites an
 * override, so every pin in there is a package that will never get an update PR
 * from anyone. That gap is not theoretical: `fast-uri` sat at 4.1.2 under a
 * `>=4.1.2` floor while four high-severity advisories were published against
 * <4.1.3, and the only reason it surfaced was a compliance dashboard reading the
 * alert feed. Dependabot's own PR for that round patched `qs` and left the
 * fast-uri floor untouched, because it could not do otherwise.
 *
 * The trap is that a `>=X` floor does not pull anything forward. Once the
 * lockfile holds a version satisfying the range, later installs leave it alone —
 * `>=4.1.2` is perfectly happy with 4.1.2 forever. So the floor silently stops
 * meaning "at least this new" and starts meaning "whatever we happened to
 * resolve once".
 *
 *   npm run check:overrides
 *
 * This is advisory, not a gate: it always exits 0. `npm audit` is the thing that
 * fails a build, and it already answers "is this version vulnerable today". This
 * answers the earlier question — "is this pin drifting far enough behind that
 * the next advisory will land on us" — and flags a floor pinned to the exact
 * version it resolved, which is the shape the fast-uri miss took.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

type Status = 'current' | 'behind' | 'pinned-at-floor' | 'unused';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

const overrides: Record<string, string> = pkg.overrides ?? {};
const names = Object.keys(overrides);

if (names.length === 0) {
  console.log('No overrides declared — nothing to check.');
  process.exit(0);
}

/** Numeric-segment compare. Every version we pin is a plain x.y.z release. */
function compare(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0) ? -1 : 1;
  }
  return 0;
}

/** Every version of `name` present in the lockfile, deduped. */
function installedVersions(name: string): string[] {
  const found = new Set<string>();
  for (const [path, entry] of Object.entries<any>(lock.packages ?? {})) {
    if (path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`)) {
      if (entry?.version) found.add(entry.version);
    }
  }
  return [...found].sort(compare);
}

function latestVersion(name: string): string | null {
  try {
    return execFileSync('npm', ['view', name, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const floorOf = (range: string) => range.replace(/^[>=^~\s]+/, '').trim();
const rows: Array<{ name: string; range: string; installed: string; latest: string; status: Status }> = [];

for (const name of names) {
  const range = overrides[name];
  const installed = installedVersions(name);

  if (installed.length === 0) {
    rows.push({ name, range, installed: '—', latest: '—', status: 'unused' });
    continue;
  }

  const latest = latestVersion(name);
  const lowest = installed[0];
  const floor = floorOf(range);

  let status: Status = 'current';
  if (latest && compare(lowest, latest) < 0) {
    status = compare(lowest, floor) === 0 ? 'pinned-at-floor' : 'behind';
  }

  rows.push({ name, range, installed: installed.join(', '), latest: latest ?? '?', status });
}

const width = (key: 'name' | 'range' | 'installed' | 'latest', header: string) =>
  Math.max(...rows.map((r) => r[key].length), header.length);
const wName = width('name', 'package');
const wRange = width('range', 'floor');
const wInst = width('installed', 'installed');
const wLatest = width('latest', 'latest');

console.log(
  `${'package'.padEnd(wName)}  ${'floor'.padEnd(wRange)}  ${'installed'.padEnd(wInst)}  ${'latest'.padEnd(wLatest)}`,
);
console.log('-'.repeat(wName + wRange + wInst + wLatest + 6));
for (const r of rows) {
  const flag = r.status === 'current' ? '' : `  <- ${r.status}`;
  console.log(
    `${r.name.padEnd(wName)}  ${r.range.padEnd(wRange)}  ${r.installed.padEnd(wInst)}  ${r.latest.padEnd(wLatest)}${flag}`.trimEnd(),
  );
}

// GitHub Actions annotations, so the summary is readable without opening the log.
const isCI = process.env.GITHUB_ACTIONS === 'true';
for (const r of rows.filter((x) => x.status === 'pinned-at-floor')) {
  const msg =
    `Override "${r.name}": "${r.range}" resolved to ${r.installed}, the exact floor, but ` +
    `${r.latest} is published. The floor is no longer pulling anything forward — raise it ` +
    `to >=${r.latest} (or run npm update ${r.name}) so the next advisory does not land on a stale pin.`;
  console.log(isCI ? `::warning title=Stale override::${msg}` : `\nWARNING  ${msg}`);
}
for (const r of rows.filter((x) => x.status === 'unused')) {
  const msg =
    `Override "${r.name}" matches nothing in the lockfile. The dependency it was pinning is ` +
    `gone, so the entry is dead weight — drop it from package.json.`;
  console.log(isCI ? `::warning title=Unused override::${msg}` : `\nWARNING  ${msg}`);
}

const stale = rows.filter((r) => r.status === 'pinned-at-floor' || r.status === 'unused').length;
console.log(
  `\n${rows.length} override(s) checked, ${stale} needing attention. ` +
    `Advisory only — npm audit is the gate.`,
);
