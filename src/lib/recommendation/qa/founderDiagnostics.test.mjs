import assert from "node:assert/strict";
import test from "node:test";

import {
  attachFounderDiagnostics,
  founderDiagnosticsSecretExposureCount,
  sanitizeFounderDiagnostics,
} from "./founderDiagnostics.js";

test("Founder diagnostics redact credential-like fields", () => {
  const sanitized = sanitizeFounderDiagnostics({
    provider: "tmdb",
    authorization: "Bearer do-not-display",
    nested: { apiKey: "do-not-display" },
  });
  assert.equal(sanitized.authorization, "[redacted]");
  assert.equal(sanitized.nested.apiKey, "[redacted]");
  assert.equal(founderDiagnosticsSecretExposureCount(sanitized), 0);
});

test("candidate diagnostics attach by provider media type and content id", () => {
  const [result] = attachFounderDiagnostics(
    [{ mediaType: "tv", tmdbId: 10, title: "A" }],
    { candidates: [{ providerMediaType: "tv", tmdbId: 10, genreMatchMode: "semantic-specialized" }] },
  );
  assert.equal(result.qaDiagnostics.genreMatchMode, "semantic-specialized");
});
