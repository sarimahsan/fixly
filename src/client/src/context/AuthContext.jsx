import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('fixly.token') || '');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('fixly.user') || '{"role":"ADMIN","email":"admin@fixly.local"}'));

  const login = ({ token: nextToken, user: nextUser }) => {
    setToken(nextToken || '');
    setUser(nextUser || null);
    localStorage.setItem('fixly.token', nextToken || '');
    localStorage.setItem('fixly.user', JSON.stringify(nextUser || null));
  };

  const value = useMemo(() => ({ token, user, role: user?.role, isAdmin: user?.role === 'ADMIN', login }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
