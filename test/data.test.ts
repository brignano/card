import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pick } from '../src/data.ts';

const items = ['a', 'b', 'c', 'd'] as const;

test('pick maps the random number across the whole list', () => {
  assert.equal(pick(items, 0), 'a');
  assert.equal(pick(items, 0.25), 'b');
  assert.equal(pick(items, 0.5), 'c');
  assert.equal(pick(items, 0.999_999), 'd');
});

test('pick draws a fresh number each call when none is given', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) seen.add(pick(items));
  assert.equal(seen.size, items.length);
});
