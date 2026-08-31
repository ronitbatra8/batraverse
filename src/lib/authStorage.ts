const AUTH_KEYS = ["bt-token", "bt-accounts", "bt-current", "bt-current-user-id"] as const;

export type AuthKey = (typeof AUTH_KEYS)[number];

/**
 * AUTH_KEYS live in sessionStorage so each browser tab keeps its own session.
 * Signing in/out in one tab never mutates the session of other tabs; a session
 * survives until that tab is closed or the user signs out manually.
 *
 * Note: tabs opened from a tab (e.g. admin "Access Account") inherit a copy of
 * the opener's sessionStorage, so impersonate-in-new-tab keeps working.
 */
function getStore(): Storage {
  if (typeof window === "undefined") return sessionStorage;
  try {
    if (!window.sessionStorage) {
      /* istanbul ignore next */
      throw new Error("no sessionStorage");
    }
    return window.sessionStorage;
  } catch {
    return window.sessionStorage;
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
