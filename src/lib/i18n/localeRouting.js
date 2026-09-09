import { normalizeUiLocale } from "./localeContract.js";

function normalizePathname(pathname) {
  if (typeof pathname !== "string") return "/";

  const pathOnly = pathname.split(/[?#]/, 1)[0].trim();
  if (!pathOnly) return "/";
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

function firstPathSegment(pathname) {
  return normalizePathname(pathname).slice(1).split("/", 1)[0];
}

function normalizeSearch(search) {
  if (typeof search !== "string" || !search) return "";
  return search.startsWith("?") ? search : `?${search}`;
}

function normalizeHash(hash) {
  if (typeof hash !== "string" || !hash) return "";
  return hash.startsWith("#") ? hash : `#${hash}`;
}

export function extractRouteLocale(pathname) {
  return normalizeUiLocale(firstPathSegment(pathname));
}

export function stripLocalePrefix(pathname) {
  let contentPath = normalizePathname(pathname);

  while (extractRouteLocale(contentPath)) {
    const segment = firstPathSegment(contentPath);
    const remainder = contentPath.slice(segment.length + 1);
    contentPath = remainder || "/";
  }

  return contentPath;
}

export function withLocalePrefix(pathname, locale) {
  const normalizedLocale = normalizeUiLocale(locale);
  if (!normalizedLocale) return null;

  const contentPath = stripLocalePrefix(pathname);
  return contentPath === "/" ? `/${normalizedLocale}` : `/${normalizedLocale}${contentPath}`;
}

/**
 * Produces a UI-language navigation target only. Content-provider region and
 * legal jurisdiction remain independent dimensions and are not resolved here.
 */
export function buildLocaleNavigationTarget(options = {}) {
  const inputs = options && typeof options === "object" ? options : {};
  const pathname = withLocalePrefix(inputs.pathname, inputs.targetLocale);
  if (!pathname) return null;

  return `${pathname}${normalizeSearch(inputs.search)}${normalizeHash(inputs.hash)}`;
}
