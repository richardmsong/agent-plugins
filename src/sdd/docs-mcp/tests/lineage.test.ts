import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { getLineage } from "../src/tools.js";

function makeTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE documents (
      id INTEGER PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      category TEXT,
      title TEXT,
      status TEXT,
      commit_count INTEGER NOT NULL DEFAULT 0,
      last_status_change TEXT,
      mtime REAL NOT NULL
    );

    CREATE TABLE sections (
      id INTEGER PRIMARY KEY,
      doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      heading TEXT NOT NULL,
      content TEXT NOT NULL,
      line_start INTEGER NOT NULL,
      line_end INTEGER NOT NULL
    );

    CREATE VIRTUAL TABLE sections_fts USING fts5(
      heading,
      content,
      content='sections',
      content_rowid='id'
    );

    CREATE TRIGGER sections_ai AFTER INSERT ON sections BEGIN
      INSERT INTO sections_fts(rowid, heading, content)
      VALUES (new.id, new.heading, new.content);
    END;

    CREATE TRIGGER sections_ad AFTER DELETE ON sections BEGIN
      INSERT INTO sections_fts(sections_fts, rowid, heading, content)
      VALUES ('delete', old.id, old.heading, old.content);
    END;

    CREATE TABLE lineage (
      section_a_doc TEXT NOT NULL,
      section_a_heading TEXT NOT NULL,
      section_b_doc TEXT NOT NULL,
      section_b_heading TEXT NOT NULL,
      commit_count INTEGER NOT NULL DEFAULT 1,
      last_commit TEXT NOT NULL,
      PRIMARY KEY (section_a_doc, section_a_heading, section_b_doc, section_b_heading)
    );

    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}

function insertDoc(db: Database, path: string, title: string, category: string | null): number {
  db.run("INSERT INTO documents(path, title, category, mtime) VALUES (?, ?, ?, 0)", [
    path,
    title,
    category,
  ]);
  return db.query<{ id: number }, [string]>("SELECT id FROM documents WHERE path = ?").get(path)!.id;
}

