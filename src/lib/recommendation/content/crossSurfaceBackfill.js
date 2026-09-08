export function requestOptionsProviderPayload(provider, {
  filters = [],
  contentTypes = [],
  qaDiagnostics = false,
  excludeContentIdentities = [],
} = {}) {
  return provider.getRecommendations({
    filters,
    contentTypes,
    limit: 12,
    qaDiagnostics,
    excludeContentIdentities,
  });
}

export function requestSeedsProviderPayload(provider, {
  titles = [],
  seeds = [],
  filters = [],
  contentTypes = [],
  excludeContentIdentities = [],
} = {}) {
  return provider.getSeedRecommendations({
    titles,
    seeds,
    filters,
    contentTypes,
    limit: 12,
    excludeContentIdentities,
  });
}
