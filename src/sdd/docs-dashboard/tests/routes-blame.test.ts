import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { seedTestDb } from "./testutil";
import { handleBlame, handleDiff } from "../src/routes";

const ADR_CONTENT = `# ADR: Blame Test

**Status**: accepted

## Overview

Testing blame endpoint.
`;

let db: Database;
let repoRoot: string;
let cleanup: () => void;

beforeEach(() => {
  const result = seedTestDb({
    "adr-0001-blame-test.md": ADR_CONTENT,
  });
  db = result.db;
  repoRoot = result.repoRoot;
  cleanup = result.cleanup;
});

afterEach(() => {
  cleanup();
});

// ---- /api/blame ----

describe("handleBlame", () => {
  it("returns 400 when doc param is missing", () => {
    const url = new URL("http://localhost/api/blame");
    const res = handleBlame(db, repoRoot, url);
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown doc", async () => {
    const url = new URL(
      "http://localhost/api/blame?doc=" +
        encodeURIComponent("docs/nonexistent.md")
    );
    const res = handleBlame(db, repoRoot, url);
    expect(res.status).toBe(404);
    const data = await res.json() as { error: string };
    expect(data.error).toBe("not found");
  });

  it("returns 200 with empty blocks for a known doc with no blame data", async () => {
    // The test repo has a fake .git dir but no real git history, so blame_lines
    // will be empty. The endpoint should return 200 with { blocks: [], uncommitted_lines: [] }
    // (or just no blocks if blame_lines is empty).
    const url = new URL(
      "http://localhost/api/blame?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md")
    );
    const res = handleBlame(db, repoRoot, url);
    expect(res.status).toBe(200);
    const data = await res.json() as { blocks: unknown[]; uncommitted_lines: unknown[] };
    expect(Array.isArray(data.blocks)).toBe(true);
    expect(Array.isArray(data.uncommitted_lines)).toBe(true);
  });

  it("returns block data when blame_lines are populated", async () => {
    // Manually insert blame data into the DB
    const docRow = db
      .query<{ id: number }, [string]>("SELECT id FROM documents WHERE path = ?")
      .get("docs/adr-0001-blame-test.md");
    expect(docRow).not.toBeNull();
    const docId = docRow!.id;

    db.run(
      `INSERT INTO blame_lines (doc_id, line_start, line_end, "commit", author, date, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [docId, 1, 5, "abc1234def5678901234567890123456789012ab", "Alice", "2026-04-01", "feat: initial commit"]
    );

    const url = new URL(
      "http://localhost/api/blame?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md")
    );
    const res = handleBlame(db, repoRoot, url);
    expect(res.status).toBe(200);
    const data = await res.json() as {
      blocks: { line_start: number; line_end: number; commit: string; author: string; date: string; summary: string; adrs: unknown[] }[];
      uncommitted_lines: number[];
    };
    expect(data.blocks.length).toBe(1);
    expect(data.blocks[0].line_start).toBe(1);
    expect(data.blocks[0].line_end).toBe(5);
    expect(data.blocks[0].commit).toBe("abc1234def5678901234567890123456789012ab");
    expect(data.blocks[0].author).toBe("Alice");
    expect(data.blocks[0].date).toBe("2026-04-01");
    expect(data.blocks[0].summary).toBe("feat: initial commit");
    expect(Array.isArray(data.blocks[0].adrs)).toBe(true);
  });

  it("returns 200 with empty response when since param provided (on-demand, no real git)", async () => {
    // The test repo is not a real git repo, so git blame will fail.
    // handleBlameOnDemand should return empty blocks on git failure.
    const url = new URL(
      "http://localhost/api/blame?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&since=2026-01-01"
    );
    const res = handleBlame(db, repoRoot, url);
    expect(res.status).toBe(200);
    const data = await res.json() as { blocks: unknown[]; uncommitted_lines: unknown[] };
    // git blame will fail in test env (fake repo), so empty is expected
    expect(Array.isArray(data.blocks)).toBe(true);
    expect(Array.isArray(data.uncommitted_lines)).toBe(true);
  });

  it("returns 200 with empty response when ref param provided (on-demand, no real git)", async () => {
    const url = new URL(
      "http://localhost/api/blame?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&ref=main"
    );
    const res = handleBlame(db, repoRoot, url);
    expect(res.status).toBe(200);
    const data = await res.json() as { blocks: unknown[]; uncommitted_lines: unknown[] };
    expect(Array.isArray(data.blocks)).toBe(true);
    expect(Array.isArray(data.uncommitted_lines)).toBe(true);
  });

  it("self-join returns co-modified ADRs in blame block", async () => {
    // Insert blame data for two docs sharing the same commit
    const doc1Row = db
      .query<{ id: number }, [string]>("SELECT id FROM documents WHERE path = ?")
      .get("docs/adr-0001-blame-test.md");
    expect(doc1Row).not.toBeNull();

    // Insert a second doc to act as a co-modified ADR
    db.run(
      `INSERT INTO documents (path, category, title, status, commit_count, mtime)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["docs/adr-0002-another.md", "adr", "Another ADR", "implemented", 1, Date.now()]
    );
    const doc2Row = db
      .query<{ id: number }, [string]>("SELECT id FROM documents WHERE path = ?")
      .get("docs/adr-0002-another.md");
    expect(doc2Row).not.toBeNull();

    const sharedCommit = "aaabbbccc1234567890123456789012345678901";

    db.run(
      `INSERT INTO blame_lines (doc_id, line_start, line_end, "commit", author, date, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [doc1Row!.id, 1, 3, sharedCommit, "Alice", "2026-04-01", "feat: shared commit"]
    );
    db.run(
      `INSERT INTO blame_lines (doc_id, line_start, line_end, "commit", author, date, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [doc2Row!.id, 5, 8, sharedCommit, "Alice", "2026-04-01", "feat: shared commit"]
    );

    const url = new URL(
      "http://localhost/api/blame?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md")
    );
    const res = handleBlame(db, repoRoot, url);
    expect(res.status).toBe(200);
    const data = await res.json() as {
      blocks: { adrs: { doc_path: string }[] }[];
    };
    expect(data.blocks.length).toBe(1);
    // The co-modified doc should appear in adrs
    expect(data.blocks[0].adrs.length).toBe(1);
    expect(data.blocks[0].adrs[0].doc_path).toBe("docs/adr-0002-another.md");
  });
});

