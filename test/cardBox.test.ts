import assert from 'node:assert/strict';
import { test } from 'node:test';
import stringWidth from 'string-width';
import { pickLayout, renderCard } from '../src/cardBox.ts';
import type { LiveData } from '../src/live.ts';
import { centerWrapped } from '../src/ui.ts';

const live: LiveData = {
  followers: 1234,
  publicRepos: 48,
  latestRepo: { name: 'a-rather-long-repository-name', url: 'https://github.com/x/y' },
};

const widest = (text: string) => Math.max(...text.split('\n').map((l) => stringWidth(l)));

test('the card never needs more columns than the terminal has, down to 30', () => {
  for (const data of [null, live]) {
    for (let columns = 30; columns <= 120; columns++) {
      const card = renderCard({ live: data, columns });
      assert.ok(widest(card) <= columns, `${columns} columns, live: ${Boolean(data)}`);
    }
  }
});

test('the layout steps down from wide to compact to stacked as the window narrows', () => {
  assert.equal(pickLayout(null, 100), 'wide');
  assert.equal(pickLayout(null, 60), 'wide');
  assert.equal(pickLayout(null, 40), 'compact');
  assert.equal(pickLayout(null, 30), 'stacked');
});

test('wide shows full URLs; narrower layouts drop the scheme from the text only', () => {
  assert.match(renderCard({ columns: 100 }), /https:\/\/github\.com\/brignano/);
  const compact = renderCard({ columns: 40 });
  assert.doesNotMatch(compact, /https:\/\/github\.com/);
  assert.match(compact, /github\.com\/brignano/);
});

test('every label lines up in the compact layout', () => {
  const rows = renderCard({ columns: 40 })
    .split('\n')
    .filter((l) => /GitHub|LinkedIn|Website|Email|Card {2}/.test(l));
  assert.equal(rows.length, 5);
  const starts = rows.map((l) => l.indexOf('  ', l.search(/[A-Z]/)) + 2);
  assert.equal(new Set(starts).size, 1, 'values start in one column');
});

test('a wrapped sentence breaks between words and every line fits', () => {
  const text = 'This card is open source — `npx brignano --help` shows every trick.';
  const out = centerWrapped(text, 30);
  assert.ok(out.split('\n').length > 1);
  assert.ok(widest(out) <= 30);
  assert.equal(out.replace(/\s+/g, ' ').trim(), text);
});
