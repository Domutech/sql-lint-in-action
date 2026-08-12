# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GitHub Action (`sql-lint-in-action`) that wraps [sql-lint](https://github.com/joereynolds/sql-lint) to check SQL files, with input validation/sanitization and optional live database connection (mysql/postgres) for deeper linting. Single-purpose, single-file action — there is no server, no framework, no persistent process.

## Commands

```bash
npm test              # Run the smoke test against src/index.js (no build needed)
npm run build          # Bundle src/index.js -> dist/index.js via rollup
npm run testbuild       # Run the same smoke test against the *bundled* dist/index.js
npm run security-audit  # npm audit --audit-level=moderate
```

There is no unit test framework — `test`/`testbuild` run the action end-to-end against `test/test.sql` (expected: 0 errors) and `test/test1.sql` (expected: errors), driven by env vars (see Input Handling below). To exercise a specific case locally:

```bash
INPUT_verbose='true' INPUT_path=./test/test1.sql node src/index.js
```

## Architecture

**`src/index.js` is the source; `dist/index.js` is what actually runs.** `action.yml`'s `runs.main` points at `dist/index.js` (rollup-bundled, ESM format per `rollup.config.js`). Any change to `src/index.js` requires `npm run build` before it takes effect for real action consumers — `npm run testbuild` is how you verify the bundle, not just the source, still behaves correctly. CI (`.github/workflows/main.yml`) rebuilds `dist/` on every push before exercising `uses: ./`, so a stale committed bundle won't be caught by CI alone — verify it manually (e.g. diff a fresh build) when reviewing dependency bumps.

**Three-way input resolution (`getInputFallback` in `src/index.js`).** Every input is read in this fallback order: `core.getInput` (real GitHub Actions context) → `minimist`-parsed CLI args (`--path`, `--host`, ...) → `INPUT_<NAME>` env vars (upper and original case). This is what makes `npm test` work outside a GitHub Actions runner — there's no separate test harness, just the same entrypoint invoked with env vars instead.

**Input validation exists for command-injection defense, not general robustness.** `validateInput()` rejects any string input containing `;|&\`$`, because `get_runbash()` shells out via `execSync` to run `npx sql-lint "<path>" --format=json [--config=<path>]`. Any new input that flows into that command must go through the same validation.

**Execution flow:** `initconfig()` writes a temp JSON config (host/user/password/driver/port/ignore-errors) to `os.tmpdir()` when a `host` is provided (enables DB-connected linting); otherwise sql-lint runs in local/no-DB mode. `execSync` runs sql-lint and captures stdout/stderr even on non-zero exit (errors are sql-lint findings, not action failures). `cleanup()` always removes the temp config file. Output parsing prefers JSON (`--format=json`), filters entries with empty `source`, and dedupes by `(source, error, line)`; if JSON parsing fails, it falls back to regex pattern-matching stdout — check both paths when changing output handling.

**Outputs set via `core.setOutput`** (wrapped in `safeSetOutput`, which falls back to `console.log` if `core.setOutput` throws — relevant when running outside an Actions context): `result` (success/failure), `errors-found`, `linting-target`, `execution-time`.

## Dependency changes and design docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` hold design docs and implementation plans for non-trivial dependency/security changes (see the two existing pairs there, both about closing `undici` vulnerability chains). When making a similarly non-trivial dependency change — especially a major-version bump or anything touching the audit output — follow the same pattern: a short design doc explaining the problem/approach/rejected alternatives, and a plan with concrete verification steps, committed alongside the change.

`.github/dependabot.yml` is centrally managed ("Managed by Domutech domutech-github") — don't hand-edit it directly.

Release tags (`v0.x.0`) separate distinct initiatives rather than tracking every merge — see existing tag/release messages on GitHub for the convention (e.g. governance/tooling setup, routine dependabot bumps, and deliberate security remediation are each tagged separately even when adjacent in the commit log).
