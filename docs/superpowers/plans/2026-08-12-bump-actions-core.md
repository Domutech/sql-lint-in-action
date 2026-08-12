# Bump @actions/core to 3.0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the remaining high-severity `undici` vulnerability chain (`@actions/core@^1.10.1` -> `@actions/http-client@2.2.3` -> `undici@<=6.27.0`) by bumping `@actions/core` directly to `^3.0.1`, in one step.

**Architecture:** `@actions/core` is used throughout `src/index.js` (`getInput`, `setOutput`, `setFailed`, `warning`, `info`) so it can't be removed like `@actions/github` was. All 5 of those functions are signature-identical in `3.0.1`. `3.0.1` depends on `@actions/http-client@^4.0.0` -> `undici@^6.23.0`, which resolves to `6.28.0` — past the vulnerable `<=6.27.0` range. `3.0.0`'s only breaking change (ESM-only) is a non-issue: this project is already `"type": "module"` with `import`/`export`, and `rollup.config.js` already builds `dist/index.js` with `format: "es"`. Bumping the version in `package.json`, regenerating the lockfile, and rebuilding the bundle closes the vulnerability with no source changes and no behavior change.

**Tech Stack:** Node.js (ESM), npm, rollup (bundling to `dist/index.js` per `action.yml`'s `runs.main`).

## Global Constraints

- Node engine floor: `>=20.0.0` (package.json `engines.node`).
- `action.yml` runs `dist/index.js` (bundled output), not `src/index.js` — a rebuild is required for the fix to take effect at runtime.
- No changes to `src/index.js` — the `@actions/core` import and all call sites are unchanged.
- Do not touch any other dependency (`minimist`, `sql-lint`) in this change.
- Do not modify Dependabot config in this change.

---

### Task 1: Bump `@actions/core` and verify the vulnerability is gone

**Files:**
- Modify: `package.json` (`@actions/core` version in `dependencies`)
- Modify (generated): `package-lock.json` (via `npm install`)
- Modify (generated): `dist/index.js`, `dist/index.js.map` (via `npm run build`)

**Interfaces:**
- Consumes: nothing (no other task precedes this one).
- Produces: nothing (this is the only task in the plan) — final state is a clean `npm audit` and passing `npm test` / `npm run testbuild`.

- [ ] **Step 1: Bump the version in package.json**

In `package.json`, change the `@actions/core` line in `dependencies`:

```json
    "@actions/core": "^1.10.1",
```

to:

```json
    "@actions/core": "^3.0.1",
```

The resulting `dependencies` block should read:

```json
  "dependencies": {
    "@actions/core": "^3.0.1",
    "minimist": "^1.2.8",
    "sql-lint": "^1.0.2"
  },
```

- [ ] **Step 2: Regenerate the lockfile**

Run: `npm install`

This updates `package-lock.json` to resolve `@actions/core@3.0.1` and its updated dependency tree, which upgrades `@actions/exec` from 1.1.1 to 3.0.0 and `@actions/io` from 1.1.3 to 3.0.2, upgrades `@actions/http-client` from `2.2.3` to `^4.0.0`, and drops the now-unneeded `@fastify/busboy` transitive dependency.

- [ ] **Step 3: Confirm the version resolved correctly**

Run: `npm ls @actions/core`

Expected: reports `@actions/core@3.0.1`.

- [ ] **Step 4: Confirm the audit finding is resolved**

Run: `npm audit`

Expected: `found 0 vulnerabilities`. Before this change, this command reports 1 high-severity `undici` finding via `@actions/core` -> `@actions/http-client`.

- [ ] **Step 5: Run the existing smoke test (source)**

Run: `npm test`

This runs `INPUT_verbose='true' INPUT_path=./test/test.sql node src/index.js` (per the `test` script in `package.json`). Expected: exits successfully, sql-lint output printed, `result=success` in the verbose output, no runtime errors.

- [ ] **Step 6: Rebuild the bundled action**

Run: `npm run build`

This regenerates `dist/index.js` (and its sourcemap) via rollup, per `rollup.config.js` (`input: "src/index.js"`, `output.file: "dist/index.js"`, `output.format: "es"`). Expected: completes with `created dist/index.js`. Rollup may print benign warnings (`"this" has been rewritten to "undefined"`, `Circular dependency` inside `@actions/core`'s own compiled files) — these are pre-existing-in-kind interop warnings, not errors, and do not fail the build.

- [ ] **Step 7: Run the existing smoke test (built artifact)**

Run: `npm run testbuild`

This runs `INPUT_verbose='true' INPUT_path=./test/test.sql node dist/index.js` (per the `testbuild` script in `package.json`). Expected: exits successfully, sql-lint output printed, `result=success`, no runtime errors from the bundled action.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json dist/index.js dist/index.js.map
git commit -m "$(cat <<'EOF'
Bump @actions/core to 3.0.1

Closes the remaining high-severity undici vulnerability chain
(@actions/core -> @actions/http-client -> undici <=6.27.0), left over
after removing the unused @actions/github dependency (#6). @actions/core
3.0.1 depends on @actions/http-client ^4.0.0 -> undici ^6.23.0, which
resolves to the patched 6.28.0. The jump skips the 2.x line: all 5
@actions/core functions this project calls (getInput, setOutput,
setFailed, warning, info) are signature-identical in 3.0.1, and 3.0.0's
only breaking change (ESM-only) doesn't apply since this project already
builds and runs as ESM.
EOF
)"
```
