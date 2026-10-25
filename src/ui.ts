// Shared terminal/layout primitives: the brand palette, width-aware centering,
// tiny colour math for gradients, and cursor hiding during animations. Keeping
// these in one place is what lets the banner, card, tips and menu line up.

import chalk from 'chalk';
import stringWidth from 'string-width';

// Brand palette — matches brignano.io's electric indigo/violet accent.
export const palette = {
  // violet-700 → violet-500 → violet-400: the resting banner gradient.
  brand: ['#6d28d9', '#8b5cf6', '#a78bfa'],
  // violet-100: the bright crest of the light sweep.
  crest: '#ede9fe',
  // violet-950: the unlit "ghost" of letters the sweep hasn't reached yet.
  ghost: '#2e1065',
  // violet-400 / violet-300: accents and soft text.
  accent: '#a78bfa',
  soft: '#c4b5fd',
  // violet-500: borders and the menu cursor.
  border: '#8b5cf6',
} as const;

export const accent = chalk.hex(palette.accent);
export const soft = chalk.hex(palette.soft);

// Mirrors boxen's fallback order so our centering agrees with its `float: 'center'`.
export function termWidth(): number {
  if (process.stdout.columns) return process.stdout.columns;
  if (process.stderr.columns) return process.stderr.columns;
  if (process.env.COLUMNS) return Number.parseInt(process.env.COLUMNS, 10) || 80;
  return 80;
}

// Centers every line of `text` on the terminal. Lines wider than the terminal
// are left alone (never negative padding, never truncation).
export function center(text: string, width = termWidth()): string {
  return text
    .split('\n')
    .map((line) => {
      if (line === '') return line;
      const pad = Math.max(0, Math.floor((width - stringWidth(line)) / 2));
      return ' '.repeat(pad) + line;
    })
    .join('\n');
}

// --- Colour math (dependency-free gradients) ---------------------------------

type Rgb = readonly [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: Rgb): string {
  const part = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

// Linear blend from `from` to `to`; `t` is clamped to [0, 1].
export function mix(from: string, to: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex([
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ]);
}

// Samples a multi-stop gradient at position `t` in [0, 1].
export function sample(stops: readonly string[], t: number): string {
  const first = stops[0];
  if (first === undefined) return '#ffffff';
  if (stops.length === 1) return first;
  const k = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  const a = stops[i] ?? first;
  const b = stops[i + 1] ?? a;
  return mix(a, b, k - i);
}

// Paints a horizontal gradient across each line of a multi-line string.
export function paintGradient(text: string, stops: readonly string[]): string {
  return text
    .split('\n')
    .map((line) => {
      const last = Math.max(1, line.length - 1);
      let out = '';
      for (let x = 0; x < line.length; x++) {
        const ch = line[x] ?? '';
        out += ch === ' ' ? ch : chalk.hex(sample(stops, x / last))(ch);
      }
      return out;
    })
    .join('\n');
}

// --- Cursor -------------------------------------------------------------------

const HIDE = '\u001b[?25l';
const SHOW = '\u001b[?25h';

// Runs `fn` with the cursor hidden and guarantees it comes back — including when
// the user hits Ctrl+C mid-animation, which would otherwise leave their shell
// without a cursor.
export async function withHiddenCursor<T>(fn: () => Promise<T>): Promise<T> {
  const restore = () => process.stdout.write(SHOW);
  const onSigint = () => {
    restore();
    process.exit(130);
  };
  process.stdout.write(HIDE);
  process.once('SIGINT', onSigint);
  try {
    return await fn();
  } finally {
    process.removeListener('SIGINT', onSigint);
    restore();
  }
}
