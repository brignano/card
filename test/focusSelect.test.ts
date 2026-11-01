// Drives the menu prompt through @inquirer/testing's headless terminal, so CI
// exercises the interactive path that `npm test`'s `--no-prompt` smoke run
// never reaches.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render } from '@inquirer/testing';
import chalk from 'chalk';
import { focusSelectPrompt } from '../src/focusSelect.js';
import { tokens } from '../src/ui.js';

// `node --test` runs each file in a child process with FORCE_COLOR=1, which
// drops chalk to 16 colours and strips the truecolour codes asserted below.
chalk.level = 3;

const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'] as const;
const config = {
  message: 'Pick one',
  choices: NAMES.map((name, value) => ({ name, value, description: `About ${name}` })),
};

// "r;g;b", as it appears in a truecolour SGR sequence.
function rgb(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(';');
}

// The colour a row's name is painted in, read from the raw screen.
function inkOf(screen: string, name: string): string | undefined {
  const pattern = new RegExp(`38;2;(\\d+;\\d+;\\d+)m(?:\\x1b\\[1m)?${name}`);
  return screen.match(pattern)?.[1];
}

async function open() {
  return render(focusSelectPrompt, config);
}

test('enter answers with the live row', async () => {
  const { answer, events } = await open();
  events.keypress('down');
  events.keypress('enter');
  assert.equal(await answer, 1);
});

test('arrows wrap at both ends', async () => {
  const { answer, events, getScreen } = await open();
  const live = () => inkOf(getScreen({ raw: true }), 'Echo') === rgb(tokens.linkPressed);
  events.keypress('up'); // first row -> last
  assert.ok(live(), 'up from the first row lands on the last');
  events.keypress('down'); // last row -> first
  assert.ok(!live(), 'down from the last row leaves it');
  assert.equal(
    inkOf(getScreen({ raw: true }), 'Alpha'),
    rgb(tokens.linkPressed),
    'down from the last row lands on the first',
  );
  events.keypress('up');
  events.keypress('enter');
  assert.equal(await answer, NAMES.length - 1);
});

test('a number key jumps to that row', async () => {
  const { answer, events } = await open();
  events.type('4');
  events.keypress('enter');
  assert.equal(await answer, 3);
});

test('typing jumps to the first row that starts with it', async () => {
  const { answer, events } = await open();
  events.type('ch');
  events.keypress('enter');
  assert.equal(await answer, 2);
});

test('the live row shows its description', async () => {
  const { answer, events, getScreen } = await open();
  events.keypress('down');
  assert.match(getScreen(), /About Bravo/);
  assert.doesNotMatch(getScreen(), /About Alpha/);
  events.keypress('enter');
  await answer;
});

test('emphasis falls off down the cobalt ladder from the live row', async () => {
  const { answer, events, getScreen } = await open();
  const screen = getScreen({ raw: true });
  assert.equal(inkOf(screen, 'Alpha'), rgb(tokens.linkPressed), 'live row');
  assert.equal(inkOf(screen, 'Bravo'), rgb(tokens.linkHover), 'one away');
  assert.equal(inkOf(screen, 'Charlie'), rgb(tokens.link), 'two away');
  assert.equal(inkOf(screen, 'Delta'), rgb(tokens.inkSoft), 'three away: neutral');
  assert.equal(inkOf(screen, 'Echo'), rgb(tokens.inkSoft), 'four away: neutral');
  events.keypress('enter');
  await answer;
});

test('the falloff follows the cursor, both directions', async () => {
  const { answer, events, getScreen } = await open();
  events.keypress('down');
  events.keypress('down');
  const screen = getScreen({ raw: true });
  assert.equal(inkOf(screen, 'Charlie'), rgb(tokens.linkPressed));
  assert.equal(inkOf(screen, 'Bravo'), rgb(tokens.linkHover));
  assert.equal(inkOf(screen, 'Delta'), rgb(tokens.linkHover));
  assert.equal(inkOf(screen, 'Alpha'), rgb(tokens.link));
  assert.equal(inkOf(screen, 'Echo'), rgb(tokens.link));
  events.keypress('enter');
  await answer;
});

test('answering collapses the list to the chosen row', async () => {
  const { answer, events, getScreen } = await open();
  events.keypress('down');
  events.keypress('enter');
  await answer;
  const screen = getScreen();
  assert.match(screen, /Pick one Bravo/);
  assert.doesNotMatch(screen, /Charlie/);
});
