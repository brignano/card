// Builds the published package: one entry file plus lazily loaded chunks in
// dist/, with every dependency bundled in, so `npx brignano` downloads a single
// small tarball instead of resolving and installing a dependency tree.
//
// `tsc` only type-checks (noEmit); esbuild emits.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

execFileSync('npx', ['tsc', '--noEmit'], { cwd: root, stdio: 'inherit' });

rmSync(dist, { recursive: true, force: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/card.ts'],
  outdir: 'dist',
  bundle: true,
  // Splitting keeps the action-only dependencies (clipboard, browser opener,
  // QR renderer) in their own chunks, read only when an action runs.
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  minify: true,
  legalComments: 'none',
  metafile: true,
  // Bundled CommonJS dependencies call `require` for Node built-ins.
  banner: {
    js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);",
  },
});

// --- Helper binaries -----------------------------------------------------------
// Two dependencies look for helper programs next to their own file and fall
// back to them when the system has none: clipboardy (`../fallbacks/…` — xsel on
// Linux, a clipboard .exe on Windows) and open (`./xdg-open`). Both now run from
// dist/chunks/, so the helpers are copied to where those paths resolve.
const modules = join(root, 'node_modules');
cpSync(join(modules, 'clipboardy', 'fallbacks'), join(dist, 'fallbacks'), {
  recursive: true,
});
cpSync(join(modules, 'open', 'xdg-open'), join(dist, 'chunks', 'xdg-open'));

// --- Third-party licences ------------------------------------------------------
// The bundle carries other people's code, so their licence texts ship with it.

function packageDir(input) {
  const at = input.lastIndexOf('node_modules/');
  if (at === -1) return undefined;
  const parts = input.slice(at + 'node_modules/'.length).split('/');
  const name = parts[0]?.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  return join(root, input.slice(0, at), 'node_modules', name);
}

const packages = new Map();
for (const input of Object.keys(result.metafile.inputs)) {
  const dir = packageDir(input);
  if (!dir || packages.has(dir)) continue;
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const file = [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'license',
    'license.md',
    'LICENCE',
  ]
    .map((name) => join(dir, name))
    .find((path) => existsSync(path));
  packages.set(dir, {
    id: `${pkg.name}@${pkg.version}`,
    license: typeof pkg.license === 'string' ? pkg.license : 'see package',
    text: file ? readFileSync(file, 'utf8').trim() : '(no licence file in the package)',
  });
}

const notices = [...packages.values()]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((p) => `${p.id} (${p.license})\n${'-'.repeat(72)}\n${p.text}\n`);

writeFileSync(
  join(dist, 'THIRD-PARTY-LICENSES.txt'),
  `This package bundles the following third-party software.\n\n${notices.join('\n')}`,
);

const bytes = Object.values(result.metafile.outputs).reduce((n, o) => n + o.bytes, 0);
const files = Object.keys(result.metafile.outputs).length;
console.log(
  `dist: ${files} files, ${(bytes / 1024).toFixed(0)} kB, ${packages.size} bundled packages`,
);
