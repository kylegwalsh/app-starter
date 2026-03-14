import { createContext, useCallback, useContext, useState } from 'react';

import { getSession, signIn, signOut, useSession } from '~/lib/auth-client';

type AuthContextValue = {
  user: { id: string; name: string; email: string; role: string | null } | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = useSession();
  const [error, setError] = useState<string | null>(null);

  const user = session?.user ?? null;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const result = await signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message ?? 'Login failed');
        return;
      }

      // Verify the user is an admin
      const sessionResult = await getSession();
      if (sessionResult.data?.user?.role !== 'admin') {
        await signOut();
        setError('Access denied. Admin privileges required.');
        return;
      }
    } catch {
      setError('An unexpected error occurred');
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext value={{
      user,
      isAuthenticated,
      isAdmin,
      isLoading: isPending,
      error,
      login,
      logout,
      clearError,
    }}>
      {children}
    </AuthContext>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
