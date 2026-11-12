# 0001: The published package is a bundle with no runtime dependencies

Status: accepted
Date: 2026-11-12
From: #27, #37

## Context
A cold `npx brignano` installed 96 packages (28 MB) before it printed anything;
18 MB of that was `figlet`'s fonts, used to draw one fixed word. The options
were to leave it, to trim dependencies one at a time, or to bundle everything
into the published files. For the bundle there were two shapes: one file, or an
entry file plus chunks for the libraries only an action needs (clipboard,
browser opener, QR renderer).

## Decision
Bundle with esbuild into `dist/` and publish no `dependencies`. The banner
lettering is rendered once by `figlet` into a committed `src/bannerArt.ts`, so
`figlet` never ships. Use code splitting: it started in about 85 ms against
about 105 ms for a single file. `tsc` stays as the type-checker only.

## Consequences
- One package (1.4 MB) installs instead of 96, and startup drops from 180–260 ms
  to about 85 ms.
- Every package is a dev dependency. A `dependencies` entry is a bug, and
  `test/pack.test.ts` fails on one.
- The published code is minified, so a stack trace from a user is hard to read.
- The bundle carries other people's code, so the build writes their licences to
  `dist/THIRD-PARTY-LICENSES.txt` and fails if one is missing.
- Changing the banner word or fonts means running `npm run gen:banner`.
