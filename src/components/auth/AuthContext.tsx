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
  accounts: StoredAccount[];
  currentIndex: number;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
    verifyToken?: string;
  }) => Promise<User>;
  login: (identifier: string, password: string, addMode?: boolean) => Promise<User>;
  enterAsGuest: () => void;
  logout: () => void;
  switchAccount: (index: number) => void;
  addAccount: (token: string, user: User) => void;
  removeAccount: (index: number) => void;
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
    if (typeof window !== "undefined" && !localStorage.getItem("bt-accounts-cleaned")) {
      localStorage.removeItem("bt-accounts");
      localStorage.removeItem("bt-current");
      localStorage.removeItem("bt-token");
      localStorage.removeItem("bt-current-user-id");
      localStorage.setItem("bt-accounts-cleaned", "1");
    }

    const stored = loadAccounts();
    const idx = loadCurrentIndex();
    setAccounts(stored);
    setCurrentIndex(idx);

    if (typeof window !== "undefined" && localStorage.getItem("bt-guest") === "1") {
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
      if (e.key === "bt-accounts") {
        const updated = loadAccounts();
        const idx = loadCurrentIndex();
        setAccounts(updated);
        if (updated.length === 0 || !updated[idx]) {
          setCurrentIndex(0);
          removeAuth("bt-token");
          removeAuth("bt-current-user-id");
          setUser(null);
        } else {
          setCurrentIndex(idx);
          setAuth("bt-token", updated[idx].token);
          setAuth("bt-current-user-id", updated[idx].user.id);
          setUser(updated[idx].user);
        }
      }
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
    addAccount(res.token, res.user);
    setAuth("bt-token", res.token);
    setUser(res.user);
    return res.user;
  };

  const login = async (identifier: string, password: string, addMode?: boolean) => {
    const res = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
    const stored = loadAccounts();
    const exists = stored.findIndex((a) => a.user.id === res.user.id);
    if (addMode && exists < 0) {
      const updated = [...stored, { token: res.token, user: res.user }];
      saveAccounts(updated);
      saveCurrentIndex(updated.length - 1);
      setAccounts(updated);
      setCurrentIndex(updated.length - 1);
      setAuth("bt-token", res.token);
      setAuth("bt-current-user-id", res.user.id);
      setUser(res.user);
      window.dispatchEvent(new Event("bt-account-switch"));
      return res.user;
    }
    if (exists >= 0) {
      const updated = [...stored];
      updated[exists] = { token: res.token, user: res.user };
      saveAccounts(updated);
      saveCurrentIndex(exists);
      setAccounts(updated);
      setCurrentIndex(exists);
    } else {
      const updated = [{ token: res.token, user: res.user }];
      saveAccounts(updated);
      saveCurrentIndex(0);
      setAccounts(updated);
      setCurrentIndex(0);
    }
    setAuth("bt-token", res.token);
    setAuth("bt-current-user-id", res.user.id);
    setUser(res.user);
    return res.user;
  };

  const enterAsGuest = () => {
    localStorage.setItem("bt-guest", "1");
    setIsGuest(true);
  };

  const logout = () => {
    localStorage.removeItem("bt-guest");
    setIsGuest(false);
    const stored = loadAccounts();
    const idx = loadCurrentIndex();
    const updated = stored.filter((_, i) => i !== idx);
    saveAccounts(updated);
    const newIdx = Math.min(idx, updated.length - 1);
    if (newIdx >= 0 && updated[newIdx]) {
      saveCurrentIndex(newIdx);
      setAccounts(updated);
      setCurrentIndex(newIdx);
      setAuth("bt-token", updated[newIdx].token);
      setAuth("bt-current-user-id", updated[newIdx].user.id);
      setUser(updated[newIdx].user);
      window.dispatchEvent(new Event("bt-account-switch"));
    } else {
      saveCurrentIndex(0);
      setAccounts([]);
      setCurrentIndex(0);
      removeAuth("bt-token");
      removeAuth("bt-current-user-id");
      setUser(null);
    }
  };

  const switchAccount = async (index: number) => {
    const stored = loadAccounts();
    if (stored[index]) {
      saveCurrentIndex(index);
      setCurrentIndex(index);
      setAuth("bt-token", stored[index].token);
      setAuth("bt-current-user-id", stored[index].user.id);
      setAccounts(stored);
      try {
        const data = await apiFetch("/auth/me");
        const updated = [...stored];
        updated[index] = { ...updated[index], user: data };
        setAccounts(updated);
        saveAccounts(updated);
        setUser(data);
      } catch {
        setUser(stored[index].user);
      }
      window.dispatchEvent(new Event("bt-account-switch"));
    }
  };

  const addAccount = (token: string, newUser: User) => {
    const stored = loadAccounts();
    const exists = stored.findIndex((a) => a.user.id === newUser.id);
    if (exists >= 0) {
      const updated = [...stored];
      updated[exists] = { token, user: newUser };
      saveAccounts(updated);
      setAccounts(updated);
    } else {
      const updated = [...stored, { token, user: newUser }];
      saveAccounts(updated);
      setAccounts(updated);
    }
  };

  const removeAccount = (index: number) => {
    const stored = loadAccounts();
    const updated = stored.filter((_, i) => i !== index);
    saveAccounts(updated);
    setAccounts(updated);

    if (index === currentIndex) {
      if (updated.length > 0) {
        const newIdx = Math.min(index, updated.length - 1);
        saveCurrentIndex(newIdx);
        setCurrentIndex(newIdx);
        setAuth("bt-token", updated[newIdx].token);
        setUser(updated[newIdx].user);
      } else {
        saveCurrentIndex(0);
        setCurrentIndex(0);
        removeAuth("bt-token");
        setUser(null);
      }
    } else if (index < currentIndex) {
      const newIdx = currentIndex - 1;
      saveCurrentIndex(newIdx);
      setCurrentIndex(newIdx);
    }
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
    () => ({ user, loading, isGuest, accounts, currentIndex, register, login, enterAsGuest, logout, switchAccount, addAccount, removeAccount, updateUser, refreshUser }),
    [user, loading, isGuest, accounts, currentIndex, register, login, enterAsGuest, logout, switchAccount, addAccount, removeAccount, updateUser, refreshUser]
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
