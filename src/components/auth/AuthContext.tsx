"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { getAuth, setAuth, removeAuth, getAuthJSON, setAuthJSON } from "@/lib/authStorage";

export interface SavedAddress {
  id: string;
  address: string;
  apartment?: string | null;
  city: string;
  state: string | null;
  pincode: string | null;
  alternatePhone?: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
  approved?: boolean;
  cardNumber?: string | null;
  cardLevel?: string | null;
  cardExpiry?: string | null;
  walletBalance?: number;
  peakWalletBalance?: number;
  hasCardPin?: boolean;
  freeDeliveryUsed?: number;
  freeDeliveryMonth?: string | null;
  createdAt?: string;
  orderCount?: number;
  savedAddresses?: SavedAddress[];
}

export interface StoredAccount {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
    verifyToken?: string;
  }) => Promise<User>;
  login: (identifier: string, password: string) => Promise<User>;
  enterAsGuest: () => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadAccounts(): StoredAccount[] {
  return getAuthJSON<StoredAccount[]>("bt-accounts") || [];
}

function saveAccounts(accounts: StoredAccount[]) {
  setAuthJSON("bt-accounts", accounts);
}

function loadCurrentIndex(): number {
  const raw = getAuth("bt-current");
  const idx = raw ? parseInt(raw, 10) : 0;
  return Number.isNaN(idx) ? 0 : idx;
}

function saveCurrentIndex(i: number) {
  setAuth("bt-current", String(i));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadUser = useCallback(async () => {
    const stored = loadAccounts();
    let idx = loadCurrentIndex();
    if (stored.length > 0 && (idx < 0 || !stored[idx])) {
      idx = 0;
      saveCurrentIndex(0);
    }
    setAccounts(stored);
    setCurrentIndex(idx);

    /* Legacy guest flag lived in localStorage and survived sign-ins; wipe it. */
    if (typeof window !== "undefined" && localStorage.getItem("bt-guest")) {
      localStorage.removeItem("bt-guest");
    }

    if (typeof window !== "undefined" && sessionStorage.getItem("bt-guest") === "1") {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    if (stored.length === 0 || !stored[idx]) {
      setLoading(false);
      return;
    }

    const token = stored[idx].token;
    setAuth("bt-token", token);
    setAuth("bt-current-user-id", stored[idx].user.id);
    try {
      const data = await apiFetch("/auth/me");
      const updated = [...stored];
      updated[idx] = { ...updated[idx], user: data };
      setAccounts(updated);
      saveAccounts(updated);
      setUser(data);
    } catch {
      setUser(stored[idx].user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: restore the signed-in session only once, after mount
    loadUser();

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== "bt-accounts") return;
      const updated = loadAccounts();
      const idx = loadCurrentIndex();
      setAccounts(updated);
      setCurrentIndex(idx >= 0 && idx < updated.length ? idx : 0);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadUser]);

  const register = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
    verifyToken?: string;
  }) => {
    const res = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) });
    const updated = [{ token: res.token, user: res.user }];
    saveAccounts(updated);
    saveCurrentIndex(0);
    setAccounts(updated);
    setCurrentIndex(0);
    setAuth("bt-token", res.token);
    setAuth("bt-current-user-id", res.user.id);
    localStorage.removeItem("bt-guest");
    sessionStorage.removeItem("bt-guest");
    setIsGuest(false);
    setUser(res.user);
    return res.user;
  };

  /* Single account only: logging in always replaces whatever session is stored.
     To use another account you must sign out first. */
  const login = async (identifier: string, password: string) => {
    const res = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
    const updated = [{ token: res.token, user: res.user }];
    saveAccounts(updated);
    saveCurrentIndex(0);
    setAccounts(updated);
    setCurrentIndex(0);
    setAuth("bt-token", res.token);
    setAuth("bt-current-user-id", res.user.id);
    localStorage.removeItem("bt-guest");
    sessionStorage.removeItem("bt-guest");
    setIsGuest(false);
    setUser(res.user);
    return res.user;
  };

  const enterAsGuest = () => {
    sessionStorage.setItem("bt-guest", "1");
    localStorage.removeItem("bt-guest");
    setIsGuest(true);
  };

  const logout = () => {
    sessionStorage.removeItem("bt-guest");
    localStorage.removeItem("bt-guest");
    setIsGuest(false);
    saveAccounts([]);
    saveCurrentIndex(0);
    setAccounts([]);
    setCurrentIndex(0);
    removeAuth("bt-token");
    removeAuth("bt-current-user-id");
    setUser(null);
  };

  const updateUser = async (data: Partial<User>) => {
    const updated = await apiFetch("/auth/me", { method: "PUT", body: JSON.stringify(data) });
    setUser(updated);
    const stored = loadAccounts();
    const idx = loadCurrentIndex();
    if (stored[idx]) {
      stored[idx] = { ...stored[idx], user: updated };
      saveAccounts(stored);
      setAccounts(stored);
    }
  };

  const refreshUser = async () => {
    const data = await apiFetch("/auth/me");
    setUser(data);
    const stored = loadAccounts();
    const idx = loadCurrentIndex();
    if (stored[idx]) {
      stored[idx] = { ...stored[idx], user: data };
      saveAccounts(stored);
      setAccounts(stored);
    }
  };

  const value = useMemo(
    () => ({ user, loading, isGuest, register, login, enterAsGuest, logout, updateUser, refreshUser }),
    [user, loading, isGuest, register, login, enterAsGuest, logout, updateUser, refreshUser]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
