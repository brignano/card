import clipboard from 'clipboardy';
import open from 'open';
import { profile } from './data.js';
import { focusSelect } from './focusSelect.js';
import { renderQr } from './qrcode.js';
import { danger, glyph, link, success } from './ui.js';
import { buildVCard, writeAndOpenVCard } from './vcard.js';

// Every state ships with an icon and a word (design system §3): forest for
// done, rust for gone wrong.
const done = (word: string) => success(`${glyph.tick} ${word}`);
const failed = (word: string) => danger(`${glyph.cross} ${word}`);

// --- Action helpers (kept as named functions so flags and the menu share them) ---

export async function copyEmail(): Promise<void> {
  try {
    await clipboard.write(profile.email);
    console.log(`\n${done('Copied')} ${link(profile.email)} to your clipboard.\n`);
  } catch {
    // Clipboard access fails in headless/SSH environments — degrade gracefully.
    console.log(`\nMy email is ${link(profile.email)} — drop me a line!\n`);
  }
}

export async function sendEmail(): Promise<void> {
  try {
    await open(`mailto:${profile.email}`);
    console.log(`\n${done('Opened')} your mail client — see you in the inbox.\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n${failed('Failed')} to open your mail client: ${message}`);
    console.error(`Reach me directly at ${link(profile.email)}\n`);
  }
}

export async function openUrl(url: string, label: string): Promise<void> {
  try {
    await open(url);
    console.log(`\n${done('Opened')} ${label}: ${link(url)}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n${failed('Failed')} to open ${label}: ${message}`);
    console.error(`Here it is: ${link(url)}\n`);
  }
}

export async function viewResume(): Promise<void> {
  await openUrl(profile.resume, 'my resume');
}

export async function showContactQr(): Promise<void> {
  const qr = await renderQr(buildVCard());
  console.log('\nScan to save my contact:\n');
  console.log(qr);
}

// --- Menu definition ---

export type MenuAction = () => void | Promise<void>;

// Sentinel action: choosing it ends the session instead of bringing the menu back.
export const quit: MenuAction = () => {};

export interface MenuChoice {
  name: string;
  description: string;
  value: MenuAction;
}

// Names stay unstyled here: `focusSelect` paints each row by its distance from
// the cursor, and an embedded colour reset would cut that paint mid-line.
export function buildChoices(): MenuChoice[] {
  return [
    {
      name: 'Copy my email to your clipboard',
      description: profile.email,
      value: copyEmail,
    },
    {
      name: 'Send me an email',
      description: `Opens a new message to ${profile.email}`,
      value: sendEmail,
    },
    {
      name: 'Open my GitHub',
      description: profile.github,
      value: () => openUrl(profile.github, 'GitHub'),
    },
    {
      name: 'Open my LinkedIn',
      description: profile.linkedin,
      value: () => openUrl(profile.linkedin, 'LinkedIn'),
    },
    {
      name: 'View my resume',
      description: profile.resume,
      value: viewResume,
    },
    {
      name: 'Save my contact card',
      description: 'Writes a .vcf and opens it in your contacts app',
      value: writeAndOpenVCard,
    },
    {
      name: 'Show a contact QR code',
      description: 'Scan it with your phone to save my details',
      value: showContactQr,
    },
    {
      name: 'Quit',
      description: 'Thanks for stopping by',
      value: quit,
    },
  ];
}

// Shows the action menu and returns the chosen handler. Ctrl+C / Esc throws an
// `ExitPromptError`, which the entry point treats as a normal exit.
// Cobalt is the "you can act on this" hue, so the whole menu lives in it: the
// live row at --i-pressed, its neighbours stepping down --i-hover and --i-ink,
// the rest on the neutral. Moving the cursor moves the emphasis with it, and
// because only the lightness changes, no second hue is ever introduced — the
// identity amber stays on the banner, where DESIGN.md §3 keeps it.
export async function promptForAction(message: string): Promise<MenuAction> {
  return focusSelect<MenuAction>({ message, choices: buildChoices() });
}
