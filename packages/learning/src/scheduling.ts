export type ReviewRating = "failed" | "difficult" | "good" | "easy";

export interface ReviewPerformance {
  correctness: number;
  completeness: number;
  confidence: number;
  latencyMs: number;
  hintsUsed: number;
}

export interface ReviewState {
  dueAt: Date;
  intervalDays: number;
  repetitions: number;
  rating: ReviewRating;
}

export interface ReviewIntervals {
  failedMinutes: number;
  difficultDays: number;
  goodDays: number;
  easyDays: number;
  difficultMultiplier: number;
  goodMultiplier: number;
  easyMultiplier: number;
  maxDays: number;
}

export const defaultReviewIntervals: Readonly<ReviewIntervals> = {
  failedMinutes: 10,
  difficultDays: 1,
  goodDays: 3,
  easyDays: 7,
  difficultMultiplier: 1.4,
  goodMultiplier: 2,
  easyMultiplier: 2.5,
  maxDays: 3_650,
};

export function ratePerformance(performance: ReviewPerformance): ReviewRating {
  const score = performance.correctness * 0.65 + performance.completeness * 0.35;
  const hintPenalty = Math.min(25, Math.max(0, performance.hintsUsed) * 8);
  const adjusted = score - hintPenalty;
  if (adjusted < 40) return "failed";
  if (adjusted < 65) return "difficult";
  if (adjusted < 85) return "good";
  return performance.confidence >= 4 && performance.latencyMs < 120_000 ? "easy" : "good";
}

export function scheduleNextReview(
  performance: ReviewPerformance,
  previous: { intervalDays: number; repetitions: number } | null,
  now = new Date(),
  intervalsConfig: Readonly<ReviewIntervals> = defaultReviewIntervals,
): ReviewState {
  const rating = ratePerformance(performance);
  const priorInterval = previous?.intervalDays ?? 0;
  const priorRepetitions = previous?.repetitions ?? 0;
  const intervals: Record<ReviewRating, number> = {
    failed: intervalsConfig.failedMinutes / (24 * 60),
    difficult: previous && priorRepetitions > 0 ? Math.min(intervalsConfig.maxDays, Math.max(intervalsConfig.difficultDays, priorInterval * intervalsConfig.difficultMultiplier)) : intervalsConfig.difficultDays,
    good: previous && priorRepetitions > 0 ? Math.min(intervalsConfig.maxDays, Math.max(intervalsConfig.goodDays, priorInterval * intervalsConfig.goodMultiplier)) : intervalsConfig.goodDays,
    easy: previous && priorRepetitions > 0 ? Math.min(intervalsConfig.maxDays, Math.max(intervalsConfig.easyDays, priorInterval * intervalsConfig.easyMultiplier)) : intervalsConfig.easyDays,
  };
  const intervalDays = intervals[rating];
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    dueAt,
    intervalDays,
    repetitions: rating === "failed" ? 0 : priorRepetitions + 1,
    rating,
  };
}
