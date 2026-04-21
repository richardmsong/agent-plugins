import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "bun:test";
import SpecDetail from "../routes/SpecDetail";

// Mock api module
vi.mock("../api", () => ({
  fetchDoc: vi.fn(),
  fetchLineage: vi.fn(),
}));

import { fetchDoc, fetchLineage } from "../api";

const mockDoc = {
  doc_path: "docs/spec-state-schema.md",
  title: "State Schema",
  category: "spec",
  status: null,
  commit_count: 4,
  raw_markdown: "# State Schema\n\nThis is the state schema spec.\n\n## Session KV\n\nSection content.",
  sections: [{ heading: "Session KV", line_start: 5, line_end: 10 }],
};

const navigate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (fetchDoc as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);
  (fetchLineage as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("SpecDetail — H1 lineage icon (ADR-0031)", () => {
  it("renders the H1 title", async () => {
    const { container } = render(
      <SpecDetail docPath="docs/spec-state-schema.md" navigate={navigate} lastEvent={null} />
    );
    await waitFor(() => {
      expect(container.textContent).toContain("State Schema");
    });
    expect(container.querySelector("h1")).not.toBeNull();
  });

  it("renders a ≡ icon next to the H1 title (doc-level lineage trigger)", async () => {
    const { container } = render(
      <SpecDetail docPath="docs/spec-state-schema.md" navigate={navigate} lastEvent={null} />
    );
    await waitFor(() => {
      expect(container.querySelector("h1")).not.toBeNull();
    });

    // The title row contains the H1 and the LineagePopover trigger button
    const titleRow = container.querySelector("h1")?.parentElement;
    expect(titleRow).not.toBeNull();
    const triggerBtn = titleRow!.querySelector("button");
    expect(triggerBtn).not.toBeNull();
    expect(triggerBtn!.textContent).toContain("≡");
  });

  it("renders the spec category badge", async () => {
    const { container } = render(
      <SpecDetail docPath="docs/spec-state-schema.md" navigate={navigate} lastEvent={null} />
    );
    await waitFor(() => {
      expect(container.textContent).toContain("spec");
    });
  });
});
