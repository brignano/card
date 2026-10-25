import boxen from 'boxen';
import { profile } from './data.js';
import type { LiveData } from './live.js';
import { glyph, ink, link, slate, soft, tokens } from './ui.js';

// Right-aligns labels to a common width so the values line up cleanly.
const LABEL_WIDTH = 8;
function label(text: string): string {
  return slate(text.padStart(LABEL_WIDTH));
}

function row(name: string, value: string): string {
  return `${label(name)}  ${value}`;
}

// A URL where only the handle is emphasised: the scheme and host stay regular,
// so the eye lands on the part that is actually mine. Cobalt throughout,
// because the whole thing is clickable.
function url(prefix: string, handle: string): string {
  return `${link(prefix)}${link.bold(handle)}`;
}

interface CardOptions {
  live?: LiveData | null;
}

// Builds the boxen business card. `live` is optional — when absent the live
// line is simply omitted, so the card looks intentional with or without network.
export function renderCard({ live }: CardOptions): string {
  const lines = [
    ink.bold(profile.fullName),
    `${ink(profile.title)} ${slate('·')} ${ink.bold(profile.org)}`,
    '',
    row('GitHub', url('https://github.com/', profile.username)),
    row('LinkedIn', url('https://linkedin.com/in/', profile.username)),
    row('Website', link(profile.website)),
    row('Email', link(profile.email)),
  ];

  if (live) {
    const parts = [
      `${slate(glyph.star)} ${ink.bold(live.followers)} ${soft('followers')}`,
      `${ink.bold(live.publicRepos)} ${soft('repos')}`,
    ];
    if (live.latestRepo) {
      parts.push(`${soft('latest')} ${link(live.latestRepo.name)}`);
    }
    lines.push('', row('Stats', parts.join(slate('  ·  '))));
  }

  lines.push('', row('Card', `${slate('$')} ${ink('npx')} ${ink.bold('brignano')}`));

  return boxen(lines.join('\n'), {
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    float: 'center',
    padding: { top: 1, bottom: 1, left: 3, right: 3 },
    borderStyle: 'round',
    borderColor: tokens.lineStrong,
    title: soft(profile.handle),
    titleAlignment: 'center',
  });
}
