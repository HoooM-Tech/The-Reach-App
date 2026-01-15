'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { UserProvider } from '../contexts/UserContext';

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long before a query is considered stale (5 minutes)
      staleTime: 5 * 60 * 1000,
      // Cache time: how long to keep data in cache (10 minutes)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 1 time
      retry: 1,
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        {children}
      </UserProvider>
      {/* Show React Query Devtools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
