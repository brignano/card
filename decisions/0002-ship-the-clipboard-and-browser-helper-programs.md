# 0002: The bundle ships the helper programs clipboardy and open fall back to

Status: accepted
Date: 2026-11-12
From: #37

## Context
`clipboardy` and `open` each look for helper programs next to their own file
and use them when the system has none: `xsel` on Linux, a clipboard `.exe` on
Windows, and `xdg-open`. Bundling (ADR 0001) moves both libraries into
`dist/chunks/`, where those helpers no longer exist unless the build copies
them. They are about 880 kB of a 1.3 MB package. Leaving them out would give
about 440 kB, and "Copy my email" would print the address instead on Linux with
no `xsel` or Wayland clipboard and on Windows when PowerShell fails.

## Decision
Copy the helpers into `dist/`, at the paths the bundled libraries resolve, so
clipboard and browser behaviour is the same as before the bundle.

## Consequences
- No behaviour change from bundling, on any platform.
- The package is about three times larger than it could be, and every install
  downloads binaries for platforms it is not running on.
- The helper paths depend on where esbuild puts the two libraries.
  `test/pack.test.ts` checks them relative to the real chunks, so a change to
  the chunk layout fails the tests instead of silently losing the fallbacks.
