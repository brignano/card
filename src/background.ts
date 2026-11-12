// Asks the terminal what colour its background is (OSC 11), so the card can
// pick the light or dark palette instead of assuming dark. `COLORFGBG` is only
// set by a few terminals; nearly all of them answer this.

export type Rgb = readonly [number, number, number];

const ESC = '\u001b';
const BEL = '\u0007';

// The background query, then a device-attributes request. Every terminal
// answers the second, and answers in order, so its reply arriving first means
// "no OSC 11 here" without waiting out the timeout, and nothing is left to
// arrive late and land in the menu prompt.
const QUERY = `${ESC}]11;?${BEL}${ESC}[c`;

// biome-ignore lint/suspicious/noControlCharactersInRegex: terminal replies are escape sequences
const OSC11_REPLY = /\u001b\]11;rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i;
// biome-ignore lint/suspicious/noControlCharactersInRegex: terminal replies are escape sequences
const DEVICE_ATTRIBUTES_REPLY = /\u001b\[\?[0-9;]*c/;

// Reads the colour out of an OSC 11 reply, each channel scaled to 0–1. Terminals
// send 1 to 4 hex digits per channel ("ff", "ffff"), so scale by the width.
export function parseBackground(reply: string): Rgb | null {
  const match = OSC11_REPLY.exec(reply);
  if (!match) return null;
  const channel = (hex: string | undefined): number =>
    hex ? Number.parseInt(hex, 16) / (16 ** hex.length - 1) : 0;
  return [channel(match[1]), channel(match[2]), channel(match[3])];
}

// WCAG relative luminance: 0 for black, 1 for white.
export function luminance([r, g, b]: Rgb): number {
  const linear = (c: number): number =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function isLightBackground(rgb: Rgb): boolean {
  return luminance(rgb) > 0.5;
}

// Resolves to the terminal's background colour, or null when it can't be asked
// (not a TTY, CI) or doesn't answer within `timeoutMs`. Never throws, and always
// puts stdin back the way it found it.
export function queryBackground(timeoutMs = 100): Promise<Rgb | null> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || !stdout.isTTY || process.env.CI) return Promise.resolve(null);

  return new Promise((resolve) => {
    let reply = '';
    const wasRaw = stdin.isRaw;

    const finish = (result: Rgb | null): void => {
      clearTimeout(timer);
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      resolve(result);
    };

    const onData = (chunk: Buffer): void => {
      reply += chunk.toString('latin1');
      // Wait for the device-attributes reply either way: it is the last thing
      // the terminal will send, so nothing is left unread when we stop.
      if (DEVICE_ATTRIBUTES_REPLY.test(reply)) finish(parseBackground(reply));
    };

    const timer = setTimeout(() => finish(parseBackground(reply)), timeoutMs);

    try {
      // Raw mode: the reply must reach us unechoed and without waiting for Enter.
      stdin.setRawMode(true);
      stdin.on('data', onData);
      stdin.resume();
      stdout.write(QUERY);
    } catch {
      finish(null);
    }
  });
}
