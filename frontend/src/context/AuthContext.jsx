import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('wp_access_token');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async () => {
    try {
      const res = await authApi.me();
      setUser(res.data.user);
      setOrganization(res.data.organization);
      setIsAuthenticated(true);
    } catch (err) {
      // Token invalid, clear it
      localStorage.removeItem('wp_access_token');
      localStorage.removeItem('wp_refresh_token');
      setUser(null);
      setOrganization(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthResponse = (data) => {
    localStorage.setItem('wp_access_token', data.access_token);
    localStorage.setItem('wp_refresh_token', data.refresh_token);
    setUser(data.user);
    setOrganization(data.organization);
    setIsAuthenticated(true);
    return data;
  };

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    return handleAuthResponse(res.data);
  };

  const signupIndividual = async (name, email, password) => {
    const res = await authApi.signupIndividual({ name, email, password });
    return handleAuthResponse(res.data);
  };

  const signupOrganization = async (adminName, adminEmail, password, orgName, orgSize) => {
    const res = await authApi.signupOrganization({
      admin_name: adminName,
      admin_email: adminEmail,
      password,
      org_name: orgName,
      org_size: orgSize,
    });
    return handleAuthResponse(res.data);
  };

  const joinOrg = async (name, email, password, inviteCode) => {
    const res = await authApi.joinOrg({
      name, email, password, invite_code: inviteCode,
    });
    return handleAuthResponse(res.data);
  };

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('wp_refresh_token');
    try {
      if (refreshToken) await authApi.logout({ refresh_token: refreshToken });
    } catch (e) { /* ignore */ }
    localStorage.removeItem('wp_access_token');
    localStorage.removeItem('wp_refresh_token');
    setUser(null);
    setOrganization(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    organization,
    isAuthenticated,
    loading,
    login,
    signupIndividual,
    signupOrganization,
    joinOrg,
    logout,
    refreshUser: fetchMe,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
