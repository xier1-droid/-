const attempts = new Map<string, { count: number; resetAt: number }>();

export function allowAttempt(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const previous = attempts.get(key);
  const current = !previous || previous.resetAt <= now ? { count: 0, resetAt: now + windowMs } : previous;
  current.count += 1;
  attempts.set(key, current);
  return current.count <= limit;
}