// ---- /api/diff ----

describe("handleDiff", () => {
  it("returns 400 when doc param is missing", () => {
    const url = new URL("http://localhost/api/diff?commit=abc1234&line_start=1&line_end=5");
    const res = handleDiff(repoRoot, url);
    expect(res.status).toBe(400);
  });

  it("returns 400 when commit param is missing", () => {
    const url = new URL(
      "http://localhost/api/diff?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&line_start=1&line_end=5"
    );
    const res = handleDiff(repoRoot, url);
    expect(res.status).toBe(400);
  });

  it("returns 400 when line_start is missing", () => {
    const url = new URL(
      "http://localhost/api/diff?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&commit=abc1234&line_end=5"
    );
    const res = handleDiff(repoRoot, url);
    expect(res.status).toBe(400);
  });

  it("returns 400 when line_end is missing", () => {
    const url = new URL(
      "http://localhost/api/diff?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&commit=abc1234&line_start=1"
    );
    const res = handleDiff(repoRoot, url);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid commit hash (not hex)", () => {
    const url = new URL(
      "http://localhost/api/diff?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&commit=INVALID!@#&line_start=1&line_end=5"
    );
    const res = handleDiff(repoRoot, url);
    expect(res.status).toBe(400);
  });

  it("returns 400 when line_start > line_end", () => {
    const url = new URL(
      "http://localhost/api/diff?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&commit=abc1234&line_start=10&line_end=5"
    );
    const res = handleDiff(repoRoot, url);
    expect(res.status).toBe(400);
  });

  it("returns 200 with empty diff when git is not available or commit not found", async () => {
    // The test repo is not a real git repo with history, so git show will fail.
    const url = new URL(
      "http://localhost/api/diff?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&commit=abc1234abcdef12345678901234567890123456&line_start=1&line_end=5"
    );
    const res = handleDiff(repoRoot, url);
    expect(res.status).toBe(200);
    const data = await res.json() as { diff: string };
    expect(typeof data.diff).toBe("string");
  });

  it("returns structured DiffResponse shape { diff: string }", async () => {
    const url = new URL(
      "http://localhost/api/diff?doc=" +
        encodeURIComponent("docs/adr-0001-blame-test.md") +
        "&commit=abc1234abcdef12345678901234567890123456&line_start=1&line_end=5"
    );
    const res = handleDiff(repoRoot, url);
    expect(res.status).toBe(200);
    const data = await res.json() as { diff?: string };
    expect("diff" in data).toBe(true);
    expect(typeof data.diff).toBe("string");
  });
});
