const AUTH_KEYS = ["bt-token", "bt-accounts", "bt-current", "bt-current-user-id"] as const;

export type AuthKey = (typeof AUTH_KEYS)[number];

/**
 * AUTH_KEYS live in localStorage so the signed-in account is shared reliably
 * across every tab of the same origin (opening a product in a new tab keeps
 * you signed in). Signing out clears them, which signs out all tabs — that
 * shared-session behaviour is intentional so a new tab never looks logged out.
 *
 * localStorage is used (not sessionStorage) because a tab cloned from the
 * opener via target="_blank" does NOT receive a sessionStorage copy in
 * Firefox/Safari, so the account would be lost in new tabs.
 */
function getStore(): Storage {
  if (typeof window === "undefined") return localStorage;
  try {
    if (!window.localStorage) {
      /* istanbul ignore next */
      throw new Error("no localStorage");
    }
    return window.localStorage;
  } catch {
    return window.localStorage;
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
