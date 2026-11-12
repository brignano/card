import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { profile } from './data.ts';

// Builds a valid vCard 3.0 string (broadest contact-app compatibility) with the
// spec-required CRLF line endings.
export function buildVCard(): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${profile.lastName};${profile.firstName};;;`,
    `FN:${profile.fullName}`,
    `ORG:${profile.org}`,
    `TITLE:${profile.title}`,
    `EMAIL;TYPE=INTERNET,PREF:${profile.email}`,
    `URL:${profile.website}`,
    `X-SOCIALPROFILE;TYPE=github:${profile.github}`,
    `X-SOCIALPROFILE;TYPE=linkedin:${profile.linkedin}`,
    'NOTE:npx brignano',
    'END:VCARD',
  ];
  return lines.join('\r\n') + '\r\n';
}

// Writes the vCard to a temp file and asks the OS to open it (Contacts on
// macOS/iOS, the default handler elsewhere). On failure, prints the path so the
// user can open it manually — never throws.
export async function writeAndOpenVCard(): Promise<void> {
  const file = join(tmpdir(), 'anthony-brignano.vcf');
  try {
    writeFileSync(file, buildVCard(), 'utf8');
    const { default: open } = await import('open');
    await open(file);
    console.log(`\nSaved my contact card to: ${file}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nCouldn't open the contact card automatically (${message}).`);
    console.error(`It's saved here — open it manually: ${file}\n`);
  }
}
