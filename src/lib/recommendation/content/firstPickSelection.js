export const FIRST_PICK_BUCKET_MS = 5 * 60 * 1000;

export function firstPickBucket(value = Date.now()) {
  const timestamp = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / FIRST_PICK_BUCKET_MS) : 0;
}

export function selectFirstPicksForBucket(items = [], value = Date.now(), limit = 3) {
  const candidates = Array.isArray(items) ? items : [];
  const boundedLimit = Math.max(0, Math.min(Math.trunc(Number(limit) || 0), candidates.length));
  if (!boundedLimit) return [];

  const bucket = firstPickBucket(value);
  const start = ((bucket % candidates.length) + candidates.length) % candidates.length;
  return Array.from({ length: boundedLimit }, (_, index) => candidates[(start + index) % candidates.length]);
}
