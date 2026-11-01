const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type Entry = { failures: number; resetAt: number };

// En memoria: protege cada instancia del servidor. Para entornos serverless multiinstancia conviene un almacén compartido (Redis/DB).
const store = new Map<string, Entry>();

function getEntry(key: string) {
  const entry = store.get(key);
  if (entry && entry.resetAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

export function isLoginBlocked(keys: string[]) {
  return keys.some((key) => (getEntry(key)?.failures ?? 0) >= MAX_ATTEMPTS);
}

export function registerLoginFailure(keys: string[]) {
  if (store.size > 5000) {
    const now = Date.now();
    store.forEach((entry, key) => { if (entry.resetAt <= now) store.delete(key); });
  }
  for (const key of keys) {
    const entry = getEntry(key);
    if (entry) entry.failures += 1;
    else store.set(key, { failures: 1, resetAt: Date.now() + WINDOW_MS });
  }
}

export function clearLoginFailures(keys: string[]) {
  for (const key of keys) store.delete(key);
}
