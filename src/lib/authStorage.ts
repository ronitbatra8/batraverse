const AUTH_KEYS = ["bt-token", "bt-accounts", "bt-current", "bt-current-user-id"] as const;

export type AuthKey = (typeof AUTH_KEYS)[number];

function getStore(): Storage {
  if (typeof window === "undefined") return localStorage;
  try {
    return sessionStorage;
  } catch {
    return localStorage;
  }
}

export function getAuth(key: AuthKey): string | null {
  try {
    return getStore().getItem(key);
  } catch {
    return null;
  }
}

export function setAuth(key: AuthKey, value: string): void {
  try {
    getStore().setItem(key, value);
  } catch {
    /* noop */
  }
}

export function removeAuth(key: AuthKey): void {
  try {
    getStore().removeItem(key);
  } catch {
    /* noop */
  }
}

export function getAuthJSON<T = unknown>(key: AuthKey): T | null {
  const raw = getAuth(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setAuthJSON(key: AuthKey, value: unknown): void {
  setAuth(key, JSON.stringify(value));
}
