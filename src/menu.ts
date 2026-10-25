import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import clipboard from 'clipboardy';
import open from 'open';
import { profile } from './data.js';
import { renderQr } from './qrcode.js';
import { accent } from './ui.js';
import { buildVCard, writeAndOpenVCard } from './vcard.js';

// --- Action helpers (kept as named functions so flags and the menu share them) ---

export async function copyEmail(): Promise<void> {
  try {
    await clipboard.write(profile.email);
    console.log(
      `\n${chalk.green('✔')} Copied ${accent(profile.email)} to your clipboard.\n`,
    );
  } catch {
    // Clipboard access fails in headless/SSH environments — degrade gracefully.
    console.log(`\nMy email is ${accent(profile.email)} — drop me a line!\n`);
  }
}

export async function sendEmail(): Promise<void> {
  try {
    await open(`mailto:${profile.email}`);
    console.log(
      `\n${chalk.green('✔')} Opened your mail client — see you in the inbox.\n`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to open mail client: ${message}`);
    console.error(`Reach me directly at ${profile.email}`);
  }
}

export async function openUrl(url: string, label: string): Promise<void> {
  try {
    await open(url);
    console.log(`\n${chalk.green('✔')} Opened ${label}: ${chalk.gray(url)}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to open ${label}: ${message}`);
    console.error(`Here it is: ${url}`);
  }
}

export async function viewResume(): Promise<void> {
  await openUrl(profile.resume, 'my resume');
}

export async function showContactQr(): Promise<void> {
  const qr = await renderQr(buildVCard());
  console.log(`\nScan to save my contact:\n`);
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

// Names stay unstyled on purpose: the active row is highlighted as a whole, and
// embedded colour resets would break that highlight mid-line.
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
export async function promptForAction(message: string): Promise<MenuAction> {
  const choices = buildChoices();
  return select<MenuAction>({
    message,
    choices,
    // Default page size is 7, which would hide the last entry behind a scroll.
    // Show every action at once — the list is short and fixed.
    pageSize: choices.length,
    theme: {
      prefix: { idle: accent('❯'), done: accent('✔') },
      icon: { cursor: '❯' },
      style: {
        highlight: (text: string) => accent.bold(text),
        answer: (text: string) => accent(text),
        description: (text: string) => chalk.gray(`  ${text}`),
      },
    },
  });
}
