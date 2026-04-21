import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "bun:test";
import AdrDetail from "../routes/AdrDetail";

// Mock api module
vi.mock("../api", () => ({
  fetchDoc: vi.fn(),
  fetchLineage: vi.fn(),
}));

import { fetchDoc, fetchLineage } from "../api";

const mockDoc = {
  doc_path: "docs/adr-0027-docs-dashboard.md",
  title: "Docs Dashboard",
  category: "adr",
  status: "accepted",
  commit_count: 5,
  raw_markdown: "# Docs Dashboard\n\nThis is the dashboard ADR.\n\n## Overview\n\nSection content.",
  sections: [{ heading: "Overview", line_start: 5, line_end: 10 }],
};

const navigate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (fetchDoc as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);
  (fetchLineage as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("AdrDetail — H1 lineage icon (ADR-0031)", () => {
  it("renders the H1 title", async () => {
    const { container } = render(
      <AdrDetail slug="0027-docs-dashboard" navigate={navigate} lastEvent={null} />
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Docs Dashboard");
    });
    expect(container.querySelector("h1")).not.toBeNull();
  });

  it("renders a ≡ icon next to the H1 title (doc-level lineage trigger)", async () => {
    const { container } = render(
      <AdrDetail slug="0027-docs-dashboard" navigate={navigate} lastEvent={null} />
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

  it("renders a StatusBadge next to the H1", async () => {
    const { container } = render(
      <AdrDetail slug="0027-docs-dashboard" navigate={navigate} lastEvent={null} />
    );
    await waitFor(() => {
      expect(container.textContent).toContain("accepted");
    });
  });
});
