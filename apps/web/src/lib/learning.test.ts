import { describe, expect, it } from "vitest";
import { defaultReviewIntervals, scheduleNextReview, updateMastery } from "@mnemosyne/learning";

describe("review scheduling", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("uses the initial failed, difficult, good, and easy intervals", () => {
    const failed = scheduleNextReview({ correctness: 10, completeness: 20, confidence: 1, latencyMs: 90_000, hintsUsed: 0 }, null, now);
    const difficult = scheduleNextReview({ correctness: 60, completeness: 55, confidence: 3, latencyMs: 90_000, hintsUsed: 0 }, null, now);
    const good = scheduleNextReview({ correctness: 80, completeness: 80, confidence: 3, latencyMs: 90_000, hintsUsed: 0 }, null, now);
    const easy = scheduleNextReview({ correctness: 100, completeness: 100, confidence: 5, latencyMs: 1_000, hintsUsed: 0 }, null, now);
    expect(failed.dueAt.getTime() - now.getTime()).toBe(10 * 60 * 1000);
    expect(difficult.intervalDays).toBe(1);
    expect(good.intervalDays).toBe(3);
    expect(easy.intervalDays).toBe(7);
  });

  it("expands intervals on success and resets repetitions after failed recall", () => {
    const successful = scheduleNextReview({ correctness: 90, completeness: 90, confidence: 4, latencyMs: 20_000, hintsUsed: 0 }, { intervalDays: 7, repetitions: 2 }, now);
    const failed = scheduleNextReview({ correctness: 0, completeness: 0, confidence: 5, latencyMs: 1_000, hintsUsed: 0 }, { intervalDays: 7, repetitions: 2 }, now);
    expect(successful.intervalDays).toBeGreaterThan(7);
    expect(failed.repetitions).toBe(0);
  });

  it("allows the transparent default intervals to be overridden", () => {
    const custom = scheduleNextReview({ correctness: 100, completeness: 100, confidence: 5, latencyMs: 1_000, hintsUsed: 0 }, null, now, { ...defaultReviewIntervals, easyDays: 10 });
    expect(custom.intervalDays).toBe(10);
  });
});

describe("dimension-specific mastery update", () => {
  it("moves toward the new score without replacing all prior history", () => {
    expect(updateMastery(80, 100, 100)).toBe(86);
    expect(updateMastery(80, 0, 0)).toBe(56);
  });
});
