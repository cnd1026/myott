import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { getMessage } from "../src/lib/i18n/messageCatalog.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const attributionCommit = "44a99e471a0a4b0bad052dfe3c1ce459dc06aaf1";
const layout = readFileSync(path.join(repositoryRoot, "app", "layout.jsx"), "utf8");
const styles = readFileSync(path.join(repositoryRoot, "app", "globals.css"), "utf8");

test("release attribution remains visible through the current localized runtime", () => {
  assert.match(layout, /<footer className="attribution-footer" aria-labelledby="attribution-heading">/);
  assert.match(layout, /<h2 id="attribution-heading">\{message\("attribution\.heading"\)\}<\/h2>/);
  assert.match(layout, /src="\/tmdb-approved-logo\.svg"/);
  assert.match(layout, /alt=\{message\("attribution\.tmdbLogoAlt"\)\}/);
  assert.match(layout, /message\("attribution\.tmdbDisclaimer"\)/);
  assert.match(layout, /message\("attribution\.justWatch"\)/);
  assert.equal(getMessage("ko-KR", "attribution.heading"), "데이터 출처·고지");
  assert.match(getMessage("ko-KR", "attribution.tmdbDisclaimer"), /TMDB API/);
  assert.match(getMessage("ko-KR", "attribution.justWatch"), /JustWatch/);
  assert.doesNotMatch(layout, /NODE_ENV/);
  assert.match(styles, /\.attribution-footer\s*\{/);
  assert.doesNotMatch(styles, /\.attribution-footer\s*\{[^}]*display:\s*none/s);
});

test("the attribution introduction commit changed no recommendation or dependency sources", () => {
  const unchangedPaths = [
    "lib/tmdb.js",
    "src/lib/recommendation/filters/hardFilterContract.js",
    "src/lib/providers/tmdb/provider.js",
    "package.json",
    "pnpm-lock.yaml",
  ];
  execFileSync("git", ["diff", "--quiet", `${attributionCommit}^`, attributionCommit, "--", ...unchangedPaths], {
    cwd: repositoryRoot,
    stdio: "pipe",
  });
});
