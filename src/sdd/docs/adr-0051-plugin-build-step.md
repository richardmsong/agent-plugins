# ADR: Plugin build step — self-contained claude/sdd/ package

**Status**: implemented
**Status history**:
- 2026-04-24: draft
- 2026-04-24: accepted — paired with spec-docs-mcp.md, spec-dashboard.md, adr-0047 supersession note
- 2026-04-24: implemented — all scope CLEAN (build.sh, server.ts, CI workflow, tests)

## Overview

Add a build step that produces a self-contained `claude/sdd/` directory with no symlinks. When Claude Code installs the plugin, it copies only `claude/sdd/` — symlinks to `src/sdd/` break because the canonical source doesn't exist on the target machine. The build step bundles the MCP server and dashboard into single JS files, copies all skills/agents/guards/context into `claude/sdd/`, and a GitHub Action auto-commits the build output on every push so `claude/sdd/` never drifts from `src/sdd/`.

## Motivation

ADR-0047 structured the plugin as symlinks from `claude/sdd/` → `src/sdd/`. This works in the development repo but fails on install: Claude Code copies only the `claude/sdd/` directory tree. A colleague's machine had broken symlinks for every skill, agent, context.md, the MCP server, guard scripts, and sdd-master — the plugin was effectively empty.

The root cause: ADR-0047 assumed the full repo is cloned on install. Claude Code's `/plugin install` copies only the plugin source directory, not the whole repo.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Build output | `claude/sdd/` becomes a build artifact — all symlinks replaced with real files | Only directory that ships; must be self-contained |
| MCP server | `bun build --target=bun` to single JS bundle | Cross-platform, no `node_modules` needed. ~few hundred KB vs ~50MB compiled binary. Requires `bun` at runtime. |
| Dashboard | Included in plugin package — bundled server + pre-built UI | End users browse their own project's ADRs/specs with `/dashboard`. Not dev-only. |
| Dashboard server | `bun build --target=bun` to single JS bundle, same as MCP | Consistent bundling approach. UI dist pre-built by Vite. |
| Runtime dependency | Require `bun` on end user's machine | MCP and dashboard use `bun:sqlite` and `Bun.serve()`. Migrating to Node would require replacing both across all components. Bun is a single curl install. |
| Skills/agents | Copied as real files from `src/sdd/.agent/skills/` and `src/sdd/.agent/agents/` | SKILL.md files are small text; copying is simpler than any alternative |
| Guard scripts | Copied from `src/sdd/hooks/guards/` into `claude/sdd/hooks/guards/` | Hook wrappers are also rewritten by the build to use `${CLAUDE_PLUGIN_ROOT}/hooks/guards/` instead of the relative `../../../src/sdd/` path |
| context.md | Copied from `src/sdd/context.md` | Small file, used by /setup to scaffold CLAUDE.md |
| bin/sdd-master | Copied from `src/sdd/bin/sdd-master` | Shell script, no compilation needed |
| Build script | `src/sdd/build.sh` — runs from repo root | Single script that cleans stale symlinks, bundles JS, copies all assets |
| Source of truth | `src/sdd/` remains canonical; `claude/sdd/` is derived | Developers edit `src/sdd/`; build step produces `claude/sdd/` |
| Commit strategy | Built files committed to repo; CI auto-commits on push | Clone-and-go experience. CI prevents drift — developers never manually run build. |
| CI auto-build | GitHub Action runs `build.sh` on push, commits if changed | Zero manual steps. Automated commits appear in PR history. |
| Dashboard exclusions | `docs-dashboard/tests/`, `docs-dashboard/node_modules/` not shipped | Test files and dev dependencies are not needed at runtime |
| Self-dev workflow | `/local-setup` unchanged — symlinks override installed plugin | Developers still use symlinks for live editing; build step is for distribution only |

## User Flow

