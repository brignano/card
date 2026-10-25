// Shared terminal/layout primitives: theme-aware styles built on the design
// tokens, glyphs with legacy-console fallbacks, width-aware centering, tiny
// colour math for gradients, and cursor hiding during animations.

import figures from '@inquirer/figures';
import chalk from 'chalk';
import stringWidth from 'string-width';
import { dark, light, type Tokens } from './tokens.js';

// --- Theme --------------------------------------------------------------------

// Terminals don't expose their theme, but several (iTerm2, Konsole, rxvt, some
// tmux setups) export COLORFGBG as "<fg>;<bg>" using ANSI palette indexes.
// Index 7 and 15 are the two whites; everything else we treat as dark.
export function isLightTerminal(env = process.env): boolean {
  const spec = env.COLORFGBG;
  if (!spec) return false;
  const bg = Number.parseInt(spec.split(';').at(-1) ?? '', 10);
  return bg === 7 || bg === 15;
}

export const tokens: Tokens = isLightTerminal() ? light : dark;

// Styles by role, so no module outside tokens.ts ever names a hex.
export const ink = chalk.hex(tokens.ink);
export const soft = chalk.hex(tokens.inkSoft);
export const slate = chalk.hex(tokens.slate);
export const link = chalk.hex(tokens.link);
export const success = chalk.hex(tokens.success);
export const attention = chalk.hex(tokens.attention);
export const danger = chalk.hex(tokens.danger);
export const mark = chalk.hex(tokens.mark[1]);

// --- Glyphs -------------------------------------------------------------------

// Three tiers, because "can this console draw Unicode" is not a yes/no. The
// legacy Windows console (cmd.exe with Consolas) draws box-drawing, arrows,
// geometric shapes and ★ just fine; what it lacks is the Dingbats block (❯ ✔ ✖)
// and ⏎. So instead of dropping straight to ASCII there, it gets a set drawn
// from the blocks its font covers. Only terminals `figures` deems Unicode-less
// outside Windows (the Linux kernel console) fall all the way to ASCII.
export type GlyphTier = 'full' | 'basic' | 'ascii';

export const tier: GlyphTier =
  figures.pointer === '❯' ? 'full' : process.platform === 'win32' ? 'basic' : 'ascii';

const GLYPHS = {
  pointer: { full: '❯', basic: '›', ascii: '>' },
  tick: { full: '✔', basic: '√', ascii: '√' },
  cross: { full: '✖', basic: '×', ascii: '×' },
  // ▲ is the design system's own "degraded" symbol, and it is in every console font.
  warning: { full: '▲', basic: '▲', ascii: '!' },
  star: { full: '★', basic: '★', ascii: '*' },
  // Key names for the menu's help line (inquirer hardcodes ↑↓ and ⏎).
  arrows: { full: '↑↓', basic: '↑↓', ascii: 'up/down' },
  enter: { full: '⏎', basic: 'enter', ascii: 'enter' },
} as const satisfies Record<string, Record<GlyphTier, string>>;

export const glyph: { [K in keyof typeof GLYPHS]: string } = Object.fromEntries(
  Object.entries(GLYPHS).map(([name, byTier]) => [name, byTier[tier]]),
) as { [K in keyof typeof GLYPHS]: string };

// --- Layout -------------------------------------------------------------------

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
  if (first === undefined) return tokens.ink;
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
