'use client';

import React, { createContext, useContext, useSyncExternalStore } from 'react';

interface StorageContextType {
  read: <T>(key: string, fallback: T) => T;
  write: <T>(key: string, value: T) => void;
  isLoaded: boolean;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

// useSyncExternalStore returns false on the server and true once hydrated on the
// client. This replaces the classic useState(false) + useEffect(setTrue, [])
// pattern, which the React Compiler flags as "set state in effect".
const noop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const isLoaded = useSyncExternalStore(noop, getClientSnapshot, getServerSnapshot);

  const read = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return parsed as T;
      } catch {
        // Safety: if fallback is an array but we got a non-JSON string, return the
        // fallback to avoid .map/.find crashes downstream.
        if (Array.isArray(fallback) && typeof raw === 'string') {
          return fallback;
        }
        return raw as unknown as T;
      }
    } catch {
      return fallback;
    }
  };

  const write = <T,>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err: unknown) {
      const e = err as { name?: string; code?: number };
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.warn(`Storage Quota Exceeded while writing "${key}". Trying emergency cleanup...`);
        // Emergency: Clear unrelated heavy keys?
        try {
          // If we are not writing events, maybe we can clear events to make space for critical data
          if (key !== 'events') {
            console.warn('Clearing "events" history to free up space for critical data.');
            localStorage.removeItem('events');

            // Retry write
            try {
              localStorage.setItem(key, JSON.stringify(value));
              console.log(`Successfully recovered write for "${key}" after cleanup.`);
              return;
            } catch (secondErr) {
              console.error(`Emergency write failed for "${key}" even after cleanup. Payload size: ${JSON.stringify(value).length} chars.`, secondErr);
            }
          } else {
            console.error("Critical: Cannot write 'events'. Storage full.");
          }
        } catch (retryErr) {
          console.error("Emergency cleanup and retry sequence failed:", retryErr);
        }
      } else {
        console.error(`Error writing key "${key}":`, err);
      }
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
