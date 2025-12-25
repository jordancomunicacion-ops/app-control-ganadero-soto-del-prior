'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface StorageContextType {
  read: <T>(key: string, fallback: T) => T;
  write: <T>(key: string, value: T) => void;
  isLoaded: boolean;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);

  // We need to wait for client-side hydration to access localStorage
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const read = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return parsed as T;
      } catch (parseErr) {
        // Safety: If fallback is an array but we got a string, return the fallback to avoid .map/.find crashes
        if (Array.isArray(fallback) && typeof raw === 'string') {
          return fallback;
        }

        return raw as unknown as T;
      }
    } catch (err) {
      return fallback;
    }
  };

  const write = <T,>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error writing key "${key}":`, err);
    }
  };

  return (
    <StorageContext.Provider value={{ read, write, isLoaded }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}
