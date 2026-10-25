import boxen from 'boxen';
import chalk from 'chalk';
import { profile } from './data.js';
import type { LiveData } from './live.js';
import { accent, palette, soft } from './ui.js';

// Right-aligns labels to a common width so the values line up cleanly.
const LABEL_WIDTH = 8;
function label(text: string): string {
  return chalk.gray(text.padStart(LABEL_WIDTH));
}

function row(name: string, value: string): string {
  return `${label(name)}  ${value}`;
}

interface CardOptions {
  live?: LiveData | null;
}

// Builds the boxen business card. `live` is optional — when absent the live
// line is simply omitted, so the card looks intentional with or without network.
export function renderCard({ live }: CardOptions): string {
  const lines = [
    accent.bold(profile.fullName),
    `${chalk.white(profile.title)} ${chalk.gray('·')} ${chalk.white.bold(profile.org)}`,
    '',
    row('GitHub', `${chalk.gray('https://github.com/')}${chalk.white(profile.username)}`),
    row(
      'LinkedIn',
      `${chalk.gray('https://linkedin.com/in/')}${chalk.white(profile.username)}`,
    ),
    row('Website', soft(profile.website)),
    row('Email', soft(profile.email)),
  ];

  if (live) {
    const parts = [
      `${chalk.yellow('★')} ${chalk.white.bold(live.followers)} followers`,
      `${chalk.white.bold(live.publicRepos)} repos`,
    ];
    if (live.latestRepo) {
      parts.push(`latest ${accent(live.latestRepo.name)}`);
    }
    lines.push('', row('GitHub', chalk.gray(parts.join('  ·  '))));
  }

  lines.push(
    '',
    row('Card', `${chalk.gray('$')} ${chalk.white('npx')} ${accent.bold('brignano')}`),
  );

  return boxen(lines.join('\n'), {
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    float: 'center',
    padding: { top: 1, bottom: 1, left: 3, right: 3 },
    borderStyle: 'round',
    borderColor: palette.border,
    title: soft(profile.handle),
    titleAlignment: 'center',
  });
}