### Building for distribution (automated)
1. Developer edits files in `src/sdd/`
2. Pushes branch / opens PR
3. GitHub Action runs `build.sh`, commits updated `claude/sdd/` to the branch
4. `claude/sdd/` is always in sync — no manual build step

### Building locally (optional, for testing)
1. Run `bash src/sdd/build.sh`
2. Inspect `claude/sdd/` to verify output
3. Test with `/dashboard` or MCP tools

### End user install
1. `/plugin install spec-driven-dev@agent-plugins`
2. Claude copies `claude/sdd/` to plugin storage — all real files, no symlinks
3. MCP binary runs via `bun ${CLAUDE_PLUGIN_ROOT}/dist/docs-mcp.js`
4. Skills, agents, guards all load from real files
5. `/setup` in target project — configures project-local settings
6. `/dashboard` in target project — browses that project's ADRs and specs

### Prerequisites for end users
- `bun` — required for MCP server and dashboard (`curl -fsSL https://bun.sh/install | bash`)

## Component Changes

### src/sdd/build.sh (new)

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$REPO_ROOT/src/sdd"
OUT="$REPO_ROOT/claude/sdd"

echo "=== SDD Plugin Build ==="

# 1. Remove stale symlinks in OUT (leave real files intact)
echo "Cleaning stale symlinks..."
find "$OUT" -type l -delete

# 2. Install workspace dependencies (needed for workspace:* resolution)
# Note: --frozen-lockfile is NOT used because bun.lock is gitignored
# (it contained internal registry URLs). bun install regenerates it from package.json.
echo "Installing workspace dependencies..."
cd "$SRC"
bun install

# 3. Bundle MCP server
echo "Bundling docs-mcp..."
mkdir -p "$OUT/dist"
bun build --target=bun "$SRC/docs-mcp/src/index.ts" --outfile "$OUT/dist/docs-mcp.js"

# 4. Bundle dashboard server
# No --define needed: server.ts uses process.env.CLAUDE_PLUGIN_ROOT at runtime
echo "Bundling docs-dashboard..."
bun build --target=bun "$SRC/docs-dashboard/src/server.ts" \
  --outfile "$OUT/dist/docs-dashboard.js"

# 5. Build dashboard UI
echo "Building dashboard UI..."
cd "$SRC/docs-dashboard/ui"
bun run build
mkdir -p "$OUT/dist/ui"
cp -R dist/* "$OUT/dist/ui/"

# 6. Copy skills (excluding local-setup which is dev-only)
# NOTE: The setup/ skill has NO counterpart in src/sdd/.agent/skills/ — it lives
# only in claude/sdd/skills/setup/ and is the one skill that is authored directly
# in the output directory (it's Claude-specific and not part of the canonical source).
# The per-skill rm+cp below is safe because it only touches skills that exist in SRC.
# A full `rm -rf "$OUT/skills"` would delete setup/ — never do that.
echo "Copying skills..."
for skill in "$SRC/.agent/skills"/*/; do
  name=$(basename "$skill")
  [ "$name" = "local-setup" ] && continue
  rm -rf "$OUT/skills/$name"
  cp -R "$skill" "$OUT/skills/$name"
done

# 7. Post-process dashboard skill for bundled distribution
# The source SKILL.md has three things that don't work in the bundled install:
#   a. Step 1 references docs-dashboard/ui/ for building UI — doesn't exist in bundle (UI is pre-built)
#   b. Server path points to TypeScript source — must point to bundled JS
#   c. --docs-dir flag — server.ts only parses --root (with CLAUDE_PROJECT_DIR fallback)
# Strategy: rewrite the entire SKILL.md to the distribution version.
cat > "$OUT/skills/dashboard/SKILL.md" << 'SKILL_EOF'
---
name: dashboard
description: Start the docs dashboard server. UI is pre-built; launches the bundled Bun server on port 4567.
version: 1.0.0
user_invocable: true
---

# Dashboard

Start the docs dashboard server for browsing ADRs, specs, lineage graphs, and blame data.

## Usage

```
/dashboard [--port <n>]
```

