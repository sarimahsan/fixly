import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('fixly.token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    let mounted = true;
    if (token) {
      api.getMe(token).then((data) => {
        if (mounted) {
          setUser(data);
          setLoading(false);
        }
      }).catch(() => {
        if (mounted) {
          setToken('');
          setUser(null);
          localStorage.removeItem('fixly.token');
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [token]);

  const login = ({ token: nextToken, user: nextUser }) => {
    setToken(nextToken || '');
    setUser(nextUser || null);
    if (nextToken) {
      localStorage.setItem('fixly.token', nextToken);
    } else {
      localStorage.removeItem('fixly.token');
    }
  };

  const logout = () => {
    login({ token: null, user: null });
  };

  const value = useMemo(() => ({ token, user, role: user?.role, isAdmin: user?.role === 'ADMIN', login, logout, loading }), [token, user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
