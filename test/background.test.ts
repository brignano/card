import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isLightBackground,
  luminance,
  parseBackground,
  queryBackground,
} from '../src/background.ts';

const ESC = '\u001b';

test('parses a 16-bit reply ended by BEL', () => {
  assert.deepEqual(parseBackground(`${ESC}]11;rgb:ffff/ffff/ffff\u0007`), [1, 1, 1]);
  assert.deepEqual(parseBackground(`${ESC}]11;rgb:0000/0000/0000\u0007`), [0, 0, 0]);
});

test('parses an 8-bit reply ended by ST, with other replies around it', () => {
  const reply = `${ESC}]11;rgb:1e/1e/2e${ESC}\\${ESC}[?62;22c`;
  const rgb = parseBackground(reply);
  assert.ok(rgb);
  assert.deepEqual(
    rgb.map((c) => Math.round(c * 255)),
    [0x1e, 0x1e, 0x2e],
  );
});

test('parses the rgba form and ignores the alpha channel', () => {
  assert.deepEqual(parseBackground(`${ESC}]11;rgba:ff/ff/ff/80\u0007`), [1, 1, 1]);
});

test('anything else is not a background', () => {
  assert.equal(parseBackground(''), null);
  assert.equal(parseBackground(`${ESC}[?62;22c`), null);
  assert.equal(parseBackground(`${ESC}]11;rgb:zz/zz/zz\u0007`), null);
});

test('luminance runs from 0 for black to 1 for white', () => {
  assert.equal(luminance([0, 0, 0]), 0);
  assert.ok(Math.abs(luminance([1, 1, 1]) - 1) < 1e-9);
});

test('light means relative luminance above 0.5', () => {
  const hex = (h: string): [number, number, number] => [
    Number.parseInt(h.slice(0, 2), 16) / 255,
    Number.parseInt(h.slice(2, 4), 16) / 255,
    Number.parseInt(h.slice(4, 6), 16) / 255,
  ];
  assert.equal(isLightBackground(hex('ffffff')), true, 'white');
  assert.equal(isLightBackground(hex('fdf6e3')), true, 'Solarized Light');
  assert.equal(isLightBackground(hex('000000')), false, 'black');
  assert.equal(isLightBackground(hex('1e1e2e')), false, 'a typical dark theme');
  assert.equal(isLightBackground(hex('808080')), false, 'mid grey reads as dark');
});

test('nothing is asked when stdin is not a terminal', async () => {
  // `node --test` runs with piped stdio, so this must resolve at once.
  const started = Date.now();
  assert.equal(await queryBackground(5000), null);
  assert.ok(Date.now() - started < 1000);
});
