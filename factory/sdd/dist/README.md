# spec-driven-dev — Droid Platform Package

## What's here

- `droids/` — Droid agent definitions with platform-specific frontmatter
- `skills/` — Droid skills with platform-specific frontmatter
- `.factory-plugin/plugin.json` — Droid marketplace metadata
- `mcp.json` — MCP server configuration
- `hooks/` — Hook wrappers and guard scripts
- `docs-mcp.js` — Bundled MCP server
- `docs-dashboard.js` — Bundled dashboard server
- `docs-dashboard/` — Dashboard UI source (Vite runs at dev time)
- `dist/` — Complete installable artifact (fully derived from stubs + src)

## Build

```bash
cd src/sdd && go run build.go
```
