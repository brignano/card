// src/bannerArt.ts is generated and committed so figlet never ships. This keeps
// it honest: if the word, the fonts or figlet's output change, regenerate with
// `npm run gen:banner`.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderArt, TEXT } from '../scripts/gen-banner.mjs';
import { bannerArt, bannerText } from '../src/bannerArt.ts';

test('the committed banner art matches what figlet renders', () => {
  assert.equal(bannerText, TEXT);
  assert.deepEqual(bannerArt, renderArt());
});
