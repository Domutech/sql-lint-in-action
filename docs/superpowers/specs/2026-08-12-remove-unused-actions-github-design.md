# Remove unused `@actions/github` dependency

## Problem

`npm audit` reports a high-severity vulnerability chain: `undici` (<=6.27.0) is
pulled in transitively via `@actions/github` -> `@actions/http-client` ->
`undici`. `npm audit fix`, including `--force`, cannot resolve it: the fix
requires `@actions/github` >= 7.0.0, which is outside the `^6.0.0` range
pinned in `package.json`, and no patched release exists within the `6.x` or
`5.x` (undici) lines.

Investigation found `@actions/github` is imported in `src/index.js` but never
used — no reference to `github.context`, `github.getOctokit()`, or any other
export. It has been dead code since it was first added
(`bad99ca GEN-6743 Dependency Installation (#2)`) and was never referenced in
any later commit. The simplest fix is to remove the dependency rather than
upgrade an unused package to a new major version.

## Approach

Remove `@actions/github` entirely instead of bumping it.

**Rejected alternative:** bump to `@actions/github@latest` (9.1.1). This
would fix the audit finding but keeps an unused dependency (and its full
`@octokit/*` tree) in the bundle purely to satisfy dependabot/audit tooling,
with no functional benefit and ongoing update churn for code that does
nothing.

## Changes

1. `src/index.js` — delete the unused `import * as github from
   '@actions/github';` (line 10).
2. `package.json` — remove `"@actions/github": "^6.0.0"` from
   `dependencies`.
3. Run `npm install` to regenerate `package-lock.json`, dropping
   `@actions/github`, `undici`, and any packages solely required by them.
4. Run `npm run build` (rollup) to regenerate `dist/index.js`, since
   `action.yml` runs the bundled file (`dist/index.js`), not `src/index.js`,
   as the actual action entry point.

## Verification

- `npm audit` — the undici/high-severity findings are gone.
- `npm test` — existing sql-lint smoke test still passes.
- `npm ls @actions/github` — package no longer present in the tree at all.
- Diff `dist/index.js` to confirm the previously-bundled `github.*` code
  (`getOctokit`, `Context`, etc.) is gone from the built output.

## Out of scope

- `@actions/core` is untouched (still used, still needed).
- `sql-lint` / `mysql2` are unrelated and already patched (recent commits).
- Dependabot config is left as-is for this change; not adding an ignore rule
  or otherwise updating it in this pass.
