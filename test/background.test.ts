import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import {
  backgroundQuerySettled,
  isLightBackground,
  luminance,
  parseBackground,
  queryBackground,
  type TerminalIo,
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

// A terminal that answers `reply` after `afterMs`, recording what is done to it.
function fakeTerminal(reply: string | null, afterMs = 0) {
  const emitter = new EventEmitter();
  const state = { raw: false, paused: true, asked: '', rawHistory: [] as boolean[] };
  const io: TerminalIo = {
    env: {},
    stdout: {
      isTTY: true,
      write(text: string) {
        state.asked += text;
        if (reply !== null) {
          setTimeout(() => emitter.emit('data', Buffer.from(reply, 'latin1')), afterMs);
        }
      },
    },
    stdin: {
      isTTY: true,
      get isRaw() {
        return state.raw;
      },
      setRawMode(mode: boolean) {
        state.raw = mode;
        state.rawHistory.push(mode);
      },
      on: (event, listener) => emitter.on(event, listener),
      removeListener: (event, listener) => emitter.removeListener(event, listener),
      resume() {
        state.paused = false;
      },
      pause() {
        state.paused = true;
      },
    },
  };
  return { io, state, listeners: () => emitter.listenerCount('data') };
}

const WHITE = `${ESC}]11;rgb:ffff/ffff/ffff\u0007`;
const ATTRIBUTES = `${ESC}[?62;22c`;

test('a prompt answer is used, and stdin is put back as it was', async () => {
  const term = fakeTerminal(WHITE + ATTRIBUTES);
  assert.deepEqual(await queryBackground({ io: term.io }), [1, 1, 1]);
  await backgroundQuerySettled();
  assert.match(term.state.asked, /\]11;\?/);
  assert.deepEqual(term.state.rawHistory, [true, false]);
  assert.equal(term.state.paused, true);
  assert.equal(term.listeners(), 0);
});

test('a terminal without OSC 11 is known from its attributes reply, without waiting', async () => {
  const term = fakeTerminal(ATTRIBUTES);
  const started = Date.now();
  assert.equal(await queryBackground({ io: term.io, timeoutMs: 5000 }), null);
  assert.ok(Date.now() - started < 1000);
});

test('a reply after the timeout is swallowed, not left to be echoed', async () => {
  const term = fakeTerminal(WHITE + ATTRIBUTES, 120);
  // The caller falls back at the timeout…
  assert.equal(await queryBackground({ io: term.io, timeoutMs: 30 }), null);
  // …but stdin is still raw and listening, so the late reply cannot echo.
  assert.equal(term.state.raw, true);
  assert.equal(term.listeners(), 1);
  await backgroundQuerySettled();
  assert.deepEqual(term.state.rawHistory, [true, false]);
  assert.equal(term.state.paused, true);
  assert.equal(term.listeners(), 0);
});

test('a terminal that never answers is let go after the drain window', async () => {
  const term = fakeTerminal(null);
  assert.equal(await queryBackground({ io: term.io, timeoutMs: 20, drainMs: 40 }), null);
  assert.equal(term.state.raw, true);
  await backgroundQuerySettled();
  assert.equal(term.state.raw, false);
  assert.equal(term.listeners(), 0);
});

test('nothing is asked when stdin is not a terminal, or in CI', async () => {
  // `node --test` runs with piped stdio, so the default must resolve at once.
  const started = Date.now();
  assert.equal(await queryBackground({ timeoutMs: 5000 }), null);
  assert.ok(Date.now() - started < 1000);

  const term = fakeTerminal(WHITE + ATTRIBUTES);
  term.io.env = { CI: 'true' };
  assert.equal(await queryBackground({ io: term.io }), null);
  assert.equal(term.state.asked, '');
});
