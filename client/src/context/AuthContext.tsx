import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserStatus } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>;
  googleLogin: (credentialOrToken: string, googleProfile?: any) => Promise<void>;
  logout: () => void;
  updateStatus: (status: UserStatus, customStatus?: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pulsecord_token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch authenticated user profile on mount or token change
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        localStorage.removeItem('pulsecord_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userObj } = response.data;
    localStorage.setItem('pulsecord_token', newToken);
    setToken(newToken);
    setUser(userObj);
  };

  const register = async (email: string, username: string, password: string, displayName?: string) => {
    const response = await api.post('/auth/register', { email, username, password, displayName });
    const { token: newToken, user: userObj } = response.data;
    localStorage.setItem('pulsecord_token', newToken);
    setToken(newToken);
    setUser(userObj);
  };

  const googleLogin = async (credentialOrToken: string, googleProfile?: any) => {
    const response = await api.post('/auth/google', { credential: credentialOrToken, googleProfile });
    const { token: newToken, user: userObj } = response.data;
    localStorage.setItem('pulsecord_token', newToken);
    setToken(newToken);
    setUser(userObj);
  };

  const logout = () => {
    localStorage.removeItem('pulsecord_token');
    setToken(null);
    setUser(null);
  };

  const updateStatus = async (status: UserStatus, customStatus?: string) => {
    try {
      const response = await api.patch('/auth/profile', { status, customStatus });
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await api.patch('/auth/profile', data);
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        googleLogin,
        logout,
        updateStatus,
        updateProfile,
        updateUser,
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
