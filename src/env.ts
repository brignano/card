// Environment + capability detection. Keeps the render logic free of scattered
// `process.stdout.isTTY` checks and guarantees CI / piped output never hangs.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ParseArgsOptionsConfig, parseArgs } from 'node:util';

export interface Flags {
  help: boolean;
  version: boolean;
  view: boolean;
  download: boolean;
  email: boolean;
  qr: boolean;
  vcard: boolean;
  noPrompt: boolean;
  noAnimation: boolean;
}

// Every accepted token, grouped by the flag it sets. The single source of truth:
// it generates the `parseArgs` options and drives unknown-option detection
// below, so adding a flag here is the only edit needed.
const FLAG_ALIASES = {
  help: ['--help', '-h'],
  version: ['--version', '-v', '-V'],
  view: ['--view', '--resume', '-r'],
  download: ['--download', '-d'],
  email: ['--email', '-e'],
  qr: ['--qr'],
  vcard: ['--vcard', '--save-contact'],
  noPrompt: ['--no-prompt', '--quiet'],
  noAnimation: ['--no-animation'],
} as const satisfies Record<keyof Flags, readonly string[]>;

const FLAG_OF = new Map<string, keyof Flags>(
  Object.entries(FLAG_ALIASES).flatMap(([flag, tokens]) =>
    tokens.map((token): [string, keyof Flags] => [token, flag as keyof Flags]),
  ),
);

// Each long token becomes a boolean option. A group's first short letter rides
// on its first long name; any other short letter (`-V`) is its own option.
// Every one of them folds back into its flag through `FLAG_OF`.
const OPTIONS: ParseArgsOptionsConfig = {};
for (const tokens of Object.values(FLAG_ALIASES)) {
  const longs = tokens.filter((t) => t.startsWith('--')).map((t) => t.slice(2));
  const shorts = tokens.filter((t) => !t.startsWith('--')).map((t) => t.slice(1));
  for (const name of longs) OPTIONS[name] = { type: 'boolean' };
  for (const [i, letter] of shorts.entries()) {
    const owner = i === 0 ? longs[0] : undefined;
    OPTIONS[owner ?? letter] = { type: 'boolean', short: letter };
  }
}

interface Parsed {
  flags: Flags;
  // Anything we don't accept, as the user typed it: unknown options, an option
  // given a value (`--qr=1`), and stray positional arguments.
  unknown: string[];
}

function parse(argv: string[]): Parsed {
  const flags: Flags = {
    help: false,
    version: false,
    view: false,
    download: false,
    email: false,
    qr: false,
    vcard: false,
    noPrompt: false,
    noAnimation: false,
  };
  const unknown: string[] = [];
  // Non-strict, so unknown options come back as tokens instead of throwing, and
  // combined short flags (`-rv`) are split even when one letter is unknown.
  const { tokens } = parseArgs({
    args: argv,
    options: OPTIONS,
    strict: false,
    allowPositionals: true,
    tokens: true,
  });
  for (const token of tokens) {
    if (token.kind === 'option') {
      // `rawName` is the token as typed, so `--V` doesn't pass for `-V`.
      const flag = FLAG_OF.get(token.rawName);
      if (flag && token.value === undefined) flags[flag] = true;
      else if (token.inlineValue) unknown.push(argv[token.index] ?? token.rawName);
      else unknown.push(token.rawName);
    } else {
      // A positional, or `--` (which ends options and was never accepted).
      unknown.push(argv[token.index] ?? '');
    }
  }
  return { flags, unknown };
}

export function parseFlags(argv: string[]): Flags {
  return parse(argv).flags;
}

// Everything we don't accept, in order. Returned rather than thrown so the
// caller decides how loudly to complain.
export function unknownFlags(argv: string[]): string[] {
  return parse(argv).unknown;
}

// Read the version straight from the published package.json. It isn't in the
// `files` list, but npm always ships package.json, and it sits one level above
// the compiled dist/ directory.
export function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(join(here, '..', 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { version?: unknown };
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

// What the checks below read from the process. A parameter (defaulting to the
// real process) so tests can try every combination without touching globals.
export interface Terminal {
  env: NodeJS.ProcessEnv;
  stdinIsTTY: boolean;
  stdoutIsTTY: boolean;
}

const currentTerminal = (): Terminal => ({
  env: process.env,
  stdinIsTTY: Boolean(process.stdin.isTTY),
  stdoutIsTTY: Boolean(process.stdout.isTTY),
});

// True only when we can safely show an interactive prompt.
export function isInteractive(flags: Flags, term: Terminal = currentTerminal()): boolean {
  return term.stdoutIsTTY && term.stdinIsTTY && !term.env.CI && !flags.noPrompt;
}

// True only when the reveal animation should play.
export function shouldAnimate(flags: Flags, term: Terminal = currentTerminal()): boolean {
  return (
    term.stdoutIsTTY &&
    !term.env.CI &&
    !flags.noPrompt &&
    !flags.noAnimation &&
    !term.env.NO_COLOR
  );
}

// True only when we should spend time on a live network fetch.
export function shouldFetchLive(flags: Flags): boolean {
  return isInteractive(flags);
}
