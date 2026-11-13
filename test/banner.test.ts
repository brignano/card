import assert from 'node:assert/strict';
import { test } from 'node:test';
import { frameOutput, renderBanner } from '../src/banner.ts';

const START = '\u001b[?2026h';
const END = '\u001b[?2026l';

test('an animation frame is wrapped in synchronized output', () => {
  const frame = frameOutput(['one', 'two'], false);
  assert.ok(frame.startsWith(START));
  assert.ok(frame.endsWith(END));
  assert.equal(frame.split(START).length, 2, 'one start');
  assert.equal(frame.split(END).length, 2, 'one end');
});

test('the wrapping adds nothing else to the frame', () => {
  const erase = '\r\u001b[2K';
  assert.equal(
    frameOutput(['one', 'two'], false),
    `${START}${erase}one\n${erase}two\n${END}`,
  );
  // A redraw first moves up over the block it replaces.
  assert.equal(
    frameOutput(['one', 'two'], true),
    `${START}\u001b[2A${erase}one\n${erase}two\n${END}`,
  );
});

test('the static banner has no synchronized-output escapes', () => {
  assert.ok(!renderBanner('a tagline').includes('?2026'));
});
