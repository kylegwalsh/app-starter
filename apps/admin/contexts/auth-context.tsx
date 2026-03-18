'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { authClient, signIn, signOut, useSession, type User } from '@/core/auth';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, isPending } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const user = session?.user as User | null;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  // Sign in with email/password, then verify the session has admin role before allowing access
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoggingIn(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Login failed');
        return false;
      }

      const session = await authClient.getSession();

      // Check if user is admin
      const userData = session?.data?.user as User | undefined;

      if (userData?.role !== 'admin') {
        await signOut();
        setError('Access denied. Admin privileges required.');
        return false;
      }

      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  // Call Better Auth signOut and swallow errors to avoid blocking UI navigation
  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading: isPending || isLoggingIn,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
