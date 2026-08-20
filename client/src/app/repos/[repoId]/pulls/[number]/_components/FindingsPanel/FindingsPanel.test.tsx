import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord, Severity } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useFindingAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { FindingsPanel } from "./FindingsPanel";

afterEach(cleanup);

function finding(overrides: Partial<FindingRecord> & { id: string; severity: Severity }): FindingRecord {
  return {
    category: "security",
    title: `Finding ${overrides.id}`,
    file: "src/config.ts",
    start_line: 11,
    end_line: 11,
    rationale: "A secret is committed.",
    suggestion: null,
    confidence: 0.95,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
    ...overrides,
  };
}

const FINDINGS: FindingRecord[] = [
  finding({ id: "f1", severity: "CRITICAL", title: "Hardcoded secret" }),
];

const MIXED_FINDINGS: FindingRecord[] = [
  finding({ id: "c1", severity: "CRITICAL", title: "Critical one" }),
  finding({ id: "c2", severity: "CRITICAL", title: "Critical two" }),
  finding({ id: "w1", severity: "WARNING", title: "Warning one" }),
  finding({ id: "s1", severity: "SUGGESTION", title: "Suggestion one", confidence: 0.4 }),
  finding({ id: "s2", severity: "SUGGESTION", title: "Suggestion two, dismissed", dismissed_at: "2026-01-01T00:00:00Z" }),
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FindingsPanel (smoke)", () => {
  it("renders the toolbar + a finding card", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    expect(screen.getByText("Hide low confidence")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded secret")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    renderWithIntl(<FindingsPanel findings={[]} prId="pr1" />);
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });
});

describe("FindingsPanel — severity counters", () => {
  it("renders one chip per severity present, with correct counts", () => {
    renderWithIntl(<FindingsPanel findings={MIXED_FINDINGS} prId="pr1" />);
    expect(screen.getByRole("button", { name: /critical.*2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /warning.*1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suggestion.*2/i })).toBeInTheDocument();
    // all 5 findings shown before any filter is applied
    expect(screen.getByText("Critical one")).toBeInTheDocument();
    expect(screen.getByText("Warning one")).toBeInTheDocument();
    expect(screen.getByText("Suggestion two, dismissed")).toBeInTheDocument();
  });

  it("clicking a severity chip shows only that severity's findings", () => {
    renderWithIntl(<FindingsPanel findings={MIXED_FINDINGS} prId="pr1" />);
    fireEvent.click(screen.getByRole("button", { name: /critical.*2/i }));

    expect(screen.getByText("Critical one")).toBeInTheDocument();
    expect(screen.getByText("Critical two")).toBeInTheDocument();
    expect(screen.queryByText("Warning one")).not.toBeInTheDocument();
    expect(screen.queryByText("Suggestion one")).not.toBeInTheDocument();
  });

  it("clicking the active chip again clears the filter back to all", () => {
    renderWithIntl(<FindingsPanel findings={MIXED_FINDINGS} prId="pr1" />);
    const critChip = screen.getByRole("button", { name: /critical.*2/i });
    fireEvent.click(critChip);
    expect(screen.queryByText("Warning one")).not.toBeInTheDocument();

    fireEvent.click(critChip);
    expect(screen.getByText("Warning one")).toBeInTheDocument();
    expect(screen.getByText("Suggestion one")).toBeInTheDocument();
  });

  it("composes with hide-low-confidence (AND, not replace)", () => {
    renderWithIntl(<FindingsPanel findings={MIXED_FINDINGS} prId="pr1" />);
    fireEvent.click(screen.getByRole("switch")); // hide low confidence (Suggestion one is 0.4)
    fireEvent.click(screen.getByRole("button", { name: /suggestion.*2/i }));

    // Suggestion one (0.4 confidence) is hidden by hideLow even though it
    // matches the severity filter; Suggestion two survives (higher confidence).
    expect(screen.queryByText("Suggestion one")).not.toBeInTheDocument();
    expect(screen.getByText("Suggestion two, dismissed")).toBeInTheDocument();
    expect(screen.queryByText("Critical one")).not.toBeInTheDocument();
  });

  it("counts accepted/dismissed findings toward the total (chip count unaffected)", () => {
    renderWithIntl(<FindingsPanel findings={MIXED_FINDINGS} prId="pr1" />);
    // 2 SUGGESTION findings exist, one of them dismissed — chip still reads 2.
    expect(screen.getByRole("button", { name: /suggestion.*2/i })).toBeInTheDocument();
  });
});
