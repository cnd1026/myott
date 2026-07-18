const SECRET_KEYS = /(authorization|api.?key|bearer|token|credential|secret)/i;

export function sanitizeFounderDiagnostics(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeFounderDiagnostics(item, seen));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SECRET_KEYS.test(key) ? "[redacted]" : sanitizeFounderDiagnostics(item, seen),
  ]));
}

export function founderCandidateKey(item = {}) {
  const mediaType = item.providerMediaType || item.mediaType || item.media_type || "unknown";
  const id = item.providerContentId || item.tmdbId || item.id || "unknown";
  return `${mediaType}:${id}`;
}

export function buildFounderDiagnosticsMap(diagnostics = {}) {
  return new Map((diagnostics.candidates || []).map((candidate) => [founderCandidateKey(candidate), candidate]));
}

export function attachFounderDiagnostics(results = [], diagnostics = {}) {
  const map = buildFounderDiagnosticsMap(diagnostics);
  return results.map((item) => ({ ...item, qaDiagnostics: map.get(founderCandidateKey(item)) || null }));
}

export function founderDiagnosticsSecretExposureCount(value) {
  const serialized = JSON.stringify(value || {});
  const credentialValue = /"(?:authorization|api.?key|bearer|token|credential|secret)"\s*:\s*"(?!\[redacted\]|configured|not configured)[^"]+"/i;
  return /(bearer\s+[a-z0-9._-]{8,})/i.test(serialized) || credentialValue.test(serialized) ? 1 : 0;
}
