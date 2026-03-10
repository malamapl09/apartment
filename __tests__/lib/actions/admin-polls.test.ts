/**
 * Unit tests for the pure validation and data-transformation logic extracted
 * from lib/actions/admin-polls.ts.
 *
 * The server action functions themselves interact with Supabase and Next.js
 * cache APIs, so they are not imported directly. Instead, the pure logic that
 * sits inside those functions is extracted here and tested in isolation.
 *
 * Covered logic:
 *   - Options override for yes_no polls (always ["Yes", "No"])
 *   - Minimum-options guard for non-yes_no polls (must have >= 2 options)
 *   - Poll results calculation (vote counts and percentages per option)
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Option resolution — mirrors createPoll() in lib/actions/admin-polls.ts
// ---------------------------------------------------------------------------

type PollType = "single_choice" | "multiple_choice" | "yes_no";

/**
 * Resolves the final option labels for a poll, mirroring the logic in
 * createPoll():
 *
 *   const optionLabels =
 *     data.poll_type === "yes_no" ? ["Yes", "No"] : data.options;
 *
 *   if (data.poll_type !== "yes_no" && optionLabels.length < 2) {
 *     return { error: "At least 2 options are required" };
 *   }
 */
function resolveOptions(
  pollType: PollType,
  suppliedOptions: string[]
): { error: string } | { options: string[] } {
  const optionLabels = pollType === "yes_no" ? ["Yes", "No"] : suppliedOptions;

  if (pollType !== "yes_no" && optionLabels.length < 2) {
    return { error: "At least 2 options are required" };
  }

  return { options: optionLabels };
}

// ---------------------------------------------------------------------------
// Poll results calculation — mirrors getPollResults() in admin-polls.ts
// ---------------------------------------------------------------------------

type PollOption = { id: string; label: string; sort_order: number };
type PollVote = { user_id: string; option_id: string };

function calculateResults(
  options: PollOption[],
  votes: PollVote[]
): { id: string; label: string; vote_count: number; percentage: number }[] {
  const totalVotes = new Set(votes.map((v) => v.user_id)).size;

  return [...options]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((option) => {
      const optionVotes = votes.filter((v) => v.option_id === option.id);
      return {
        id: option.id,
        label: option.label,
        vote_count: optionVotes.length,
        percentage: totalVotes > 0 ? (optionVotes.length / totalVotes) * 100 : 0,
      };
    });
}

// ---------------------------------------------------------------------------
// resolveOptions — yes_no override
// ---------------------------------------------------------------------------

describe("resolveOptions — poll option resolution", () => {
  describe("yes_no polls", () => {
    it("always returns ['Yes', 'No'] regardless of supplied options", () => {
      const result = resolveOptions("yes_no", []);
      expect(result).toEqual({ options: ["Yes", "No"] });
    });

    it("ignores any custom options supplied for a yes_no poll", () => {
      const result = resolveOptions("yes_no", ["Maybe", "Perhaps", "Absolutely not"]);
      expect(result).toEqual({ options: ["Yes", "No"] });
    });

    it("does not return an error even when zero options are supplied for yes_no", () => {
      const result = resolveOptions("yes_no", []);
      expect(result).not.toHaveProperty("error");
    });
  });

  describe("single_choice polls", () => {
    it("returns the supplied options when there are 2 or more", () => {
      const result = resolveOptions("single_choice", ["Option A", "Option B"]);
      expect(result).toEqual({ options: ["Option A", "Option B"] });
    });

    it("returns the supplied options when there are 3 or more", () => {
      const result = resolveOptions("single_choice", ["A", "B", "C"]);
      expect(result).toEqual({ options: ["A", "B", "C"] });
    });

    it("returns an error when fewer than 2 options are supplied", () => {
      const result = resolveOptions("single_choice", ["Only one"]);
      expect(result).toEqual({ error: "At least 2 options are required" });
    });

    it("returns an error when zero options are supplied", () => {
      const result = resolveOptions("single_choice", []);
      expect(result).toEqual({ error: "At least 2 options are required" });
    });
  });

  describe("multiple_choice polls", () => {
    it("returns the supplied options when there are 2 or more", () => {
      const result = resolveOptions("multiple_choice", ["Red", "Green", "Blue"]);
      expect(result).toEqual({ options: ["Red", "Green", "Blue"] });
    });

    it("returns an error when only 1 option is supplied", () => {
      const result = resolveOptions("multiple_choice", ["Solo"]);
      expect(result).toEqual({ error: "At least 2 options are required" });
    });

    it("returns an error when zero options are supplied", () => {
      const result = resolveOptions("multiple_choice", []);
      expect(result).toEqual({ error: "At least 2 options are required" });
    });
  });
});

// ---------------------------------------------------------------------------
// calculateResults — vote count and percentage calculation
// ---------------------------------------------------------------------------

