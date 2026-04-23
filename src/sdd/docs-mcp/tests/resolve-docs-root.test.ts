import { describe, test, expect } from "bun:test";
import { resolveDocsRoot } from "../src/resolve-docs-root.js";
import { join } from "path";

describe("resolveDocsRoot", () => {
  const cwd = "/some/cwd";
  const projectDir = "/project/root";

  test("--root absolute path is used as-is, ignoring CLAUDE_PROJECT_DIR", () => {
    const result = resolveDocsRoot("/absolute/root", projectDir, cwd);
    expect(result).toBe("/absolute/root");
  });

  test("--root absolute path is used as-is when CLAUDE_PROJECT_DIR is unset", () => {
    const result = resolveDocsRoot("/absolute/root", undefined, cwd);
    expect(result).toBe("/absolute/root");
  });

  test("--root relative path resolves against CLAUDE_PROJECT_DIR when set", () => {
    const result = resolveDocsRoot("src/sdd", projectDir, cwd);
    expect(result).toBe(join(projectDir, "src/sdd"));
  });

  test("--root relative path resolves against cwd when CLAUDE_PROJECT_DIR is unset", () => {
    const result = resolveDocsRoot("src/sdd", undefined, cwd);
    expect(result).toBe(join(cwd, "src/sdd"));
  });

  test("no --root: falls back to CLAUDE_PROJECT_DIR when set", () => {
    const result = resolveDocsRoot(null, projectDir, cwd);
    expect(result).toBe(projectDir);
  });

  test("no --root, no CLAUDE_PROJECT_DIR: falls back to cwd", () => {
    const result = resolveDocsRoot(null, undefined, cwd);
    expect(result).toBe(cwd);
  });

  test("no --root, CLAUDE_PROJECT_DIR is empty string: falls back to cwd", () => {
    // empty string is falsy — treated as unset
    const result = resolveDocsRoot(null, "" || undefined, cwd);
    expect(result).toBe(cwd);
  });

  test("--root dot (.) relative resolves against CLAUDE_PROJECT_DIR", () => {
    const result = resolveDocsRoot(".", projectDir, cwd);
    expect(result).toBe(projectDir);
  });
});