function insertLineage(
  db: Database,
  docA: string,
  headA: string,
  docB: string,
  headB: string,
  commitCount: number,
  lastCommit: string
) {
  db.run(
    `INSERT INTO lineage(section_a_doc, section_a_heading, section_b_doc, section_b_heading, commit_count, last_commit)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [docA, headA, docB, headB, commitCount, lastCommit]
  );
}

describe("getLineage", () => {
  let db: Database;

  beforeEach(() => {
    db = makeTestDb();

    // Setup two docs with sections
    insertDoc(db, "docs/adr-2026-04-17-nats-security.md", "NATS Integration", "adr");
    insertDoc(db, "docs/adr-2026-04-10-k8s-integration.md", "K8s Integration", "adr");
    insertDoc(db, "docs/spec-state-schema.md", "State Schema", "spec");

    // Lineage edges: adr-nats Security ↔ adr-k8s Session Lifecycle
    insertLineage(
      db,
      "docs/adr-2026-04-17-nats-security.md", "Security",
      "docs/adr-2026-04-10-k8s-integration.md", "Session Lifecycle",
      3, "abc123"
    );
    insertLineage(
      db,
      "docs/adr-2026-04-17-nats-security.md", "Security",
      "docs/spec-state-schema.md", "KV Buckets",
      5, "def456"
    );
  });

  test("returns lineage edges for a section", () => {
    const results = getLineage(db, {
      doc_path: "docs/adr-2026-04-17-nats-security.md",
      heading: "Security",
    });
    expect(results.length).toBe(2);
  });

  test("includes doc metadata for related sections", () => {
    const results = getLineage(db, {
      doc_path: "docs/adr-2026-04-17-nats-security.md",
      heading: "Security",
    });
    const k8sEdge = results.find((r) => r.doc_path === "docs/adr-2026-04-10-k8s-integration.md");
    expect(k8sEdge).toBeDefined();
    expect(k8sEdge!.doc_title).toBe("K8s Integration");
    expect(k8sEdge!.category).toBe("adr");
    expect(k8sEdge!.heading).toBe("Session Lifecycle");
  });

  test("sorted by commit_count descending", () => {
    const results = getLineage(db, {
      doc_path: "docs/adr-2026-04-17-nats-security.md",
      heading: "Security",
    });
    expect(results[0].commit_count).toBeGreaterThanOrEqual(results[1].commit_count);
    // spec-state-schema edge has count=5, k8s edge has count=3
    expect(results[0].doc_path).toBe("docs/spec-state-schema.md");
    expect(results[0].commit_count).toBe(5);
    expect(results[1].commit_count).toBe(3);
  });

  test("last_commit is returned", () => {
    const results = getLineage(db, {
      doc_path: "docs/adr-2026-04-17-nats-security.md",
      heading: "Security",
    });
    const specEdge = results.find((r) => r.doc_path === "docs/spec-state-schema.md");
    expect(specEdge!.last_commit).toBe("def456");
  });

  test("omits edges where doc no longer exists in index", () => {
    // Remove the spec-state-schema doc
    db.run("DELETE FROM documents WHERE path = 'docs/spec-state-schema.md'");

    const results = getLineage(db, {
      doc_path: "docs/adr-2026-04-17-nats-security.md",
      heading: "Security",
    });
    // Only k8s edge remains
    expect(results.length).toBe(1);
    expect(results[0].doc_path).toBe("docs/adr-2026-04-10-k8s-integration.md");
  });

  test("returns empty array for section with no lineage", () => {
    const results = getLineage(db, {
      doc_path: "docs/adr-2026-04-17-nats-security.md",
      heading: "Overview",
    });
    expect(results).toHaveLength(0);
  });

  test("returns empty array for unknown doc", () => {
    const results = getLineage(db, {
      doc_path: "docs/nonexistent.md",
      heading: "Whatever",
    });
    expect(results).toHaveLength(0);
  });
});

// ============================================================
// getLineage — doc mode (ADR-0031: heading absent or empty)
// ============================================================

describe("getLineage — doc mode", () => {
  let db: Database;

  beforeEach(() => {
    db = makeTestDb();

    // Three docs
    insertDoc(db, "docs/adr-0027-docs-dashboard.md", "Docs Dashboard", "adr");
    insertDoc(db, "docs/adr-0015-docs-mcp.md", "Docs MCP", "adr");
    insertDoc(db, "docs/spec-docs-mcp.md", "Spec Docs MCP", "spec");

    // adr-0027 Overview co-committed with adr-0015 Overview (count=2)
    insertLineage(
      db,
      "docs/adr-0027-docs-dashboard.md", "Overview",
      "docs/adr-0015-docs-mcp.md", "Overview",
      2, "aaa111"
    );
    // adr-0027 Decisions co-committed with adr-0015 Data Model (count=1)
    insertLineage(
      db,
      "docs/adr-0027-docs-dashboard.md", "Decisions",
      "docs/adr-0015-docs-mcp.md", "Data Model",
      1, "bbb222"
    );
    // adr-0027 Overview co-committed with spec-docs-mcp Role (count=3)
    insertLineage(
      db,
      "docs/adr-0027-docs-dashboard.md", "Overview",
      "docs/spec-docs-mcp.md", "Role",
      3, "ccc333"
    );
    // adr-0027 Decisions co-committed with spec-docs-mcp Runtime (count=4)
    insertLineage(
      db,
      "docs/adr-0027-docs-dashboard.md", "Decisions",
      "docs/spec-docs-mcp.md", "Runtime",
      4, "ddd444"
    );
  });

  test("(a) doc mode: one row per co-committed doc, commit_count summed", () => {
    // adr-0027 queried without heading → doc mode
    // adr-0015 appears in two section-pairs: count 2+1=3
    // spec-docs-mcp appears in two section-pairs: count 3+4=7
    const results = getLineage(db, { doc_path: "docs/adr-0027-docs-dashboard.md" });

    expect(results.length).toBe(2);

    const adr15 = results.find((r) => r.doc_path === "docs/adr-0015-docs-mcp.md");
    const specMcp = results.find((r) => r.doc_path === "docs/spec-docs-mcp.md");

    expect(adr15).toBeDefined();
    expect(adr15!.commit_count).toBe(3);

    expect(specMcp).toBeDefined();
    expect(specMcp!.commit_count).toBe(7);
  });

  test("(a) doc mode: ordered by commit_count desc", () => {
    const results = getLineage(db, { doc_path: "docs/adr-0027-docs-dashboard.md" });
    // spec-docs-mcp (7) should come before adr-0015 (3)
    expect(results[0].doc_path).toBe("docs/spec-docs-mcp.md");
    expect(results[0].commit_count).toBe(7);
    expect(results[1].doc_path).toBe("docs/adr-0015-docs-mcp.md");
    expect(results[1].commit_count).toBe(3);
  });

  test("(a) doc mode: heading field is empty string on every returned row", () => {
    const results = getLineage(db, { doc_path: "docs/adr-0027-docs-dashboard.md" });
    for (const row of results) {
      expect(row.heading).toBe("");
    }
  });

  test("(a) doc mode: result rows include doc metadata (doc_title, category, status)", () => {
    const results = getLineage(db, { doc_path: "docs/adr-0027-docs-dashboard.md" });
    const adr15 = results.find((r) => r.doc_path === "docs/adr-0015-docs-mcp.md");
    expect(adr15!.doc_title).toBe("Docs MCP");
    expect(adr15!.category).toBe("adr");
  });

  test("(a) doc mode: does not include self-reference row", () => {
    // All edges use distinct docs, so self-reference shouldn't appear.
    // Add a self-reference edge just to be sure the WHERE clause filters it.
    db.run(
      `INSERT INTO lineage(section_a_doc, section_a_heading, section_b_doc, section_b_heading, commit_count, last_commit)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "docs/adr-0027-docs-dashboard.md", "Overview",
        "docs/adr-0027-docs-dashboard.md", "Decisions",
        99, "selfref"
      ]
    );
    const results = getLineage(db, { doc_path: "docs/adr-0027-docs-dashboard.md" });
    // Self-reference (same doc) should not appear
    const selfRef = results.find((r) => r.doc_path === "docs/adr-0027-docs-dashboard.md");
    expect(selfRef).toBeUndefined();
  });

  test("(b) section mode still works when heading is provided", () => {
    // Section mode: heading = "Overview" → only the two edges from that section
    const results = getLineage(db, {
      doc_path: "docs/adr-0027-docs-dashboard.md",
      heading: "Overview",
    });

    // adr-0015 Overview (count=2) + spec-docs-mcp Role (count=3)
    expect(results.length).toBe(2);

    const adr15 = results.find((r) => r.doc_path === "docs/adr-0015-docs-mcp.md");
    expect(adr15).toBeDefined();
    expect(adr15!.heading).toBe("Overview");     // real heading, not ""
    expect(adr15!.commit_count).toBe(2);

    const specMcp = results.find((r) => r.doc_path === "docs/spec-docs-mcp.md");
    expect(specMcp).toBeDefined();
    expect(specMcp!.heading).toBe("Role");       // real heading, not ""
    expect(specMcp!.commit_count).toBe(3);
  });

  test("(b) section mode: sorted by commit_count desc", () => {
    const results = getLineage(db, {
      doc_path: "docs/adr-0027-docs-dashboard.md",
      heading: "Decisions",
    });
    // spec-docs-mcp Runtime (count=4) before adr-0015 Data Model (count=1)
    expect(results[0].doc_path).toBe("docs/spec-docs-mcp.md");
    expect(results[0].commit_count).toBe(4);
    expect(results[1].doc_path).toBe("docs/adr-0015-docs-mcp.md");
    expect(results[1].commit_count).toBe(1);
  });

  test("(c) empty-string heading is treated as doc mode (same as absent heading)", () => {
    const noHeading = getLineage(db, { doc_path: "docs/adr-0027-docs-dashboard.md" });
    const emptyHeading = getLineage(db, { doc_path: "docs/adr-0027-docs-dashboard.md", heading: "" });

    expect(emptyHeading.length).toBe(noHeading.length);

    // Same rows, same order, same commit counts
    for (let i = 0; i < noHeading.length; i++) {
      expect(emptyHeading[i].doc_path).toBe(noHeading[i].doc_path);
      expect(emptyHeading[i].commit_count).toBe(noHeading[i].commit_count);
      expect(emptyHeading[i].heading).toBe("");
    }
  });

  test("(c) empty-string heading rows all have heading=''", () => {
    const results = getLineage(db, { doc_path: "docs/adr-0027-docs-dashboard.md", heading: "" });
    for (const row of results) {
      expect(row.heading).toBe("");
    }
  });

  test("doc mode returns empty array for doc with no lineage", () => {
    // adr-0015 is only ever the target (section_b), never the source (section_a)
    const results = getLineage(db, { doc_path: "docs/adr-0015-docs-mcp.md" });
    expect(results).toHaveLength(0);
  });

  test("doc mode returns empty array for unknown doc", () => {
    const results = getLineage(db, { doc_path: "docs/nonexistent.md" });
    expect(results).toHaveLength(0);
  });
});
