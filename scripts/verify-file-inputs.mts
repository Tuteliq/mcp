/**
 * Behavioural check for resolveFile's exactly-one-source rule.
 *
 * This package has no test runner, so this is a runnable script rather than a
 * .test.ts that nothing would execute. A test file sitting in a package with no
 * runner is worse than no test: it reads as coverage that does not exist.
 *
 *   npm run verify:file-inputs
 *
 * Covers the regression that prompted the rule: resolveFile used to return on
 * the first source it found, so a caller supplying two silently had the rest
 * discarded, and an agent hedging with both url and base64 received a confident
 * analysis of the wrong file with nothing thrown and nothing warned.
 */
import { resolveFile } from '../src/resolveFile.ts';

const cases: Array<[string, Record<string, string>, RegExp]> = [
  ['two sources (url + base64)', { url: 'https://e.com/a.mp4', base64: 'AAAA' },
    /Ambiguous file source: received url and base64/],
  ['all three sources', { file_path: '/tmp/a', url: 'https://e.com/a', base64: 'AA' },
    /Ambiguous file source/],
  ['no source', {}, /Supply exactly one of file_path, url or base64/],
  ['all empty strings', { file_path: '', url: '', base64: '' }, /No file source provided/],
];

let failures = 0;
for (const [name, input, expected] of cases) {
  try {
    await resolveFile(input);
    console.error(`FAIL  ${name}: resolved instead of throwing`);
    failures++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (expected.test(msg)) console.log(`ok    ${name}`);
    else { console.error(`FAIL  ${name}: ${msg}`); failures++; }
  }
}

const single = await resolveFile({ base64: Buffer.from('hello').toString('base64'), filename: 'x.txt' });
if (single.buffer.toString() === 'hello' && single.filename === 'x.txt') console.log('ok    single source still resolves');
else { console.error('FAIL  single source regressed'); failures++; }

const dataUri = await resolveFile({ base64: 'data:text/plain;base64,' + Buffer.from('hi').toString('base64') });
if (dataUri.buffer.toString() === 'hi') console.log('ok    data URI prefix still stripped');
else { console.error('FAIL  data URI handling regressed'); failures++; }

console.log(failures ? `\n${failures} failure(s)` : '\nall file-input behaviours verified');
process.exit(failures ? 1 : 0);
