import boxen from 'boxen';
import wrapAnsi from 'wrap-ansi';
import { profile } from './data.ts';
import type { LiveData } from './live.ts';
import {
  center,
  glyph,
  hyperlink,
  ink,
  link,
  slate,
  soft,
  termWidth,
  tokens,
  visibleWidth,
} from './ui.ts';

// The card picks the roomiest layout that fits the terminal, so boxen never has
// to wrap a line (which breaks URLs mid-word and knocks the labels out of line):
//
// - wide:    labels right-aligned beside full URLs, generous padding
// - compact: the same rows with `https://` dropped from what's shown (the link
//            itself still goes to the full URL) and slimmer padding
// - stacked: each label on its own line above its value, for phone-width
//            windows
//
// Below the narrowest stacked card nothing fits cleanly; stacked is used anyway.
interface Layout {
  padding: number;
  scheme: boolean;
  stacked: boolean;
}

export const LAYOUTS = {
  wide: { padding: 3, scheme: true, stacked: false },
  compact: { padding: 2, scheme: false, stacked: false },
  stacked: { padding: 1, scheme: false, stacked: true },
} as const satisfies Record<string, Layout>;

export type LayoutName = keyof typeof LAYOUTS;

// Right-aligns labels to a common width so the values line up cleanly.
const LABEL_WIDTH = 8;
const GAP = '  ';

// A URL where only the handle is emphasised: the scheme and host stay regular,
// so the eye lands on the part that is actually mine. Cobalt throughout,
// because the whole thing is clickable — and linked, where the terminal can.
function url(host: string, handle: string, layout: Layout): string {
  const shown = layout.scheme ? `https://${host}` : host;
  return hyperlink(`${link(shown)}${link.bold(handle)}`, `https://${host}${handle}`);
}

function website(layout: Layout): string {
  const shown = layout.scheme
    ? profile.website
    : profile.website.replace(/^https?:\/\//, '');
  return hyperlink(link(shown), profile.website);
}

// One labelled row. A multi-line value keeps its later lines under the first.
function row(name: string, value: string, layout: Layout): string[] {
  const lines = value.split('\n');
  if (layout.stacked) return [slate(name), ...lines];
  const indent = ' '.repeat(LABEL_WIDTH + GAP.length);
  return lines.map((line, i) =>
    i === 0 ? `${slate(name.padStart(LABEL_WIDTH))}${GAP}${line}` : `${indent}${line}`,
  );
}

interface CardOptions {
  live?: LiveData | null;
  /** Terminal columns; defaults to the real terminal. */
  columns?: number;
}

// The widest content a layout leaves room for: borders and padding come off.
const innerWidth = (columns: number, layout: Layout) => columns - 2 - 2 * layout.padding;

function cardLines(
  live: LiveData | null | undefined,
  layout: Layout,
  inner: number,
): string[] {
  // Title and employer share a line when they fit, otherwise the employer gets
  // its own; either way a line that still doesn't fit breaks between words.
  const together = `${ink(profile.title)} ${slate('·')} ${ink.bold(profile.org)}`;
  const role =
    visibleWidth(together) <= inner
      ? [together]
      : [ink(profile.title), ink.bold(profile.org)].flatMap((l) =>
          wrapAnsi(l, Math.max(1, inner), { hard: false }).split('\n'),
        );

  const lines = [
    ink.bold(profile.fullName),
    ...role,
    '',
    ...row('GitHub', url('github.com/', profile.username, layout), layout),
    ...row('LinkedIn', url('linkedin.com/in/', profile.username, layout), layout),
    ...row('Website', website(layout), layout),
    ...row('Email', hyperlink(link(profile.email), `mailto:${profile.email}`), layout),
  ];

  if (live) {
    const parts = [
      `${slate(glyph.star)} ${ink.bold(live.followers)} ${soft('followers')}`,
      `${ink.bold(live.publicRepos)} ${soft('repos')}`,
    ];
    if (live.latestRepo) {
      const { name, url: repoUrl } = live.latestRepo;
      parts.push(`${soft('latest')} ${hyperlink(link(name), repoUrl)}`);
    }
    // On one line when it fits beside the label, else one fact per line (and a
    // repo name too long for even that breaks rather than widening the card).
    const valueRoom = layout.stacked ? inner : inner - LABEL_WIDTH - GAP.length;
    const oneLine = parts.join(slate('  ·  '));
    const stats =
      visibleWidth(oneLine) <= valueRoom
        ? oneLine
        : parts
            .map((part) => wrapAnsi(part, Math.max(1, valueRoom), { hard: true }))
            .join('\n');
    lines.push('', ...row('Stats', stats, layout));
  }

  lines.push(
    '',
    ...row('Card', `${slate('$')} ${ink('npx')} ${ink.bold('brignano')}`, layout),
  );
  return lines;
}

// The roomiest layout whose card fits in `columns`.
export function pickLayout(
  live: LiveData | null | undefined,
  columns: number,
): LayoutName {
  for (const name of ['wide', 'compact'] as const) {
    const layout = LAYOUTS[name];
    const inner = innerWidth(columns, layout);
    if (visibleWidth(cardLines(live, layout, inner).join('\n')) <= inner) return name;
  }
  return 'stacked';
}

// Builds the boxen business card. `live` is optional — when absent the live
// line is simply omitted, so the card looks intentional with or without network.
export function renderCard({ live, columns = termWidth() }: CardOptions): string {
  const layout = LAYOUTS[pickLayout(live, columns)];
  const lines = cardLines(live, layout, innerWidth(columns, layout));

  const card = boxen(lines.join('\n'), {
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    padding: { top: 1, bottom: 1, left: layout.padding, right: layout.padding },
    borderStyle: 'round',
    borderColor: tokens.lineStrong,
    title: soft(profile.handle),
    titleAlignment: 'center',
  });
  // Centered here rather than with boxen's `float`, so it uses the same width
  // the layout was picked for.
  return center(card, columns);
}
