# Bump `@actions/core` to close remaining `undici` vulnerability

## Problem

After removing the unused `@actions/github` dependency
(`2026-08-12-remove-unused-actions-github-design.md`), `npm audit` still
reports one high-severity finding: `undici` (`<=6.27.0`), pulled in
transitively via `@actions/core@^1.10.1` -> `@actions/http-client@2.2.3`
(plus a moderate advisory on `@actions/http-client` itself for the same
vulnerability).

Unlike `@actions/github`, `@actions/core` is not dead code — it's used
throughout `src/index.js` for `core.getInput`, `core.setOutput`,
`core.setFailed`, `core.warning`, and `core.info`. It can't be removed; it
has to be upgraded. The fix requires jumping from `^1.10.1` to `3.0.1`,
skipping two majors.

## Approach

Bump `@actions/core` directly from `^1.10.1` to `^3.0.1` in one PR, rather
than staging through `2.0.3` first.

This is safe based on the following, verified before writing this spec:

- **API compatibility**: all 5 functions the code calls (`getInput`,
  `setOutput`, `setFailed`, `warning`, `info`) have identical signatures in
  `3.0.1`'s `core.d.ts` compared to what `src/index.js` already expects.
- **ESM breaking change is a non-issue**: `3.0.0`'s only documented
  breaking change is dropping CommonJS support (ESM-only). This project is
  already `"type": "module"` with `import`/`export` throughout
  `src/index.js`, and `rollup.config.js` already builds `dist/index.js` in
  `format: "es"`. There is no CJS interop to break.
- **The vulnerability chain is actually closed**: `@actions/core@3.0.1`
  depends on `@actions/http-client@^4.0.0`, which depends on
  `undici@^6.23.0`. The latest matching `6.x` release is `6.28.0`, which is
  past the vulnerable `<=6.27.0` range reported by the audit.
- **End-to-end trial run**: the bump was tested in a disposable git
  worktree prior to this spec. Results: `npm audit` -> 0 vulnerabilities
  (down from 1 high, 1 moderate); `npm test` passes against `src/index.js`;
  `npm run build` regenerates `dist/index.js` cleanly (only benign rollup
  "this rewritten to undefined" / circular-dependency warnings, consistent
  with TypeScript-compiled interop code, not errors); `npm run testbuild`
  passes against the rebuilt `dist/index.js`.

**Rejected alternative: staged bump via `2.0.3` first.** Would land
`2.0.3` (Node 24 support, `http-client@3.0.0`) as an intermediate PR, then
`3.0.1` as a follow-up. Rejected because it adds a full extra PR/review
cycle without reducing risk — the API surface and ESM compatibility for the
direct jump are already confirmed clean by the trial run above.

## Changes

1. `package.json` — `"@actions/core": "^1.10.1"` -> `"^3.0.1"`.
2. Run `npm install` to regenerate `package-lock.json` with the updated
   dependency tree (which upgrades `@actions/exec` from 1.1.1 to 3.0.0 and
   `@actions/io` from 1.1.3 to 3.0.2, upgrades `@actions/http-client` to
   `^4.0.0`, and drops the now-unneeded `@fastify/busboy` transitive
   dependency).
3. Run `npm run build` (rollup) to regenerate `dist/index.js`, since
   `action.yml` runs the bundled file (`dist/index.js`), not
   `src/index.js`, as the actual action entry point.

No changes to `src/index.js` — the `@actions/core` import and all its
call sites are unchanged.

## Verification

- `npm audit` — 0 vulnerabilities (currently 1 high, 1 moderate).
- `npm ls @actions/core` — resolves to `3.0.1`.
- `npm test` — existing sql-lint smoke test passes against `src/index.js`.
- `npm run build` — completes without errors (rollup interop warnings are
  expected and pre-existing in kind, not new failures).
- `npm run testbuild` — existing sql-lint smoke test passes against the
  rebuilt `dist/index.js`.

## Out of scope

- No other dependencies touched in this change.
- Dependabot config left as-is, matching the precedent set by
  `2026-08-12-remove-unused-actions-github-design.md`.
- `src/index.js` behavior is unchanged; this is a dependency-version-only
  change.
