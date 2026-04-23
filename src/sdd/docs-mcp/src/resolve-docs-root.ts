import { isAbsolute, resolve } from "path";

/**
 * Resolve the docs root directory from the priority chain:
 * (1) --root <dir> CLI arg, (2) CLAUDE_PROJECT_DIR env var, (3) process.cwd().
 * If --root is a relative path, resolve it against CLAUDE_PROJECT_DIR (if set) or cwd.
 */
export function resolveDocsRoot(
  rawRoot: string | null,
  projectDir: string | undefined,
  cwd: string
): string {
  if (rawRoot !== null) {
    if (isAbsolute(rawRoot)) return rawRoot;
    return resolve(projectDir ?? cwd, rawRoot);
  }
  return projectDir ?? cwd;
}
