#!/usr/bin/env node

import { animateBanner, renderBanner } from './banner.js';
import { renderCard } from './cardBox.js';
import { funFacts, liveFact, type NonEmpty, pick, profile, taglines } from './data.js';
import {
  isInteractive,
  parseFlags,
  readVersion,
  shouldAnimate,
  shouldFetchLive,
  unknownFlags,
} from './env.js';
import { fetchLive, type LiveData } from './live.js';
import { promptForAction, quit, sendEmail, viewResume } from './menu.js';
import { renderQr } from './qrcode.js';
import { reveal, sleep } from './reveal.js';
import {
  attention,
  center,
  glyph,
  ink,
  link,
  mark,
  soft,
  withHiddenCursor,
} from './ui.js';
import { writeAndOpenVCard } from './vcard.js';

function printHelp(): void {
  console.log('\nUsage: npx brignano [options]\n');
  console.log('Options:');
  console.log('  -h, --help          Show this help');
  console.log('  -v, --version       Print the version and exit');
  console.log('  -r, --view          Open my resume in your browser');
  console.log('  -e, --email         Open your mail client to email me');
  console.log('      --qr            Print a scannable QR code to my website');
  console.log('      --vcard         Save my contact card (.vcf) and open it');
  console.log('      --no-animation  Render instantly, skip the reveal animation');
  console.log('      --no-prompt     Show the card only (non-interactive)');
  console.log('  -d, --download      Deprecated alias for --view\n');
}

function farewell(): void {
  console.log(
    `\n${center(`${mark(glyph.star)} ${ink('Thanks for stopping by — have a great day!')}`)}\n`,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // Reject typos loudly rather than silently rendering the default card.
  const unknown = unknownFlags(argv);
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown.join(', ')}`);
    console.error("Run 'npx brignano --help' to see the available options.");
    process.exitCode = 1;
    return;
  }

  const flags = parseFlags(argv);

  // Direct-action flags short-circuit the full experience.
  if (flags.help) return printHelp();
  if (flags.version) {
    console.log(readVersion());
    return;
  }
  if (flags.view || flags.download) {
    if (flags.download) {
      console.warn(
        `${attention(`${glyph.warning} Note:`)} --download is deprecated; opening the resume instead.`,
      );
    }
    return viewResume();
  }
  if (flags.email) return sendEmail();
  if (flags.qr) {
    console.log(await renderQr(profile.website));
    console.log(`  ${link(profile.website)}\n`);
    return;
  }
  if (flags.vcard) return writeAndOpenVCard();

  const animate = shouldAnimate(flags);
  const interactive = isInteractive(flags);

  // Kick off the live fetch early (don't await yet) so its timeout budget
  // overlaps the banner render. Skipped entirely when non-interactive/CI.
  const livePromise = shouldFetchLive(flags) ? fetchLive() : Promise.resolve(null);

  // Banner first: a light-sweep reveal when we can animate, otherwise the static
  // gradient. Both are centered on the terminal, like the card below them.
  const tagline = pick(taglines);
  console.log();
  let live: LiveData | null;
  if (animate) {
    live = await withHiddenCursor(async () => {
      await animateBanner(tagline);
      // Card, enriched with whatever the (bounded) live fetch returned.
      const data = await livePromise;
      await reveal(renderCard({ live: data }), 30, true);
      return data;
    });
  } else {
    console.log(renderBanner(tagline));
    live = await livePromise;
    console.log(renderCard({ live }));
  }

  // The "live stats" fact only makes sense when the live line is on the card.
  const facts: NonEmpty<string> = live ? [...funFacts, liveFact] : funFacts;
  console.log(
    center(`${soft('Tip:')} ${ink.bold('cmd/ctrl + click')} ${soft('the links above.')}`),
  );
  console.log(center(soft(pick(facts))));
  console.log();

  if (!interactive) return;

  // The menu comes back after every action, so visitors can copy an email, open
  // a link and grab the QR in one sitting. "Quit" (or Ctrl+C) ends it.
  let message = 'What would you like to do?';
  for (;;) {
    const action = await promptForAction(message);
    if (action === quit) break;
    await action();
    message = 'Anything else?';
    await sleep(150);
  }
  farewell();
}

main().catch((err: unknown) => {
  // Ctrl+C / Esc at the menu is a normal way to leave, not a crash.
  if (err instanceof Error && err.name === 'ExitPromptError') {
    farewell();
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Something went wrong: ${message}`);
  process.exitCode = 1;
});
