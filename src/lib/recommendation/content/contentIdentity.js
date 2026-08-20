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

export function dedupeRelatedItems(items = [], currentItem = null, primaryItems = []) {
  const excludedItems = [currentItem, ...primaryItems].filter(Boolean);
  const results = [];
  for (const item of items) {
    if (excludedItems.some((excluded) => isSameContent(item, excluded))) continue;
    if (results.some((selected) => isSameContent(item, selected))) continue;
    results.push(item);
  }
  return results;
}
