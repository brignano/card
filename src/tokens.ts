// Colour tokens, copied from @brignano/design 0.2.0 (tokens.css) and named after
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
  /** --n-500: muted labels and UI marks. */
  slate: string;
  /** --n-300: strong border, pressed surface. Also the unlit banner letters. */
  lineStrong: string;
  /** --i-ink: links, selection, anything actionable. */
  link: string;
  /** --success-ink. */
  success: string;
  /** --attention-ink. */
  attention: string;
  /** --danger-ink. */
  danger: string;
  /** --mark: identity, graphic only. The banner's gradient runs through these. */
  mark: readonly [string, string, string];
}

// Dark theme (`:root:not([data-theme='light'])`). The default — most terminals
// people run `npx` in are dark.
export const dark: Tokens = {
  ink: '#f2f2f0',
  inkSoft: '#a8a8b0',
  slate: '#8b8b93',
  lineStrong: '#3a3a41',
  link: '#60a5fa',
  success: '#8fd4ae',
  attention: '#e0a44f',
  danger: '#ec9880',
  // --mark-ink (light) → --mark → --larch-deep (dark): deep larch to bright larch.
  mark: ['#b4741f', '#e0a44f', '#f0bd74'],
};

// Light theme (`:root`). Picked only when the terminal advertises a light
// background (see `isLightTerminal` in ui.ts).
export const light: Tokens = {
  ink: '#111111',
  inkSoft: '#52525b',
  slate: '#8a8a8f',
  lineStrong: '#cbcbce',
  link: '#1d4ed8',
  success: '#245740',
  attention: '#8a5714',
  danger: '#8a3722',
  // --mark-ink → --mark → --mark-ink: the text-safe step at the edges.
  mark: ['#8a5714', '#b4741f', '#8a5714'],
};
