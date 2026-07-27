import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = storage.get<string | null>('token', null);
      if (token) {
        try {
          const response = await profileService.getProfile();
          if (response.data) {
            setUser(response.data);
            storage.set('user', response.data);
          }
        } catch (error) {
          console.error('Failed to load user profile, token might be invalid', error);
          setUser(null);
          storage.remove('user');
          storage.remove('token');
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response.data) {
        setUser(response.data.user);
        storage.set('user', response.data.user);
        storage.set('token', response.data.token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await authService.register(userData);
      if (response.data) {
        setUser(response.data.user);
        storage.set('user', response.data.user);
        storage.set('token', response.data.token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      storage.remove('user');
      storage.remove('token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
