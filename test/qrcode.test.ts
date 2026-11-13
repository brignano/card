import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderQr } from '../src/qrcode.ts';

// Each character is one module wide and two tall: █ both lit, ▀ top only,
// ▄ bottom only, space neither.
function modules(qr: string): boolean[][] {
  const rows: boolean[][] = [];
  for (const line of qr.trimEnd().split('\n')) {
    const chars = [...line];
    rows.push(chars.map((ch) => ch === '█' || ch === '▀'));
    rows.push(chars.map((ch) => ch === '█' || ch === '▄'));
  }
  return rows;
}

const qr = renderQr('https://brignano.io');
const lines = qr.trimEnd().split('\n');

test('it draws only half blocks and spaces, and ends with a newline', () => {
  assert.ok(qr.length > 0);
  assert.match(qr, /^[█▀▄ \n]+$/);
  assert.ok(qr.endsWith('\n') && !qr.endsWith('\n\n'));
});

test('it is a square of the expected size for a known input', () => {
  // This URL fits a version 2 code: 25 modules, plus a one-module border.
  const size = 25 + 2;
  assert.equal(lines.length, Math.ceil(size / 2), 'two modules per line');
  for (const line of lines) assert.equal([...line].length, size, 'every line as wide');

  const grid = modules(qr);
  // An odd size leaves the last half-line empty padding.
  assert.ok(grid.at(-1)?.every((lit) => !lit));
  assert.equal(grid.slice(0, size).length, size, 'square');
});

test('the border is lit all round, so the code stands out on a dark terminal', () => {
  const grid = modules(qr).slice(0, 27);
  assert.ok(grid[0]?.every(Boolean), 'top');
  assert.ok(grid.at(-1)?.every(Boolean), 'bottom');
  assert.ok(
    grid.every((row) => row[0] && row.at(-1)),
    'sides',
  );
});

test('a longer input draws a larger code', () => {
  assert.ok(renderQr('x'.repeat(200)).trimEnd().split('\n').length > lines.length);
});
