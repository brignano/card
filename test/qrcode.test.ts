import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderQr } from '../src/qrcode.ts';
import { applyTheme } from '../src/ui.ts';

// Each character is one module wide and two tall: █ both lit, ▀ top only,
// ▄ bottom only, space neither.
function modules(qr: string): boolean[][] {
  const rows: boolean[][] = [];
  for (const line of qr.replace(/\n$/, '').split('\n')) {
    const chars = [...line];
    rows.push(chars.map((ch) => ch === '█' || ch === '▀'));
    rows.push(chars.map((ch) => ch === '█' || ch === '▄'));
  }
  return rows;
}

applyTheme(false);
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

test('the light palette draws the same code inverted, so it scans dark on light', () => {
  applyTheme(true);
  try {
    const inverted = renderQr('https://brignano.io');
    assert.match(inverted, /^[█▀▄ \n]+$/);
    const size = 25 + 2;
    const dark = modules(qr).slice(0, size);
    const lit = modules(inverted).slice(0, size);
    assert.equal(lit.length, size);
    for (const [y, row] of dark.entries()) {
      assert.deepEqual(
        lit[y],
        row.map((on) => !on),
        `row ${y} is the dark code flipped`,
      );
    }
    // The border is now unlit, so the terminal's light background is the quiet zone.
    assert.ok(lit[0]?.every((on) => !on));
  } finally {
    applyTheme(false);
  }
});

test('switching back to the dark palette draws exactly what it drew before', () => {
  applyTheme(true);
  renderQr('https://brignano.io');
  applyTheme(false);
  assert.equal(renderQr('https://brignano.io'), qr);
});
