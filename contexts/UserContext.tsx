'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, LoginResponse } from '../types';
import { 
  authApi, 
  getStoredUser, 
  setStoredUser, 
  clearTokens, 
  getAccessToken,
  setTokens,
  ApiError 
} from '../lib/api/client';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize user data from API response to handle field name differences
  const normalizeUser = (userData: any): User => {
    return {
      ...userData,
      // Add convenience aliases for frontend components
      name: userData.full_name || userData.name,
      isVerified: userData.kyc_status === 'verified',
    };
  };

  // Initialize user from stored data on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = getStoredUser();
        const token = getAccessToken();

        if (storedUser && token) {
          // Set stored user immediately for fast UI
          setUserState(normalizeUser(storedUser));
          
          // Verify token is still valid by fetching current user
          try {
            const response = await authApi.getCurrentUser();
            if (response.user) {
              const normalizedUser = normalizeUser(response.user);
              setUserState(normalizedUser);
              setStoredUser(normalizedUser);
            }
          } catch (err) {
            // Token invalid or expired, clear auth state
            const isExpired = err instanceof ApiError && err.statusCode === 401;
            if (isExpired) {
              setError('Session expired. Please log in again.');
            }
            console.warn('Token validation failed, clearing auth:', err);
            clearTokens();
            setUserState(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for session expiry events from API client
  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      const message = event.detail?.message || 'Session expired. Please log in again.';
      setError(message);
      setUserState(null);
      clearTokens();
    };

    window.addEventListener('session-expired', handleSessionExpired as EventListener);
    
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired as EventListener);
    };
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(email, password);
      
      if (response.user) {
        const normalizedUser = normalizeUser(response.user);
        setUserState(normalizedUser);
        setStoredUser(normalizedUser);
      }
      
      return response as LoginResponse;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUserState(null);
      clearTokens();
      // Also clear legacy storage keys
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('mockRole');
        localStorage.removeItem('property-storage');
        localStorage.removeItem('temp_role');
      }
      setIsLoading(false);
    }
  }, []);

  // Set user function (for external updates like registration)
  const setUser = useCallback((newUser: User | null) => {
    if (newUser) {
      const normalizedUser = normalizeUser(newUser);
      setUserState(normalizedUser);
      setStoredUser(normalizedUser);
    } else {
      setUserState(null);
      clearTokens();
    }
  }, []);

  // Refresh user data from API
  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) return;
    
    try {
      const response = await authApi.getCurrentUser();
      if (response.user) {
        const normalizedUser = normalizeUser(response.user);
        setUserState(normalizedUser);
        setStoredUser(normalizedUser);
      }
    } catch (err) {
      // If session expired, clear auth state
      if (err instanceof ApiError && err.statusCode === 401) {
        setError('Session expired. Please log in again.');
        setUserState(null);
        clearTokens();
      } else {
        console.error('Failed to refresh user:', err);
      }
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: UserContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !!getAccessToken(),
    error,
    login,
    logout,
    setUser,
    refreshUser,
    clearError,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Hook for authentication status only (lighter weight)
export function useAuth() {
  const { user, isLoading, isAuthenticated, login, logout, error, clearError } = useUser();
  return { user, isLoading, isAuthenticated, login, logout, error, clearError };
}
