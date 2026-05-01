'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth as authApi, setToken, clearToken, type User } from './api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthExpired(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me.user);
    } catch (err) {
      if (isAuthExpired(err)) {
        setUser(null);
        clearToken();
        setTokenState(null);
        return;
      }
      // transient errors (e.g. 429/5xx/network) should not force logout
      console.warn('[Auth] refreshUser transient failure:', err);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('dr_token');
    if (stored) {
      setTokenState(stored);
      authApi.me()
        .then(d => setUser(d.user))
        .catch((err) => {
          if (isAuthExpired(err)) {
            clearToken();
            setTokenState(null);
            setUser(null);
            return;
          }
          // keep session token on transient failures
          console.warn('[Auth] initial me() transient failure:', err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Listen for cross-tab logout events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'dr_token' && !e.newValue) {
        setTokenState(null);
        setUser(null);
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', handleStorage);

    // Also listen for BroadcastChannel logout
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('marp_auth');
      channel.onmessage = (e) => {
        if (e.data?.type === 'logout') {
          clearToken();
          setTokenState(null);
          setUser(null);
          window.location.href = '/login';
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      channel?.close();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
  };

  const signup = async (username: string, email: string, password: string) => {
    await authApi.signup(username, email, password);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
