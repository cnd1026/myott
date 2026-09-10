import { DEFAULT_UI_LOCALE, normalizeUiLocale } from "./localeContract.js";
import enUSMessages, { privacyCenterMessages as enUSPrivacyCenterMessages } from "./messages/en-US.js";
import koKRMessages, { privacyCenterMessages as koKRPrivacyCenterMessages } from "./messages/ko-KR.js";

export const MESSAGE_CATALOGS = Object.freeze({
  "ko-KR": koKRMessages,
  "en-US": enUSMessages,
});

export const PRIVACY_CENTER_MESSAGE_CATALOGS = Object.freeze({
  "ko-KR": koKRPrivacyCenterMessages,
  "en-US": enUSPrivacyCenterMessages,
});

const PLACEHOLDER_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

export function getMessagePlaceholders(message) {
  if (typeof message !== "string") return [];
  return [...new Set([...message.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]))].sort();
}

export function validateMessageCatalogs(catalogs = MESSAGE_CATALOGS, expectedKeys) {
  const errors = [];
  const canonicalKeys = expectedKeys ? [...expectedKeys].sort() : Object.keys(catalogs[DEFAULT_UI_LOCALE] || {}).sort();

  for (const [locale, catalog] of Object.entries(catalogs)) {
    const actualKeys = Object.keys(catalog || {}).sort();
    for (const key of canonicalKeys.filter((candidate) => !actualKeys.includes(candidate))) {
      errors.push(`${locale}: missing key ${key}`);
    }
    for (const key of actualKeys.filter((candidate) => !canonicalKeys.includes(candidate))) {
      errors.push(`${locale}: extra key ${key}`);
    }
    for (const key of actualKeys) {
      if (typeof catalog[key] !== "string" || !catalog[key].trim()) {
        errors.push(`${locale}: empty value ${key}`);
      }
    }
  }

  const defaultCatalog = catalogs[DEFAULT_UI_LOCALE] || {};
  for (const [locale, catalog] of Object.entries(catalogs)) {
    if (locale === DEFAULT_UI_LOCALE) continue;
    for (const key of canonicalKeys) {
      const expected = getMessagePlaceholders(defaultCatalog[key]);
      const actual = getMessagePlaceholders(catalog?.[key]);
      if (expected.join("\0") !== actual.join("\0")) {
        errors.push(`${locale}: placeholder mismatch ${key}`);
      }
    }
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function getMessageCatalog(locale) {
  const normalizedLocale = normalizeUiLocale(locale) || DEFAULT_UI_LOCALE;
  return MESSAGE_CATALOGS[normalizedLocale];
}

export function getMessage(locale, key, values = {}) {
  const catalog = getMessageCatalog(locale);
  if (!Object.hasOwn(catalog, key)) {
    throw new Error(`MISSING_MESSAGE_KEY:${normalizeUiLocale(locale) || DEFAULT_UI_LOCALE}:${key}`);
  }

  return catalog[key].replace(PLACEHOLDER_PATTERN, (_, name) => {
    if (!Object.hasOwn(values, name)) throw new Error(`MISSING_MESSAGE_VALUE:${key}:${name}`);
    return String(values[name]);
  });
}

export function getPrivacyCenterMessageCatalog(locale) {
  const normalizedLocale = normalizeUiLocale(locale) || DEFAULT_UI_LOCALE;
  return PRIVACY_CENTER_MESSAGE_CATALOGS[normalizedLocale];
}

export function getPrivacyCenterMessage(locale, key, values = {}) {
  const normalizedLocale = normalizeUiLocale(locale) || DEFAULT_UI_LOCALE;
  const catalog = PRIVACY_CENTER_MESSAGE_CATALOGS[normalizedLocale];
  if (!Object.hasOwn(catalog, key)) {
    throw new Error(`MISSING_PRIVACY_CENTER_MESSAGE_KEY:${normalizedLocale}:${key}`);
  }

  return catalog[key].replace(PLACEHOLDER_PATTERN, (_, name) => {
    if (!Object.hasOwn(values, name)) {
      throw new Error(`MISSING_PRIVACY_CENTER_MESSAGE_VALUE:${key}:${name}`);
    }
    return String(values[name]);
  });
}
