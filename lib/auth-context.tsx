'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type UserRole = 'admin' | 'accountant' | 'chef';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ user?: User; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const readStoredUser = () => {
    try {
      return window.localStorage.getItem('user');
    } catch {
      return null;
    }
  };

  const writeStoredUser = (value: User | null) => {
    try {
      if (value) {
        window.localStorage.setItem('user', JSON.stringify(value));
      } else {
        window.localStorage.removeItem('user');
      }
    } catch {
      // Ignore storage errors for environments that block localStorage.
    }
  };

  // Restore user session on mount
  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        writeStoredUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Login failed' };
      }
      const newUser: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
      };
      setUser(newUser);
      writeStoredUser(newUser);
      return { user: newUser };
    } catch {
      return { error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    writeStoredUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
