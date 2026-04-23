# Agent Plugins

Agent-neutral plugin marketplace — spec-driven development workflows for Claude, Droid, and future agents.

## Installation

### Claude Code

Add this marketplace to your Claude Code settings (`~/.claude/settings.json`):

```json
"extraKnownMarketplaces": {
  "agent-plugins": {
    "source": {
      "source": "github",
      "repo": "richardmsong/agent-plugins"
    }
  }
}
```

Then install a plugin:

```
/plugin install spec-driven-dev@agent-plugins
```

### Droid

Droid support is coming. See `droid/sdd/README.md` for the current stub.

## Plugins

### `spec-driven-dev`

Spec-driven development workflow for teams that want architecture decisions and implementation to stay in sync.

**Skills:**
- `/spec-driven-dev:feature-change` — universal entry point for any code change; authors an ADR, updates specs, runs dev-harness loop
- `/spec-driven-dev:plan-feature` — plan a new feature as an ADR with Q&A-driven spec authoring
- `/spec-driven-dev:design-audit` — audit a component's implementation against its spec
- `/spec-driven-dev:spec-evaluator` — evaluate spec completeness and consistency
- `/spec-driven-dev:file-bug` — file a structured bug report
- `/spec-driven-dev:setup` — scaffold `.agent/` config and CLAUDE.md for a new repo

**Agents:**
- `dev-harness` — implements changes guided by an ADR/spec, loops until spec-evaluator passes
- `spec-evaluator` — checks implementation against spec, reports gaps
- `design-evaluator` — audits architecture and design decisions

## Structure

```
agent-plugins/
├── .claude-plugin/
│   └── marketplace.json          # Claude marketplace root
├── .droid-plugin/
│   └── marketplace.json          # Droid marketplace root (stub)
├── src/
│   └── sdd/                      # CANONICAL SOURCE (agent-neutral)
│       ├── .agent/
│       │   ├── skills/           # Shared skills (all except setup)
│       │   └── agents/           # Agent definitions
│       ├── docs-mcp/             # MCP server TypeScript source
│       ├── docs-dashboard/       # Web dashboard source
│       ├── bin/                  # Compiled binaries
│       ├── hooks/
│       │   └── guards/           # Agent-neutral guard scripts
│       ├── context.md            # Canonical workflow rules
│       ├── package.json          # Workspace config
│       └── docs/                 # ADRs and specs
├── claude/
│   └── sdd/                      # CLAUDE PLATFORM PACKAGE
│       ├── .claude-plugin/
│       │   └── plugin.json       # Claude plugin metadata
│       ├── .mcp.json             # Claude MCP config (plugin-level)
│       ├── hooks/
│       │   ├── hooks.json        # Claude hook registration
│       │   ├── blocked-commands-hook.sh  # Claude I/O wrapper
│       │   └── source-guard-hook.sh      # Claude I/O wrapper
│       ├── skills/
│       │   ├── setup/SKILL.md    # Claude-specific setup skill
│       │   └── <name> -> src/    # Per-skill symlinks to src/sdd/
│       └── agents -> src/        # Symlink to src/sdd/.agent/agents/
├── droid/
│   └── sdd/                      # DROID PLATFORM PACKAGE (stub)
│       ├── skills/ -> src/       # Per-skill symlinks to src/sdd/
│       ├── agents -> src/        # Symlink to src/sdd/.agent/agents/
│       └── README.md             # Droid support coming — format TBD
└── README.md
```

## Design

The plugin is split into three layers:

1. **`src/sdd/`** — canonical agent-neutral source. Never installed directly. Contains everything that isn't platform-specific: skills, agents, MCP server, dashboard, binaries, guard scripts, workflow rules, and docs.

2. **`claude/sdd/`** and **`droid/sdd/`** — per-platform packages. Each has platform-specific metadata, a platform-native setup skill, hook wrappers, and symlinks back to `src/sdd/`. Platforms clone the whole repo; symlinks resolve.

3. **`.claude-plugin/`** and **`.droid-plugin/`** — marketplace descriptors at repo root, pointing each platform to its package directory.

See `src/sdd/docs/adr-0047-agent-abstract-plugin-packaging.md` for full design rationale.
