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

// The parts of a terminal this needs; `process.stdin`/`process.stdout` in real
// use, fakes in tests.
export interface TerminalIo {
  stdin: {
    isTTY?: boolean;
    isRaw?: boolean;
    setRawMode(mode: boolean): unknown;
    on(event: 'data', listener: (chunk: Buffer) => void): unknown;
    removeListener(event: 'data', listener: (chunk: Buffer) => void): unknown;
    resume(): unknown;
    pause(): unknown;
  };
  stdout: { isTTY?: boolean; write(text: string): unknown };
  env: NodeJS.ProcessEnv;
}

interface QueryOptions {
  // How long the caller waits for an answer before falling back.
  timeoutMs?: number;
  // How long a late answer is still swallowed after that.
  drainMs?: number;
  io?: TerminalIo;
}

const CTRL_C = '\u0003';

let settled: Promise<void> = Promise.resolve();

// Resolves once the last query has let go of stdin. Await it before handing
// stdin to anything else (the menu prompt), so a reply still in flight is
// swallowed here instead of being read as keypresses there.
export function backgroundQuerySettled(): Promise<void> {
  return settled;
}

// Resolves to the terminal's background colour, or null when it can't be asked
// (not a TTY, CI) or doesn't answer within `timeoutMs`. Never throws.
//
// A slow terminal (SSH, a busy multiplexer) can answer after the timeout. If
// stdin went back to normal at that point, the late reply would be echoed onto
// the screen and typed into the next prompt. So the caller gets its answer at
// the timeout, but stdin stays raw and listening until the device-attributes
// reply arrives or `drainMs` passes, and only then is put back as it was found.
export function queryBackground({
  timeoutMs = 100,
  drainMs = 1000,
  io = process,
}: QueryOptions = {}): Promise<Rgb | null> {
  const { stdin, stdout, env } = io;
  if (!stdin.isTTY || !stdout.isTTY || env.CI) return Promise.resolve(null);

  return new Promise((resolve) => {
    let reply = '';
    let release: () => void = () => {};
    settled = new Promise((done) => {
      release = done;
    });
    const wasRaw = Boolean(stdin.isRaw);

    const answer = (): void => {
      clearTimeout(answerTimer);
      resolve(parseBackground(reply));
    };

    const letGo = (): void => {
      clearTimeout(drainTimer);
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      answer();
      release();
    };

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString('latin1');
      // Raw mode swallows Ctrl+C; give it back rather than ignore the user.
      if (text.includes(CTRL_C)) {
        letGo();
        process.kill(process.pid, 'SIGINT');
        return;
      }
      reply += text;
      // The device-attributes reply is the last thing the terminal will send.
      if (DEVICE_ATTRIBUTES_REPLY.test(reply)) letGo();
    };

    const answerTimer = setTimeout(answer, timeoutMs);
    const drainTimer = setTimeout(letGo, timeoutMs + drainMs);

    try {
      // Raw mode: the reply must reach us unechoed and without waiting for Enter.
      stdin.setRawMode(true);
      stdin.on('data', onData);
      stdin.resume();
      stdout.write(QUERY);
    } catch {
      letGo();
    }
  });
}