---

## Algorithm

```
1. Start the server
2. Open in browser (if Playwright MCP available)
```

No UI build step needed — the UI is pre-built and bundled at `${CLAUDE_PLUGIN_ROOT}/dist/ui/`.

---

## Step 1 — Start the server

Launch the dashboard server in the background. Try the default port first; if it's in use, increment and retry:

```bash
PORT=<port>
while lsof -iTCP:$PORT -sTCP:LISTEN &>/dev/null; do
  PORT=$((PORT + 1))
done
cd "$CLAUDE_PROJECT_DIR" && bun run "${CLAUDE_PLUGIN_ROOT}/dist/docs-dashboard.js" --root "$CLAUDE_PROJECT_DIR" --port $PORT
```

Default port is `4567`. If the user passed `--port <n>`, start scanning from that port instead.

Use `run_in_background: true` so the server runs without blocking the session.

Print the URL: `Dashboard running at http://127.0.0.1:<port>/`

---

## Step 2 — Open in browser (optional)

If the Playwright MCP is available, navigate to the dashboard URL to confirm it's serving:

```
mcp__playwright__browser_navigate({ url: "http://127.0.0.1:<port>/" })
```

If Playwright is not available, just print the URL and let the user open it manually.
SKILL_EOF

# 7b. Write the bundled .mcp.json (overwrite existing — it references TS source)
cat > "$OUT/.mcp.json" << 'MCP_EOF'
{
  "docs": {
    "command": "bun",
    "args": [
      "run",
      "${CLAUDE_PLUGIN_ROOT}/dist/docs-mcp.js"
    ]
  }
}
MCP_EOF

# 8. Copy agents
echo "Copying agents..."
rm -rf "$OUT/agents"
cp -R "$SRC/.agent/agents" "$OUT/agents"

# 9. Copy guard scripts
echo "Copying guards..."
mkdir -p "$OUT/hooks/guards"
cp "$SRC/hooks/guards/blocked-commands.sh" "$OUT/hooks/guards/"
cp "$SRC/hooks/guards/source-guard.sh" "$OUT/hooks/guards/"

# 10. Rewrite hook wrappers to use CLAUDE_PLUGIN_ROOT instead of relative src/ path
# The source files contain: GUARD="$SCRIPT_DIR/../../../src/sdd/hooks/guards/..."
# We replace the entire GUARD= line to avoid sed escaping issues with $ and quotes.
# Note: uses a temp file instead of sed -i to be portable across BSD and GNU sed
# (BSD sed requires `sed -i ''`, GNU sed requires `sed -i` — no single syntax works on both).
for wrapper in "$OUT/hooks/blocked-commands-hook.sh" "$OUT/hooks/source-guard-hook.sh"; do
  guard_name=$(grep 'GUARD=' "$wrapper" | sed 's|.*/||' | tr -d '"')
  sed "s|^GUARD=.*|GUARD=\"\${CLAUDE_PLUGIN_ROOT}/hooks/guards/${guard_name}\"|" "$wrapper" > "$wrapper.tmp"
  mv "$wrapper.tmp" "$wrapper"
done

# 11. Copy context.md and sdd-master
cp "$SRC/context.md" "$OUT/context.md"
mkdir -p "$OUT/bin"
cp "$SRC/bin/sdd-master" "$OUT/bin/sdd-master"
chmod +x "$OUT/bin/sdd-master"

# 12. Validate critical files exist
echo "Validating build..."
for f in "$OUT/skills/setup/SKILL.md" "$OUT/.mcp.json" "$OUT/.claude-plugin/plugin.json" \
         "$OUT/dist/docs-mcp.js" "$OUT/dist/docs-dashboard.js" "$OUT/dist/ui/index.html" \
         "$OUT/hooks/guards/blocked-commands.sh" "$OUT/hooks/guards/source-guard.sh"; do
  [ -f "$f" ] || { echo "FATAL: missing $f"; exit 1; }
done

