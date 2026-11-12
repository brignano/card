// The published package has no dependencies: everything is bundled into dist/.
// A missing or unbundled import would only show up after publishing, so this
// packs the tarball, unpacks it somewhere with no node_modules in reach, and
// runs it from there. Needs `npm run build` first, like the rest of `npm test`.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  accessSync,
  constants,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const version = (
  JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }
).version;

let dir: string;
let entry: string;

function run(...args: string[]): string {
  return execFileSync(process.execPath, [entry, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true' },
  });
}

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'brignano-pack-'));
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  // `npm pack` always runs `prepare`, so the tarball comes from a fresh build.
  // It prints that build's output ahead of `--json`, so find the tarball on
  // disk rather than parsing stdout.
  execFileSync(npm, ['pack', '--pack-destination', dir], {
    cwd: root,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  const filename = readdirSync(dir).find((name) => name.endsWith('.tgz'));
  assert.ok(filename, 'npm pack produced no tarball');
  execFileSync('tar', ['-xzf', filename], { cwd: dir });
  entry = join(dir, 'package', 'dist', 'card.js');
});

after(() => rmSync(dir, { recursive: true, force: true }));

test('the packed package declares no runtime dependencies', () => {
  const pkg = JSON.parse(readFileSync(join(dir, 'package', 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  assert.deepEqual(pkg.dependencies ?? {}, {});
});

test('the packed card runs with no node_modules', () => {
  assert.equal(run('--version').trim(), version);
  assert.match(run('--no-prompt'), /Anthony Brignano/);
  assert.match(run('--help'), /Usage: npx brignano/);
});

test('the lazily loaded QR renderer is in the package', () => {
  assert.match(run('--qr'), /▄/);
});

test('every lazily loaded chunk imports cleanly', async () => {
  const chunks = join(dir, 'package', 'dist', 'chunks');
  for (const file of readdirSync(chunks).filter((name) => name.endsWith('.js'))) {
    await assert.doesNotReject(import(pathToFileURL(join(chunks, file)).href), file);
  }
});

// clipboardy and open resolve these relative to the chunk they were bundled into.
test('the clipboard and browser helpers sit where the chunks look for them', () => {
  const chunks = join(dir, 'package', 'dist', 'chunks');
  const chunkOf = (name: string) => {
    const file = readdirSync(chunks).find((f) => f.startsWith(`${name}-`));
    assert.ok(file, `no ${name} chunk: the helper paths below assume one`);
    return join(chunks, file);
  };
  const mode = process.platform === 'win32' ? constants.F_OK : constants.X_OK;
  // clipboardy: `../fallbacks/…` from its own file; open: `./xdg-open`.
  const clipboardy = dirname(chunkOf('clipboardy'));
  accessSync(join(clipboardy, '..', 'fallbacks', 'linux', 'xsel'), mode);
  accessSync(join(clipboardy, '..', 'fallbacks', 'windows', 'clipboard_x86_64.exe'));
  accessSync(join(dirname(chunkOf('open')), 'xdg-open'), mode);
});

test('third-party licences ship with the bundle', () => {
  const text = readFileSync(
    join(dir, 'package', 'dist', 'THIRD-PARTY-LICENSES.txt'),
    'utf8',
  );
  for (const name of ['chalk@', 'boxen@', '@inquirer/core@', 'clipboardy@', 'open@']) {
    assert.ok(text.includes(name), `${name} is missing from the licence file`);
  }
});
