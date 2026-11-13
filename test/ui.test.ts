import assert from 'node:assert/strict';
import { test } from 'node:test';
import boxen from 'boxen';
import stringWidth from 'string-width';
import {
  center,
  hyperlink,
  isLightTerminal,
  mix,
  sample,
  supportsHyperlinks,
  tokens,
} from '../src/ui.ts';

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

// --- center ---------------------------------------------------------------

test('center pads each line to the middle of the width', () => {
  assert.equal(center('ab', 10), '    ab');
  assert.equal(center('abc', 10), '   abc', 'an odd gap rounds the left pad down');
  assert.equal(center('ab\nabcdef', 10), '    ab\n  abcdef');
});

test('center leaves empty lines and lines too wide alone', () => {
  assert.equal(center('a\n\nb', 5), '  a\n\n  b');
  assert.equal(center('abcdefghijkl', 10), 'abcdefghijkl', 'never negative padding');
  assert.equal(center('abcdefghij', 10), 'abcdefghij', 'exactly the width');
});

test('center measures what the terminal shows, not the string length', () => {
  // Colour codes take no columns; wide characters take two.
  assert.equal(center('\u001b[1mab\u001b[22m', 10), '    \u001b[1mab\u001b[22m');
  assert.equal(center('漢字', 10), '   漢字');
});

// --- mix and sample -------------------------------------------------------

test('mix blends between two colours and clamps t to [0, 1]', () => {
  assert.equal(mix('#000000', '#ffffff', 0), '#000000');
  assert.equal(mix('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mix('#102030', '#302010', 0.5), '#202020');
  assert.equal(mix('#000000', '#ffffff', -1), '#000000');
  assert.equal(mix('#000000', '#ffffff', 2), '#ffffff');
});

test('sample walks a multi-stop gradient', () => {
  const stops = ['#000000', '#ff0000', '#ffffff'];
  assert.equal(sample(stops, 0), '#000000');
  assert.equal(sample(stops, 0.5), '#ff0000', 'the middle stop');
  assert.equal(sample(stops, 1), '#ffffff');
  assert.equal(sample(stops, 0.25), '#800000', 'halfway to the middle stop');
  assert.equal(sample(stops, 7), '#ffffff', 'clamped');
});

test('sample copes with one stop or none', () => {
  assert.equal(sample(['#123456'], 0.7), '#123456');
  assert.equal(sample([], 0.5), tokens.ink);
});

// --- isLightTerminal --------------------------------------------------------

test('COLORFGBG with a white background means a light terminal', () => {
  assert.equal(isLightTerminal({ COLORFGBG: '0;15' }), true);
  assert.equal(isLightTerminal({ COLORFGBG: '0;7' }), true);
  // rxvt adds a middle field; the background is always the last one.
  assert.equal(isLightTerminal({ COLORFGBG: '0;default;15' }), true);
  assert.equal(isLightTerminal({ COLORFGBG: '15' }), true, 'a lone field');
});

test('anything else means dark', () => {
  assert.equal(isLightTerminal({}), false, 'unset');
  assert.equal(isLightTerminal({ COLORFGBG: '' }), false, 'empty');
  assert.equal(isLightTerminal({ COLORFGBG: '15;0' }), false, 'white on black');
  assert.equal(isLightTerminal({ COLORFGBG: '0;default' }), false, 'not a number');
});
