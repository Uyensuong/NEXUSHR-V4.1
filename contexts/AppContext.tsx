
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, Language, Permission } from '../types';
import { api } from '../services/mockService';
import { translations } from '../lib/translations';

// --- Language Context ---
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within AppProvider');
  return context;
};

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  loginViaGmail: (email: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AppProvider');
  return context;
};

// --- Combined Provider ---
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language State - Default to 'vi' (Vietnamese)
  const [language, setLanguage] = useState<Language>('vi');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persisted session (mock)
    const storedUser = localStorage.getItem('nexus_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const user = await api.login(email, pass);
    setUser(user);
    localStorage.setItem('nexus_user', JSON.stringify(user));
  };

  const loginViaGmail = async (email: string) => {
    const user = await api.loginViaGmail(email);
    setUser(user);
    localStorage.setItem('nexus_user', JSON.stringify(user));
  }

  const signup = async (email: string, pass: string, name: string) => {
    const user = await api.signup(email, pass, name);
    setUser(user);
    localStorage.setItem('nexus_user', JSON.stringify(user));
  };

  const forgotPassword = async (email: string) => {
    await api.forgotPassword(email);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nexus_user');
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true; 
    return user.permissions?.includes(permission) || false;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <AuthContext.Provider value={{ user, login, loginViaGmail, signup, forgotPassword, logout, isLoading, hasPermission }}>
        {children}
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
};