describe("calculateResults — poll results aggregation", () => {
  const optionA: PollOption = { id: "opt-a", label: "Yes", sort_order: 0 };
  const optionB: PollOption = { id: "opt-b", label: "No", sort_order: 1 };
  const optionC: PollOption = { id: "opt-c", label: "Maybe", sort_order: 2 };

  describe("with no votes", () => {
    it("returns 0 vote_count and 0 percentage for every option", () => {
      const results = calculateResults([optionA, optionB], []);

      results.forEach((r) => {
        expect(r.vote_count).toBe(0);
        expect(r.percentage).toBe(0);
      });
    });

    it("preserves sort_order ordering when there are no votes", () => {
      const results = calculateResults([optionB, optionA], []);
      expect(results[0].id).toBe("opt-a");
      expect(results[1].id).toBe("opt-b");
    });
  });

  describe("with votes", () => {
    it("counts votes per option correctly", () => {
      const votes: PollVote[] = [
        { user_id: "u1", option_id: "opt-a" },
        { user_id: "u2", option_id: "opt-a" },
        { user_id: "u3", option_id: "opt-b" },
      ];

      const results = calculateResults([optionA, optionB], votes);
      const a = results.find((r) => r.id === "opt-a")!;
      const b = results.find((r) => r.id === "opt-b")!;

      expect(a.vote_count).toBe(2);
      expect(b.vote_count).toBe(1);
    });

    it("calculates percentage based on unique voter count", () => {
      const votes: PollVote[] = [
        { user_id: "u1", option_id: "opt-a" },
        { user_id: "u2", option_id: "opt-a" },
        { user_id: "u3", option_id: "opt-b" },
      ];

      const results = calculateResults([optionA, optionB], votes);
      const a = results.find((r) => r.id === "opt-a")!;
      const b = results.find((r) => r.id === "opt-b")!;

      // 3 unique voters: A got 2 votes = 66.67%, B got 1 vote = 33.33%
      expect(a.percentage).toBeCloseTo(66.67, 1);
      expect(b.percentage).toBeCloseTo(33.33, 1);
    });

    it("gives 100% to the only option that received all votes", () => {
      const votes: PollVote[] = [
        { user_id: "u1", option_id: "opt-a" },
        { user_id: "u2", option_id: "opt-a" },
      ];

      const results = calculateResults([optionA, optionB], votes);
      const a = results.find((r) => r.id === "opt-a")!;
      const b = results.find((r) => r.id === "opt-b")!;

      expect(a.percentage).toBe(100);
      expect(b.percentage).toBe(0);
    });

    it("handles three options with unequal vote distribution", () => {
      const votes: PollVote[] = [
        { user_id: "u1", option_id: "opt-a" },
        { user_id: "u2", option_id: "opt-b" },
        { user_id: "u3", option_id: "opt-c" },
        { user_id: "u4", option_id: "opt-a" },
      ];

      const results = calculateResults([optionA, optionB, optionC], votes);
      const a = results.find((r) => r.id === "opt-a")!;
      const b = results.find((r) => r.id === "opt-b")!;
      const c = results.find((r) => r.id === "opt-c")!;

      // 4 unique voters
      expect(a.vote_count).toBe(2);
      expect(b.vote_count).toBe(1);
      expect(c.vote_count).toBe(1);
      expect(a.percentage).toBe(50);
      expect(b.percentage).toBe(25);
      expect(c.percentage).toBe(25);
    });

    it("deduplicates voters by user_id when counting unique voters for percentages", () => {
      // In a multiple_choice poll, the same user can vote for multiple options.
      // Unique voter count = distinct user_ids across all votes.
      const votes: PollVote[] = [
        { user_id: "u1", option_id: "opt-a" }, // u1 voted for A
        { user_id: "u1", option_id: "opt-b" }, // u1 also voted for B (multiple choice)
        { user_id: "u2", option_id: "opt-a" }, // u2 voted for A
      ];

      const results = calculateResults([optionA, optionB], votes);
      const a = results.find((r) => r.id === "opt-a")!;
      const b = results.find((r) => r.id === "opt-b")!;

      // 2 unique voters (u1, u2); A got 2 vote entries = 100%, B got 1 = 50%
      expect(a.vote_count).toBe(2);
      expect(b.vote_count).toBe(1);
      expect(a.percentage).toBe(100);
      expect(b.percentage).toBe(50);
    });
  });

  describe("sort order", () => {
    it("returns options sorted by sort_order ascending regardless of input order", () => {
      const results = calculateResults([optionC, optionA, optionB], []);
      expect(results.map((r) => r.id)).toEqual(["opt-a", "opt-b", "opt-c"]);
    });
  });

  describe("option with no votes among others that have votes", () => {
    it("assigns 0 votes and 0% to an option nobody voted for", () => {
      const votes: PollVote[] = [
        { user_id: "u1", option_id: "opt-a" },
        { user_id: "u2", option_id: "opt-a" },
      ];

      const results = calculateResults([optionA, optionB, optionC], votes);
      const b = results.find((r) => r.id === "opt-b")!;
      const c = results.find((r) => r.id === "opt-c")!;

      expect(b.vote_count).toBe(0);
      expect(b.percentage).toBe(0);
      expect(c.vote_count).toBe(0);
      expect(c.percentage).toBe(0);
    });
  });
});
