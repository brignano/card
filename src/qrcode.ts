import { renderUnicodeCompact } from 'uqr';

// Draws `text` as a QR code in half-block characters, two modules per line, so
// it stays compact enough for most terminals. The light modules are the filled
// blocks, which suits the dark terminals most people run `npx` in.
//
// Ends with a newline, as qrcode-terminal's output did, so the blank line the
// callers leave under the code is unchanged.
//
// Callers import this module lazily (`await import('./qrcode.ts')`): most runs
// never draw a QR code, so the encoder stays out of the startup path.
export function renderQr(text: string): string {
  return `${renderUnicodeCompact(text)}\n`;
}
