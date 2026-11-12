# 0004: The minimum Node is 22.18, and Node runs the TypeScript directly

Status: accepted
Date: 2026-11-12
From: #29

## Context
Node 20 reached end of life in April 2026, but `engines` still allowed it and CI
still tested it, while Node 26 was untested. The tests and `npm run dev` also
needed `tsx`, only because Node 20 cannot run TypeScript itself. The options
were to keep supporting 20, to require any Node 22, or to require the first 22.x
that strips types by default.

## Decision
`engines.node` is `>=22.18`, the first 22.x where type stripping is on by
default. CI tests 22, 24 and 26. `node` runs the sources and tests directly, so
`tsx` is gone and relative imports end in `.ts`.

## Consequences
- Raising `engines` is a breaking change for anyone on Node 20 or an early 22,
  so it ships in a major release.
- One less dev dependency, and tests run the same way Node runs the sources.
- The sources may only use syntax Node can strip: no enums, namespaces or
  parameter properties. `tsc` enforces this with `erasableSyntaxOnly`.
- The published bundle is unaffected by how the sources are run; esbuild still
  builds it, now targeting Node 22.
