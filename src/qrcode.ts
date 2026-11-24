import { renderUnicodeCompact } from 'uqr';
import { light } from './tokens.ts';
import { termWidth, tokens, visibleWidth } from './ui.ts';

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

// A QR code that's wider than the window gets folded by the terminal into
// something no camera can read. Returns the code when it fits, or null so the
// caller can say what to do instead.
export function renderQrIfFits(text: string, columns = termWidth()): string | null {
  const qr = renderQr(text);
  return visibleWidth(qr) <= columns ? qr : null;
}

// How many columns the code for `text` needs, for the "widen your window" hint.
export function qrWidth(text: string): number {
  return visibleWidth(renderQr(text));
}
