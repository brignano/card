import chalk from 'chalk';
import figlet from 'figlet';
import { sleep } from './reveal.js';
import { center, mix, paintGradient, palette, sample, termWidth } from './ui.js';

type Font = NonNullable<NonNullable<Parameters<typeof figlet.textSync>[1]>['font']>;

// Fonts in order of preference, with the terminal width each one needs. The
// widest that fits wins; on a very narrow terminal we fall back to plain text so
// nothing ever wraps mid-letter.
const FONTS: ReadonlyArray<{ font: Font; minColumns: number }> = [
  { font: 'ANSI Shadow', minColumns: 72 },
  { font: 'Small', minColumns: 44 },
];

// Figlet output as a clean rectangle: trailing blank lines dropped, every line
// padded to the same width so per-column effects line up.
function bannerArt(text: string, columns = termWidth()): string[] {
  const choice = FONTS.find((f) => columns >= f.minColumns);
  let lines: string[];
  try {
    lines = choice
      ? figlet.textSync(text, { font: choice.font }).split('\n')
      : [text.toUpperCase()];
  } catch {
    lines = [text.toUpperCase()];
  }
  while (lines.length > 0 && (lines.at(-1) ?? '').trim() === '') lines.pop();
  const width = Math.max(...lines.map((l) => l.length), 1);
  return lines.map((l) => l.padEnd(width));
}

interface FrameOptions {
  // Columns left of this edge are lit; a bright band trails just behind it and
  // everything right of it is still a dark "ghost".
  revealEdge?: number;
  // Column at the centre of a passing glint (a narrower, brighter band).
  glintAt?: number;
}

const BAND = 4; // width of the bright leading edge, in columns
const GLINT = 3; // half-width of the glint, in columns

// Paints one frame of the art. Pure: same inputs, same string.
function paintFrame(art: string[], { revealEdge, glintAt }: FrameOptions = {}): string {
  const width = art[0]?.length ?? 1;
  const last = Math.max(1, width - 1);
  return art
    .map((line) => {
      let out = '';
      for (let x = 0; x < line.length; x++) {
        const ch = line[x] ?? ' ';
        if (ch === ' ') {
          out += ch;
          continue;
        }
        let color = sample(palette.brand, x / last);
        if (revealEdge !== undefined) {
          const behind = revealEdge - x; // >0 once the edge has passed this column
          if (behind <= 0) color = palette.ghost;
          else if (behind < BAND) color = mix(color, palette.crest, 1 - behind / BAND);
        }
        if (glintAt !== undefined) {
          const dist = Math.abs(x - glintAt);
          if (dist < GLINT) color = mix(color, palette.crest, 0.85 * (1 - dist / GLINT));
        }
        out += chalk.hex(color)(ch);
      }
      return out;
    })
    .join('\n');
}

function subtitle(text: string, color: string = palette.soft): string {
  return chalk.hex(color).italic(text);
}

// Static, centered banner with the tagline beneath (non-animated path).
export function renderBanner(tagline: string, text = 'brignano'): string {
  const art = bannerArt(text);
  return center(
    [paintGradient(art.join('\n'), palette.brand), '', subtitle(tagline)].join('\n'),
  );
}

// Writes a block of lines in place, overwriting the previous block of the same
// height when `redraw` is set. Every line is erased to its end first so a
// shorter line never leaves debris from the one it replaces.
function draw(lines: string[], redraw: boolean): void {
  const out = lines.map((l) => `\r\u001b[2K${l}`).join('\n');
  process.stdout.write(`${redraw ? `\u001b[${lines.length}A` : ''}${out}\n`);
}

// Animated splash. A light sweeps across the lettering from left to right,
// revealing the brand gradient behind it, a quick glint follows, and the tagline
// fades in underneath. Redraws in place via ANSI cursor moves, so it must only
// be called on a TTY (the caller gates this behind `shouldAnimate`).
export async function animateBanner(tagline: string, text = 'brignano'): Promise<void> {
  const columns = termWidth();
  const art = bannerArt(text, columns);
  const width = art[0]?.length ?? 1;
  const pad = ' '.repeat(Math.max(0, Math.floor((columns - width) / 2)));
  const frame = (body: string, sub = ''): string[] => [
    ...body.split('\n').map((l) => pad + l),
    '',
    center(sub, columns),
  ];

  let drawn = false;
  const show = (body: string, sub?: string) => {
    draw(frame(body, sub), drawn);
    drawn = true;
  };

  // 1. Sweep: the edge travels from just before the first column to just past
  //    the last, so the final frame is fully lit.
  const sweepSteps = 22;
  for (let i = 0; i <= sweepSteps; i++) {
    const edge = -1 + ((width + BAND + 1) * i) / sweepSteps;
    show(paintFrame(art, { revealEdge: edge }));
    await sleep(24);
  }

  // 2. Glint: a fast, narrow highlight skims across the settled gradient.
  const glintSteps = 16;
  for (let i = 0; i <= glintSteps; i++) {
    const at = -GLINT + ((width + 2 * GLINT) * i) / glintSteps;
    show(paintFrame(art, { glintAt: at }));
    await sleep(18);
  }

  // 3. Settle, then fade the tagline in.
  const settled = paintFrame(art);
  show(settled);
  await sleep(80);
  const fade = [0.25, 0.55, 0.8, 1];
  for (const t of fade) {
    show(settled, subtitle(tagline, mix(palette.ghost, palette.soft, t)));
    await sleep(70);
  }
}
