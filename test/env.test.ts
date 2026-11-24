import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  type Flags,
  isInteractive,
  parseFlags,
  shouldAnimate,
  type Terminal,
  unknownFlags,
} from '../src/env.ts';

const NONE: Flags = parseFlags([]);

test('no arguments sets no flag', () => {
  assert.ok(Object.values(NONE).every((value) => value === false));
});

test('every alias sets its flag and nothing else', () => {
  const aliases: Record<keyof Flags, string[]> = {
    help: ['--help', '-h'],
    version: ['--version', '-v', '-V'],
    view: ['--view', '--resume', '-r'],
    download: ['--download', '-d'],
    email: ['--email', '-e'],
    qr: ['--qr'],
    vcard: ['--vcard', '--save-contact'],
    noPrompt: ['--no-prompt', '--quiet'],
    noAnimation: ['--no-animation'],
  };
  for (const [flag, tokens] of Object.entries(aliases)) {
    for (const token of tokens) {
      assert.deepEqual(parseFlags([token]), { ...NONE, [flag]: true }, token);
    }
  }
});

test('several flags can be given at once, in any order', () => {
  assert.deepEqual(parseFlags(['--no-animation', '--qr']), {
    ...NONE,
    qr: true,
    noAnimation: true,
  });
});

test('known flags are not reported as unknown', () => {
  assert.deepEqual(unknownFlags(['--help', '-v', '--no-prompt', '--save-contact']), []);
});

test('typos and unsupported flags are reported, in order', () => {
  assert.deepEqual(unknownFlags(['--qr', '--hepl', '-x', '--vcard=1']), [
    '--hepl',
    '-x',
    '--vcard=1',
  ]);
});

test('combined short flags set each flag', () => {
  assert.deepEqual(parseFlags(['-rv']), { ...NONE, view: true, version: true });
  assert.deepEqual(parseFlags(['-he']), { ...NONE, help: true, email: true });
  assert.deepEqual(unknownFlags(['-rv']), []);
});

test('an unknown letter in a combined short flag is reported', () => {
  assert.deepEqual(unknownFlags(['-rx']), ['-x']);
});

test('a short letter only counts in its short form', () => {
  assert.deepEqual(unknownFlags(['--V', '--h']), ['--V', '--h']);
});

test('stray positional arguments are reported like unknown flags', () => {
  assert.deepEqual(unknownFlags(['hello', 'brignano']), ['hello', 'brignano']);
  assert.deepEqual(unknownFlags(['--qr', 'hello']), ['hello']);
  assert.deepEqual(unknownFlags(['--', '--qr']), ['--', '--qr']);
});

const TTY: Terminal = { env: {}, stdinIsTTY: true, stdoutIsTTY: true };

test('the prompt shows only on a two-way terminal, outside CI, without --no-prompt', () => {
  assert.equal(isInteractive(NONE, TTY), true);
  assert.equal(isInteractive(NONE, { ...TTY, stdinIsTTY: false }), false, 'piped in');
  assert.equal(isInteractive(NONE, { ...TTY, stdoutIsTTY: false }), false, 'piped out');
  assert.equal(isInteractive(NONE, { ...TTY, env: { CI: 'true' } }), false, 'CI');
  assert.equal(isInteractive({ ...NONE, noPrompt: true }, TTY), false, '--no-prompt');
});

test('the prompt does not care about animation or colour settings', () => {
  assert.equal(isInteractive({ ...NONE, noAnimation: true }, TTY), true);
  assert.equal(isInteractive(NONE, { ...TTY, env: { NO_COLOR: '1' } }), true);
});

test('the animation plays only on a terminal, outside CI, with colour and no opt-out', () => {
  assert.equal(shouldAnimate(NONE, TTY), true);
  // Animation only writes, so piped input does not stop it.
  assert.equal(shouldAnimate(NONE, { ...TTY, stdinIsTTY: false }), true, 'piped in');
  assert.equal(shouldAnimate(NONE, { ...TTY, stdoutIsTTY: false }), false, 'piped out');
  assert.equal(shouldAnimate(NONE, { ...TTY, env: { CI: 'true' } }), false, 'CI');
  assert.equal(
    shouldAnimate(NONE, { ...TTY, env: { NO_COLOR: '1' } }),
    false,
    'NO_COLOR',
  );
  assert.equal(shouldAnimate({ ...NONE, noPrompt: true }, TTY), false, '--no-prompt');
  assert.equal(
    shouldAnimate({ ...NONE, noAnimation: true }, TTY),
    false,
    '--no-animation',
  );
});

test('an empty CI or NO_COLOR counts as unset', () => {
  assert.equal(isInteractive(NONE, { ...TTY, env: { CI: '' } }), true);
  assert.equal(shouldAnimate(NONE, { ...TTY, env: { NO_COLOR: '' } }), true);
});
