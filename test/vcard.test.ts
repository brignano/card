import assert from 'node:assert/strict';
import { test } from 'node:test';
import { profile } from '../src/data.ts';
import { buildVCard } from '../src/vcard.ts';

const card = buildVCard();
const lines = card.split('\r\n');

test('every line ends in CRLF, as vCard requires', () => {
  assert.ok(card.endsWith('\r\n'));
  assert.equal(card.replaceAll('\r\n', '').includes('\n'), false, 'no bare LF');
  assert.equal(card.replaceAll('\r\n', '').includes('\r'), false, 'no bare CR');
});

test('it is a single vCard 3.0', () => {
  assert.equal(lines[0], 'BEGIN:VCARD');
  assert.equal(lines[1], 'VERSION:3.0');
  assert.equal(lines.at(-2), 'END:VCARD');
  assert.equal(lines.at(-1), '', 'nothing after the final CRLF');
  assert.equal(lines.filter((line) => line === 'BEGIN:VCARD').length, 1);
});

test('it carries the fields vCard 3.0 requires, from the profile', () => {
  assert.ok(lines.includes(`N:${profile.lastName};${profile.firstName};;;`));
  assert.ok(lines.includes(`FN:${profile.fullName}`));
});

test('it carries the contact details a phone needs to save', () => {
  assert.ok(lines.includes(`EMAIL;TYPE=INTERNET,PREF:${profile.email}`));
  assert.ok(lines.includes(`URL:${profile.website}`));
  assert.ok(lines.includes(`ORG:${profile.org}`));
  assert.ok(lines.includes(`TITLE:${profile.title}`));
});
