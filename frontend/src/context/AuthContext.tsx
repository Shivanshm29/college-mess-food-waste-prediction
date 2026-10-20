import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, LoginPayload, RegisterPayload } from '../api/auth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          localStorage.setItem('user_data', JSON.stringify(profile));
        } catch (err) {
          console.error('Session expired or invalid:', err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (payload: LoginPayload) => {
    const resp = await authApi.login(payload);
    localStorage.setItem('access_token', resp.access_token);
    localStorage.setItem('user_data', JSON.stringify(resp.user));
    setToken(resp.access_token);
    setUser(resp.user);
  };

  const register = async (payload: RegisterPayload) => {
    const resp = await authApi.register(payload);
    localStorage.setItem('access_token', resp.access_token);
    localStorage.setItem('user_data', JSON.stringify(resp.user));
    setToken(resp.access_token);
    setUser(resp.user);
  };

  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch (e) {
      // Continue client cleanup even if network fails
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setToken(null);
    }
  };

  const updateUserData = (updatedUser: User) => {
    localStorage.setItem('user_data', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
