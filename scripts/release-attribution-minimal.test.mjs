import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = "620496c637510327f6616937c5e292f302a0fbf7";
const layout = readFileSync(path.join(repositoryRoot, "app", "layout.jsx"), "utf8");
const styles = readFileSync(path.join(repositoryRoot, "app", "globals.css"), "utf8");

test("release attribution is visible outside development diagnostics", () => {
  assert.match(layout, /<footer className="attribution-footer" aria-labelledby="attribution-heading">/);
  assert.match(layout, /<h2 id="attribution-heading">데이터 출처·고지<\/h2>/);
  assert.match(layout, /<img\s+src="\/tmdb-approved-logo\.svg"\s+alt="TMDB approved logo"/);
  assert.match(layout, /This product uses the TMDB API but is not endorsed or certified by TMDB\./);
  assert.match(layout, /OTT 제공 정보 및 시청 가능 여부 데이터 출처: JustWatch/);
  assert.doesNotMatch(layout, /NODE_ENV/);
  assert.match(styles, /\.attribution-footer\s*\{/);
  assert.doesNotMatch(styles, /\.attribution-footer\s*\{[^}]*display:\s*none/s);
});

test("attribution change does not alter recommendation or dependency sources", () => {
  const unchangedPaths = [
    "lib/tmdb.js",
    "src/lib/recommendation/filters/hardFilterContract.js",
    "src/lib/providers/tmdb/provider.js",
    "package.json",
    "pnpm-lock.yaml",
  ];

  execFileSync("git", ["diff", "--quiet", base, "--", ...unchangedPaths], {
    cwd: repositoryRoot,
    stdio: "pipe",
  });
});
