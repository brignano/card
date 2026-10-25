# npx brignano

[![npm version](https://img.shields.io/npm/v/brignano?style=flat-square&logo=npm&color=8b5cf6)](https://www.npmjs.com/package/brignano)
[![npm downloads](https://img.shields.io/npm/dm/brignano?style=flat-square&color=8b5cf6)](https://www.npmjs.com/package/brignano)
[![CI](https://img.shields.io/github/actions/workflow/status/brignano/card/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/brignano/card/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/brignano?style=flat-square&color=8b5cf6)](LICENSE)

An interactive terminal business card for Anthony Brignano. Run it with `npx` to get an animated, centered ASCII-art intro, a styled card with **live GitHub stats**, and quick actions — copy my email, open my socials, save my contact, or grab a scannable QR code.

## Quick start

```bash
npx brignano
```

![](demo.gif)

## What it does

- **Animated splash** (`figlet` + `chalk`): a light sweeps across the lettering to reveal the brand gradient, a glint follows, and a tagline fades in beneath. Everything is centered on your terminal, and the banner steps down to a smaller font on narrow windows.
- **Styled business card** (`boxen` + `chalk`) with name, role, links and email, revealed line by line under the banner.
- **Live GitHub stats** — follower/repo counts and my latest repo, fetched fresh with a strict ~1.5s timeout. If the network is slow or offline, the card renders instantly and just omits the live line. It never hangs.
- **Interactive menu** (`inquirer`) that comes back after each action, so you can do several things in one sitting:
  - Copy my email to your clipboard
  - Send me an email (`mailto:`)
  - Open my GitHub / LinkedIn
  - View my resume
  - Save my contact as a `.vcf` (opens in Contacts)
  - Show a scannable contact **QR code**
  - Quit (or press Ctrl+C at any time)

The animation, network fetch, and prompt are all skipped automatically when output isn't a TTY (piped, CI, or `--no-prompt`), so it stays fast and never blocks scripts.

## CLI

Run `npx brignano --help` to see this list.

| Flag | Description |
|------|-------------|
| `-h, --help` | Show help and exit. |
| `-v, --version` | Print the installed version and exit. |
| `-r, --view` / `--resume` | Open my resume in your default browser (`https://brignano.io/resume`). |
| `-e, --email` | Open your mail client with a new message to `hi@brignano.io`. |
| `--qr` | Print a scannable QR code to my website and exit. |
| `--vcard` / `--save-contact` | Save my contact card (`.vcf`) and open it. |
| `--no-animation` | Render the full card instantly, skipping the reveal animation. |
| `--no-prompt` | Show the card only and exit (non-interactive). |
| `-d, --download` | Deprecated alias for `--view`. |

Unrecognized flags exit with a non-zero status instead of silently falling back
to the default card.

> **Note:** as of `2.0.0`, `-v` prints the version (the near-universal CLI
> convention). The resume now lives at `-r`, and the long `--view` flag is
> unchanged.

### Examples

```bash
npx brignano              # full interactive experience
npx brignano --view       # jump straight to my resume
npx brignano --version    # print the version
npx brignano --qr         # print a QR code to my site
npx brignano --vcard      # save my contact card
npx brignano --no-prompt  # card only (useful in CI/scripts)
```

## Local development

```bash
git clone https://github.com/brignano/card.git
cd card
npm install
npm run build
node dist/card.js
```

> **Running it inside this repo:** `npx brignano` resolves to *this* package's
> `bin` (`dist/`), not the published one — and `dist/` is gitignored. On a fresh
> clone it will exit silently until you build. Use `npm run dev` (runs the
> TypeScript directly, no build step), or `npm run build` first. To exercise the
> published package instead, run `npx brignano` from any other directory.

Source lives in `src/` (split into small modules — `card.ts` is the entry/`bin`
target) and compiles to `dist/` via `tsc`. `npm run dev` runs the TypeScript
directly through `tsx`; `npm run lint` and `npm run format` use
[Biome](https://biomejs.dev).

Only `dist/` is published — the tarball is ~13 kB, so `npx brignano` stays a fast
cold start.

## Prerequisites

- Node.js **>=20** (`npx` ships with npm).

## Notes

- Links printed in the card are cmd/ctrl+clickable in supported terminals.
- The `--download` flag is deprecated and now opens the resume in your browser instead of writing a local file.

## Credits

Inspired by [anmol098/npx_card](https://github.com/anmol098/npx_card).

## License

[ISC](LICENSE) © Anthony Brignano
