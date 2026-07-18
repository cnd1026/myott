export const normalizeContentTitleKey = (value = "") => String(value || "")
  .trim()
  .toLocaleLowerCase("ko-KR")
  .replace(/[^\p{L}\p{N}]+/gu, "");

export function providerContentKey(item = {}) {
  const provider = String(item.providerId || item.source || "provider").toLowerCase();
  const mediaType = String(item.providerMediaType || item.mediaType || item.media_type || "").toLowerCase();
  const id = item.providerContentId || item.tmdbId || item.id;
  return id ? `${provider}:${mediaType}:${id}` : "";
}

export function canonicalContentIdentity(item = {}) {
  return {
    providerKey: providerContentKey(item),
    tmdbId: item.tmdbId || item.providerContentId || null,
    providerMediaType: String(item.providerMediaType || item.mediaType || item.media_type || "").toLowerCase(),
    displayTitleKey: normalizeContentTitleKey(item.title || item.name),
    originalTitleKey: normalizeContentTitleKey(item.originalTitle || item.original_title || item.originalName || item.original_name),
  };
}

export function isSameContent(left = {}, right = {}) {
  const a = canonicalContentIdentity(left);
  const b = canonicalContentIdentity(right);
  if (a.providerKey && b.providerKey && a.providerKey === b.providerKey) return true;
  if (a.tmdbId && b.tmdbId && String(a.tmdbId) === String(b.tmdbId) && a.providerMediaType === b.providerMediaType) return true;
  if (a.displayTitleKey && b.displayTitleKey && a.displayTitleKey === b.displayTitleKey) return true;
  return Boolean(a.originalTitleKey && b.originalTitleKey && a.originalTitleKey === b.originalTitleKey);
}

export function dedupeRelatedItems(items = [], currentItem = null) {
  const seenProvider = new Set();
  const seenDisplay = new Set();
  const seenOriginal = new Set();
  const results = [];
  for (const item of items) {
    if (currentItem && isSameContent(item, currentItem)) continue;
    const identity = canonicalContentIdentity(item);
    if (identity.providerKey && seenProvider.has(identity.providerKey)) continue;
    if (identity.displayTitleKey && seenDisplay.has(identity.displayTitleKey)) continue;
    if (identity.originalTitleKey && seenOriginal.has(identity.originalTitleKey)) continue;
    if (identity.providerKey) seenProvider.add(identity.providerKey);
    if (identity.displayTitleKey) seenDisplay.add(identity.displayTitleKey);
    if (identity.originalTitleKey) seenOriginal.add(identity.originalTitleKey);
    results.push(item);
  }
  return results;
}
