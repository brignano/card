import assert from 'node:assert/strict';
import { test } from 'node:test';
import boxen from 'boxen';
import stringWidth from 'string-width';
import { hyperlink, supportsHyperlinks } from '../src/ui.js';

const OPEN = '\u001b]8;;';
const BEL = '\u0007';

test('hyperlinks are on for a full-glyph colour TTY', () => {
  assert.equal(supportsHyperlinks({ TERM: 'xterm-256color' }, true, 'full'), true);
});

test('hyperlinks are off wherever the sequence would be noise', () => {
  const env = { TERM: 'xterm-256color' };
  assert.equal(supportsHyperlinks(env, false, 'full'), false, 'piped output');
  assert.equal(supportsHyperlinks(env, true, 'basic'), false, 'legacy Windows console');
  assert.equal(supportsHyperlinks(env, true, 'ascii'), false, 'Linux kernel console');
  assert.equal(
    supportsHyperlinks({ TERM: 'dumb' }, true, 'full'),
    false,
    'dumb terminal',
  );
  assert.equal(supportsHyperlinks({ ...env, CI: 'true' }, true, 'full'), false, 'CI');
  assert.equal(
    supportsHyperlinks({ ...env, NO_COLOR: '1' }, true, 'full'),
    false,
    'NO_COLOR',
  );
});

test('a supported link wraps the text in OSC 8 and keeps the text itself', () => {
  assert.equal(
    hyperlink('hi@brignano.io', 'mailto:hi@brignano.io', true),
    `${OPEN}mailto:hi@brignano.io${BEL}hi@brignano.io${OPEN}${BEL}`,
  );
});

test('an unsupported link is the text, byte for byte', () => {
  assert.equal(
    hyperlink('hi@brignano.io', 'mailto:hi@brignano.io', false),
    'hi@brignano.io',
  );
});

test('a target with a control character is never written', () => {
  for (const url of ['https://x.test/\u0007evil', 'https://x.test/\u001b]8;;', 'a\nb']) {
    assert.equal(hyperlink('repo', url, true), 'repo');
  }
});

test('a link adds no width, so the box and centering do not move', () => {
  const plain = 'https://github.com/brignano';
  const linked = hyperlink(plain, plain, true);
  assert.equal(stringWidth(linked), stringWidth(plain));
  const strip = (text: string) =>
    text.replaceAll(`${OPEN}${plain}${BEL}`, '').replaceAll(`${OPEN}${BEL}`, '');
  assert.equal(strip(boxen(linked, { padding: 1 })), boxen(plain, { padding: 1 }));
});
