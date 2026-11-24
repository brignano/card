import { renderUnicodeCompact } from 'uqr';
import { light } from './tokens.ts';
import { tokens } from './ui.ts';

// Draws `text` as a QR code in half-block characters, two modules per line, so
// it stays compact enough for most terminals.
//
// A scanner wants dark modules on a light ground. The filled blocks take the
// terminal's text colour, so on a dark terminal the light modules are the
// filled ones; on a light terminal (the light palette is active) the dark
// modules are, and the code is drawn inverted so it still scans.
//
// Ends with a newline, as qrcode-terminal's output did, so the blank line the
// callers leave under the code is unchanged.
//
// Callers import this module lazily (`await import('./qrcode.ts')`): most runs
// never draw a QR code, so the encoder stays out of the startup path.
export function renderQr(text: string): string {
  const options = tokens === light ? { invert: true } : undefined;
  return `${renderUnicodeCompact(text, options)}\n`;
}
