import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData } from '../types';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  googleLogin: (idToken: string, phone?: string) => Promise<void>;
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

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    if (response.data) {
      setUser(response.data.user);
      storage.set('user', response.data.user);
      storage.set('token', response.data.token);
    }
  };

  const register = async (userData: RegisterData) => {
    const response = await authService.register(userData);
    if (response.data) {
      setUser(response.data.user);
      storage.set('user', response.data.user);
      storage.set('token', response.data.token);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout API failed', e);
    } finally {
      setUser(null);
      storage.remove('user');
      storage.remove('token');
    }
  };

  const googleLogin = async (idToken: string, phone?: string) => {
    const response = await authService.googleLogin(idToken, phone);
    if (response.data) {
      setUser(response.data.user);
      storage.set('user', response.data.user);
      storage.set('token', response.data.token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
