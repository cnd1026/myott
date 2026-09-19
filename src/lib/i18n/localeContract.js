export const SUPPORTED_UI_LOCALES = Object.freeze(["ko-KR", "en-US"]);
export const DEFAULT_UI_LOCALE = "ko-KR";

const LOCALE_ALIASES = new Map([
  ["ko", "ko-KR"],
  ["ko-kr", "ko-KR"],
  ["en", "en-US"],
  ["en-us", "en-US"],
]);

function normalizedLocaleKey(value) {
  if (typeof value !== "string") return null;

  const key = value.trim().replace(/_/g, "-").toLowerCase();
  return key || null;
}

export function normalizeUiLocale(value) {
  const key = normalizedLocaleKey(value);
  return key ? LOCALE_ALIASES.get(key) || null : null;
}

export function isSupportedUiLocale(value) {
  return normalizeUiLocale(value) !== null;
}

function parseAcceptLanguage(acceptLanguage) {
  if (typeof acceptLanguage !== "string") return [];

  return acceptLanguage.split(",").flatMap((part, index) => {
    const [range, ...parameters] = part.trim().split(";");
    if (!range || range === "*") return [];

    let quality = 1;
    for (const parameter of parameters) {
      const [name, rawValue] = parameter.trim().split("=");
      if (name?.toLowerCase() !== "q") continue;

      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return [];
      quality = parsed;
    }

    const locale = normalizeUiLocale(range);
    return locale && quality > 0 ? [{ locale, quality, index }] : [];
  }).sort((left, right) => right.quality - left.quality || left.index - right.index);
}

function resolveFirstSupported(values) {
  for (const value of values) {
    const locale = normalizeUiLocale(value);
    if (locale) return locale;
  }
  return null;
}

/**
 * Resolves display language only. Legal jurisdiction and content-provider
 * region are independent dimensions and are intentionally not derived here.
 */
export function resolveUiLocale(options = {}) {
  const inputs = options && typeof options === "object" ? options : {};
  const directLocale = resolveFirstSupported([
    inputs.manualOverride,
    inputs.routeLocale,
    inputs.storedPreference,
  ]);

  if (directLocale) return directLocale;

  return parseAcceptLanguage(inputs.acceptLanguage)[0]?.locale || DEFAULT_UI_LOCALE;
}
