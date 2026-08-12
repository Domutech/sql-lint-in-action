# Remove Unused @actions/github Dependency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the `@actions/github` -> `undici` high-severity vulnerability chain by removing the unused `@actions/github` dependency, rather than bumping it to a new major version. (A separate, pre-existing `undici` finding via `@actions/core` remains and is deferred — see Task 1, Step 5.)

**Architecture:** `@actions/github` is imported in `src/index.js` but never referenced (no `github.context`, no `github.getOctokit()`). Deleting the import and the `package.json` entry, then regenerating the lockfile and the rollup-bundled `dist/index.js`, removes the `@actions/github` vulnerable dependency chain with no behavior change.

**Tech Stack:** Node.js (ESM), npm, rollup (bundling to `dist/index.js` per `action.yml`'s `runs.main`).

## Global Constraints

- Node engine floor: `>=20.0.0` (package.json `engines.node`).
- `action.yml` runs `dist/index.js` (bundled output), not `src/index.js` — the actual action entry point is the build artifact, so a rebuild is required for the fix to take effect at runtime.
- Do not modify `@actions/core` usage — still required.
- Do not modify `sql-lint` / `mysql2` — unrelated, already patched in a prior commit.
- Do not modify Dependabot config in this change.

---

### Task 1: Remove `@actions/github` and verify the vulnerability is gone

**Files:**
- Modify: `src/index.js:10` (delete unused import)
- Modify: `package.json` (remove `@actions/github` from `dependencies`)
- Modify (generated): `package-lock.json` (via `npm install`)
- Modify (generated): `dist/index.js`, `dist/index.js.map` (via `npm run build`)

**Interfaces:**
- Consumes: nothing (no other task precedes this one).
- Produces: nothing (this is the only task in the plan) — final state is a clean `npm audit` and a passing `npm test`.

- [ ] **Step 1: Remove the unused import**

In `src/index.js`, delete line 10:

```js
import * as github from '@actions/github';
```

Confirm no other line in the file references `github.` — the only remaining GitHub Actions import should be `import * as core from '@actions/core';` on line 9.

- [ ] **Step 2: Remove the dependency from package.json**

In `package.json`, remove this line from the `dependencies` block:

```json
    "@actions/github": "^6.0.0",
```

The resulting `dependencies` block should read:

```json
  "dependencies": {
    "@actions/core": "^1.10.1",
    "minimist": "^1.2.8",
    "sql-lint": "^1.0.2"
  },
```

- [ ] **Step 3: Regenerate the lockfile**

Run: `npm install`

This updates `package-lock.json`, dropping `@actions/github`, `undici`, and any packages that were only present to satisfy them (e.g. `@octokit/*` packages not required by `@actions/core`'s own dependency tree).

- [ ] **Step 4: Confirm `@actions/github` is gone from the tree**

Run: `npm ls @actions/github`

Expected: reports `(empty)` / not found — `@actions/github` no longer appears in the dependency tree. (Note: `undici` will still appear via `@actions/core` -> `@actions/http-client` — this is expected and out of scope.)

- [ ] **Step 5: Confirm the @actions/github audit finding is resolved**

Run: `npm audit`

Expected: the high-severity `undici` finding sourced via `@actions/github` is gone. A separate, pre-existing high-severity `undici` finding via `@actions/core` -> `@actions/http-client` will remain (deferred; requires major version bump to `@actions/core`).

- [ ] **Step 6: Rebuild the bundled action**

Run: `npm run build`

This regenerates `dist/index.js` (and its sourcemap) via rollup, per `rollup.config.js` (`input: "src/index.js"`, `output.file: "dist/index.js"`).

- [ ] **Step 7: Confirm the bundled github.* code is gone**

Run: `grep -c "actions/github\|getOctokit" dist/index.js`

Expected: `0` (no matches). Before this change, `dist/index.js` contained bundled code like `github.getOctokit = github.context = void 0;` — confirm it's no longer present.

- [ ] **Step 8: Run the existing smoke test**

Run: `npm test`

This runs `INPUT_verbose='true' INPUT_path=./test/test.sql node src/index.js` (per the `test` script in `package.json`). Expected: exits successfully, sql-lint output printed, no errors about missing `@actions/github`.

- [ ] **Step 9: Commit**

```bash
git add src/index.js package.json package-lock.json dist/index.js dist/index.js.map
git commit -m "$(cat <<'EOF'
Remove unused @actions/github dependency

npm audit fix (even --force) can't resolve the undici high-severity
vulnerability chain (@actions/github -> @actions/http-client -> undici)
because the fix requires @actions/github >=7.0.0, outside the pinned
^6.0.0 range. The import was dead code (never referenced after being
added), so removing it eliminates the vulnerable dependency tree
entirely instead of bumping an unused package to a new major version.
EOF
)"
```