echo "Build complete: $OUT"
```

### claude/sdd/.mcp.json (updated)

```json
{
  "docs": {
    "command": "bun",
    "args": [
      "run",
      "${CLAUDE_PLUGIN_ROOT}/dist/docs-mcp.js"
    ]
  }
}
```

Bundled JS file — no `node_modules`, no TypeScript compilation at runtime. Requires `bun`.

### claude/sdd/ (after build)

```
claude/sdd/
├── .claude-plugin/plugin.json          # real (unchanged)
├── .mcp.json                           # real (updated: bundled JS)
├── dist/
│   ├── docs-mcp.js                     # bundled MCP server
│   ├── docs-dashboard.js               # bundled dashboard server
│   └── ui/                             # pre-built dashboard UI
│       ├── index.html
│       └── assets/
├── bin/
│   └── sdd-master                      # copied shell script
├── context.md                          # copied
├── hooks/
│   ├── hooks.json                      # real (unchanged)
│   ├── blocked-commands-hook.sh        # real (unchanged)
│   ├── source-guard-hook.sh            # real (unchanged)
│   └── guards/
│       ├── blocked-commands.sh         # copied
│       └── source-guard.sh            # copied
├── skills/
│   ├── setup/SKILL.md                  # real (unchanged, Claude-specific — no src/ counterpart, lives only here)
│   ├── feature-change/SKILL.md         # copied
│   ├── plan-feature/SKILL.md           # copied
│   ├── design-audit/SKILL.md           # copied
│   ├── spec-evaluator/SKILL.md         # copied
│   ├── file-bug/SKILL.md              # copied
│   └── dashboard/SKILL.md             # copied
└── agents/
    ├── design-evaluator.md             # copied
    ├── dev-harness.md                  # copied
    └── spec-evaluator.md              # copied
```

### Dashboard skill update

The `/dashboard` skill needs to reference the bundled server instead of TypeScript source:

```bash
bun run "${CLAUDE_PLUGIN_ROOT}/dist/docs-dashboard.js" --root "$CLAUDE_PROJECT_DIR" --port $PORT
```

The bundled server serves pre-built UI from `${CLAUDE_PLUGIN_ROOT}/dist/ui/`.

**Resolving UI dist path in the bundle**: `import.meta.dir` is statically replaced by Bun at bundle time with the build machine's source path, which doesn't exist on the end user's machine. The concrete code changes to `server.ts`:

1. **Replace the `UI_DIST` constant** (line 153):
   ```typescript
   // Before:
   const UI_DIST = join(import.meta.dir, "../ui/dist");
   // After:
   const UI_DIST = process.env.CLAUDE_PLUGIN_ROOT
     ? join(process.env.CLAUDE_PLUGIN_ROOT, "dist/ui")
     : join(import.meta.dir, "../ui/dist");
   ```
   When `CLAUDE_PLUGIN_ROOT` is set (installed plugin), UI dist is at `${CLAUDE_PLUGIN_ROOT}/dist/ui/`. When not set (self-dev), falls back to `import.meta.dir`-relative path.

2. **Replace the auto-build `cwd`** (line 192):
   ```typescript
   // Before:
   cwd: join(import.meta.dir, "../ui"),
   // After:
   cwd: process.env.CLAUDE_PLUGIN_ROOT
     ? undefined  // auto-build not available in bundled install (UI is pre-built)
     : join(import.meta.dir, "../ui"),
   ```
   In the bundled install, `docs-dashboard/ui/` doesn't exist — the UI is pre-built at `dist/ui/`. The auto-build spawn is skipped entirely when `CLAUDE_PLUGIN_ROOT` is set.

3. **Guard the auto-build block**: Wrap the entire auto-build `if (!existsSync(indexHtml))` block in `if (!process.env.CLAUDE_PLUGIN_ROOT)` — in the bundled install, the pre-built UI should always exist; if it doesn't, there's no source to build from, so log an error instead of attempting a build.

The `--define "import.meta.env.PLUGIN_DIST_DIR='dist/ui'"` build flag is **removed** — it's unnecessary with the `CLAUDE_PLUGIN_ROOT` env var approach above. The env var is already set by Claude Code for all installed plugins.

### GitHub Action (.github/workflows/build-plugin.yml)

```yaml
name: Build Plugin
on:
  push:
    branches: [main]
    paths:
      - 'src/sdd/**'
  pull_request:
    paths:
      - 'src/sdd/**'

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref || github.ref_name }}
          token: ${{ secrets.GITHUB_TOKEN }}
      - uses: oven-sh/setup-bun@v2
      - run: bash src/sdd/build.sh
      - name: Commit if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add claude/sdd/
          git diff --cached --quiet || git commit -m "build(plugin): auto-build claude/sdd/ from src/sdd/ [skip ci]"
          git push origin HEAD
