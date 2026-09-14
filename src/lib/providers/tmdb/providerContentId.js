export function normalizeTmdbProviderContentId(value) {
  const candidate = typeof value === "number" ? String(value) : String(value || "").trim();
  if (!/^\d+$/.test(candidate)) return "";

  const parsed = Number(candidate);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return "";
  return String(parsed);
}
