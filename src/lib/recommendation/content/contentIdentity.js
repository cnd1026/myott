export const normalizeContentTitleKey = (value = "") => String(value || "")
  .trim()
  .toLocaleLowerCase("ko-KR")
  .replace(/[^\p{L}\p{N}]+/gu, "");

export const MAX_EXCLUDE_CONTENT_IDENTITIES = 3;

const PROVIDER_CONTENT_KEY_PATTERN = /^([a-z0-9][a-z0-9._-]*):(movie|tv):([1-9]\d*)$/;

export function normalizeProviderContentKey(value) {
  if (typeof value !== "string") return "";
  const match = value.trim().toLowerCase().match(PROVIDER_CONTENT_KEY_PATTERN);
  if (!match) return "";
  return `${match[1]}:${match[2]}:${match[3]}`;
}

export function normalizeExcludeContentIdentities(value) {
  if (!Array.isArray(value) || value.length > MAX_EXCLUDE_CONTENT_IDENTITIES) return null;
  const normalized = value.map(normalizeProviderContentKey);
  if (normalized.some((identity) => !identity)) return null;
  return [...new Set(normalized)];
}

export function parseExcludeContentIdentities(value) {
  if (value === undefined || value === null || value === "") {
    return { valid: true, identities: [] };
  }

  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { valid: false, identities: [] };
    }
  }

  const identities = normalizeExcludeContentIdentities(parsed);
  return identities
    ? { valid: true, identities }
    : { valid: false, identities: [] };
}

export function providerContentKey(item = {}) {
  const provider = String(item.providerId || item.source || "provider").toLowerCase();
  const mediaType = String(item.providerMediaType || item.mediaType || item.media_type || "").toLowerCase();
  const id = item.providerContentId || item.tmdbId || item.id;
  return id ? `${provider}:${mediaType}:${id}` : "";
}

export function providerContentKeySet(items = []) {
  return new Set((Array.isArray(items) ? items : []).map(providerContentKey).filter(Boolean));
}

export function excludeProviderIdentityMatches(items = [], excludedKeys = new Set(), limit = Infinity) {
  const keys = excludedKeys instanceof Set ? excludedKeys : providerContentKeySet(excludedKeys);
  const boundedLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : Infinity;
  const results = [];

  for (const item of Array.isArray(items) ? items : []) {
    const key = providerContentKey(item);
    if (key && keys.has(key)) continue;
    results.push(item);
    if (results.length >= boundedLimit) break;
  }
  return results;
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