```

Triggers on push to main and PRs that change `src/sdd/`. The `if` guard skips fork PRs (where `GITHUB_TOKEN` can't push). `permissions: contents: write` enables push. `ref` ensures checkout is on the correct branch for push. Only commits if build output actually changed.

## Error Handling

| Failure | Behavior |
|---------|----------|
| `bun` not installed (build time) | Build script fails: "bun is required to build" |
| `bun` not installed (end user runtime) | MCP server fails to start. `/setup` should check for bun and print install instructions. |
| CI build fails | Push succeeds but `claude/sdd/` may be stale. CI failure is visible in PR checks. |
| Bundle imports fail | `bun build` exits non-zero; build script fails fast via `set -e` |
| Dashboard UI dist path | Server resolves UI path via `CLAUDE_PLUGIN_ROOT` env var or relative to bundle |

## Security

No change. Guard scripts are copied verbatim. Bundled JS is produced from auditable TypeScript source. CI uses standard GitHub Actions with repo-scoped token.

## Impact

Partially supersedes ADR-0047's symlink packaging approach for `claude/sdd/` (packaging decisions only; the `src/sdd/` canonical source structure is unchanged). `src/sdd/` canonical source structure is unchanged. Updates `claude/sdd/.mcp.json` (bundled JS instead of bun run against source). Updates `/dashboard` skill (bundled server path). Adds CI workflow.

Spec updates in this commit:
- `spec-docs-mcp.md` Runtime section: qualify "no build step" for distributed install mode
- `spec-dashboard.md` Runtime section: qualify "no build step" for distributed install; add conditional for auto-build skip when `CLAUDE_PLUGIN_ROOT` is set

Note: no living specs exist for plugin packaging, hooks/guards, or the self-dev workflow (`/local-setup`). These components are documented only in ADRs (ADR-0044, ADR-0047, this ADR). Creating `docs/spec-plugin-packaging.md` and `docs/spec-hooks.md` is deferred — see Scope.

Affects: `claude/sdd/` (all symlinks become real files), `src/sdd/build.sh` (new), `.github/workflows/build-plugin.yml` (new).

## Scope

### In v1
- `src/sdd/build.sh` build script
- Bundle docs-mcp and docs-dashboard to single JS files
- Pre-build dashboard UI
- Copy skills, agents, guards, context.md, sdd-master
- Update `claude/sdd/.mcp.json` to reference bundled JS
- Update `/dashboard` skill to reference bundled server
- Dashboard server resolves UI dist path from `CLAUDE_PLUGIN_ROOT`
- Remove all symlinks from `claude/sdd/`
- GitHub Action for auto-build on push

### Deferred
- `droid/sdd/` build (same pattern, deferred until Droid format is known)
- `/setup` bun prerequisite check
- Dashboard server bundling may need adjustments for `bun:sqlite` and static file resolution — verify during implementation
- `docs/spec-plugin-packaging.md` — living spec for build system, dist layout, CI workflow, source-of-truth invariant
- `docs/spec-hooks.md` — living spec for hook wrappers and guard scripts
