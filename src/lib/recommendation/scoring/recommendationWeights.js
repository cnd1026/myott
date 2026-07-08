export const recommendationWeights = Object.freeze({
  titleMatch: 0.4,
  genreMatch: 0.2,
  countryMatch: 0.15,
  moodMatch: 0.1,
  runtimeMatch: 0.05,
  ratingSignal: 0.04,
  popularitySignal: 0.04,
  diversitySignal: 0.02,
  contentTypeMatch: 0,
});

export const recommendationPenalties = Object.freeze({
  contentTypeMismatch: 1,
  countryFallbackRelaxed: 0.12,
  fallbackRelaxed: 0.08,
  runtimeUnknown: 0.03,
});

export const recommendationScoreScale = 100;

export const recommendationWeightNotes = Object.freeze({
  contentTypeMatch:
    "Content type is treated as a hard filter, not a weighted boost.",
  diversitySignal:
    "Diversity starts as a light ranking adjustment and can be tuned after Founder QA.",
});
