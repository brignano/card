// Colour tokens, copied from @brignano/design 0.6.0 (tokens.css) and named after
// the CSS custom properties they mirror. A terminal can't load a stylesheet, so
// this is the one file allowed to hold a hex: everything else styles by role.
//
// The design system's rule is "one hue, one meaning": the mark inks a graphic
// (the banner), cobalt means "you can act on this" (links, the menu), forest
// means done, amber means attention, rust means something went wrong, and the
// rest is a cool neutral ramp.

export interface Tokens {
  /** --n-900: primary text. */
  ink: string;
  /** --n-700: secondary text. */
  inkSoft: string;
  /**
   * --slate: the quietest text step — row labels, separators, UI marks. It is
   * n-600 in light and n-500 in dark, not n-500 in both: n-500 in light is
   * 3.44:1 and never carries text (DESIGN.md §10).
   */
  slate: string;
  /** --n-300: strong border, pressed surface. Also the unlit banner letters. */
  lineStrong: string;
  /** --i-ink: links, selection, anything actionable. Cobalt, OKLCH hue 256°. */
  link: string;
  /**
   * --i-hover / --i-pressed: the rest of the cobalt ladder. One hue, three
   * lightnesses, so the menu can show emphasis falling off from the live row
   * without reaching for a second colour. Note the ladder inverts between
   * themes — in dark it climbs toward white, in light it darkens — so
   * `pressed` is always the most emphatic step, never the lightest.
   */
  linkHover: string;
  linkPressed: string;
  /** --success-ink. */
  success: string;
  /** --attention-ink. */
  attention: string;
  /** --danger-ink. */
  danger: string;
  /**
   * --mark: identity, graphic only. The banner's gradient runs through these,
   * left to right. Two stops or more; the last one is the brightest, and the
   * sweep's crest is mixed from it.
   */
  mark: readonly [string, string, ...string[]];
}

// Dark theme (`:root:not([data-theme='light'])`). The default — most terminals
// people run `npx` in are dark.
export const dark: Tokens = {
  ink: '#f2f2f4',
  inkSoft: '#a8a8b0',
  slate: '#8b8b93',
  lineStrong: '#3a3a41',
  link: '#6ba5f3',
  linkHover: '#98c4ff',
  linkPressed: '#c0dbff',
  success: '#8fd4ae',
  attention: '#e0a44f',
  danger: '#ec9880',
  // --mark (light) → --mark (dark). The light step is borrowed on purpose:
  // in dark, --mark and --mark-ink converge, so a gradient between them would
  // be flat. --larch-deep (#f0bd74) used to sit on the end; dropping it takes
  // the splash's mean luminance down ~21% and its contrast span from
  // 5.05–11.31:1 to 5.05–8.87:1, so the monogram stops climbing into pale
  // yellow at the right edge. Identity, not volume, is the job here.
  mark: ['#b4741f', '#e0a44f'],
};

// Light theme (`:root`). Picked only when the terminal advertises a light
// background (see `isLightTerminal` in ui.ts).
export const light: Tokens = {
  ink: '#111114',
  inkSoft: '#52525b',
  slate: '#6b6b73',
  lineStrong: '#cbcbce',
  link: '#0159b5',
  linkHover: '#014a97',
  linkPressed: '#003e82',
  success: '#245740',
  attention: '#8a5714',
  danger: '#8a3722',
  // --mark-ink → --mark → --mark-ink: the text-safe step at the edges.
  mark: ['#8a5714', '#b4741f', '#8a5714'],
};
