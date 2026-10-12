import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../");
const page = readFileSync(path.join(root, "app/page.jsx"), "utf8");

test("result count is politely announced as a single atomic live status", () => {
  const matches = page.match(/<p\s+className="result-count"\s+id="resultCount"[^>]+>/g) ?? [];
  assert.equal(matches.length, 1);
  assert.match(matches[0], /\brole="status"/);
  assert.match(matches[0], /\baria-live="polite"/);
  assert.match(matches[0], /\baria-atomic="true"/);
});

test("new result status does not modify translated result count or announce assertively", () => {
  assert.match(page, /<p\s+className="result-count"\s+id="resultCount"[^>]*>\{message\("results\.count", \{ count: results\.length \}\)\}<\/p>/);
  assert.doesNotMatch(page, /aria-live="assertive"/);
});
