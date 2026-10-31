# Working on brignano (the `npx brignano` card)

Before every commit: `npm run lint` and `npm run build && npm test`.

## How to release

Only when Anthony says "publish X" explicitly, for that exact version.
Approval for one version is not approval for the next, and agents never run
the Release workflow on their own. An npm version can never be reused.

1. **Notes PR.** Write `releases/v<version>.md` and open a PR for Anthony to
   review. Its contents become the GitHub release body verbatim. Merge it to
   `main` before releasing. No version-bump commit is needed (see below).
2. **"publish X".** Wait for Anthony to say it.
3. **Dispatch the Release workflow** (`.github/workflows/release.yml`) on
   `main` with `version` (no leading `v`, like `2.2.0`) and `prerelease`
   (publishes to the `next` npm dist-tag). It checks the version format, that
   the notes file exists, and that the tag, GitHub release and npm version
   don't already exist; then creates the release at `main`'s HEAD and
   dispatches `publish.yml`.
4. **Verify.** Check the Publish run succeeded, then install from the registry
   rather than the repo, outside this checkout (inside it, `npx brignano`
   resolves to the local `dist/`):

   ```bash
   cd "$(mktemp -d)" && npx -y brignano@<version> --version && npx -y brignano@<version> --no-prompt
   ```

   Report the result.

### Version handling

The tag is the version. `package.json` on `main` is not bumped; the dispatched
`publish.yml` rewrites it from the tag in the runner before `npm publish`, so
the published package (and `brignano --version`) report the tag. Expect
`package.json` on `main` to lag the latest release.

### Other paths

- `publish.yml` must keep its filename: npm trusted publishing is configured
  for it by name.
- Publishing a release from the GitHub UI still triggers `publish.yml`
  (`release: published`), but that path does not rewrite `package.json`: it
  fails unless the tag matches the `version` in `package.json`, so it needs a
  bump PR first. Prefer the Release workflow.
