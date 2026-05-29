import React, { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import {
  apiRequest,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '../utils/api';

const normalizeRole = (role) => {
  if (role === 'Administrator') return 'Administrator';
  if (role === 'Doctor') return 'Doctor';
  return 'Staff';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [users, setUsers] = useState([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const syncUser = useCallback((nextUser) => {
    setUser(nextUser);
    setStoredUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    syncUser(null);
    setStoredToken('');
    setUsers([]);
  }, [syncUser]);

  const loadUsers = useCallback(async (activeUser) => {
    if (activeUser?.role !== 'Administrator') {
      setUsers([]);
      return;
    }

    const result = await apiRequest('/users');
    setUsers(result.data || []);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getStoredToken();
      const fallbackUser = getStoredUser();

      if (!token) {
        setIsAuthReady(true);
        return;
      }

      try {
        const response = await apiRequest('/auth/me', { token });
        const nextUser = response.user || fallbackUser;
        syncUser(nextUser);
        await loadUsers(nextUser);
      } catch {
        clearSession();
      } finally {
        setIsAuthReady(true);
      }
    };

    initializeAuth();
  }, [clearSession, loadUsers, syncUser]);

  const login = async (username, password, selectedRole) => {
    try {
      const normalizedUsername = username.trim().toLowerCase();
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: normalizedUsername,
          password,
          role: selectedRole ? normalizeRole(selectedRole) : undefined,
        }),
        token: '',
      });

      setStoredToken(result.token);
      syncUser(result.user);
      await loadUsers(result.user);

      return { success: true, role: result.user.role, message: '' };
    } catch (error) {
      return { success: false, role: null, message: error.message || 'Login failed.' };
    }
  };

  const register = async ({ username, password, role }) => {
    try {
      const normalizedUsername = username.trim().toLowerCase();
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: normalizedUsername,
          password,
          role: normalizeRole(role),
        }),
        token: '',
      });

      return { success: true, message: result.message || 'Account created successfully.' };
    } catch (error) {
      return { success: false, message: error.message || 'Registration failed.' };
    }
  };

  const forgotPassword = async ({ username, password }) => {
    try {
      const normalizedUsername = username.trim().toLowerCase();
      const result = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          username: normalizedUsername,
          password,
        }),
        token: '',
      });

      return { success: true, message: result.message || 'Password reset successfully.' };
    } catch (error) {
      return { success: false, message: error.message || 'Unable to reset password.' };
    }
  };

  const updateUserRole = async (username, role) => {
    const normalizedUsername = username.trim().toLowerCase();
    const safeRole = normalizeRole(role);

    const result = await apiRequest(`/users/${normalizedUsername}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: safeRole }),
    });

    setUsers((prev) =>
      prev.map((account) =>
        account.username === normalizedUsername ? result.data : account
      )
    );

    if (user?.username === normalizedUsername) {
      syncUser({ ...user, role: result.data.role });
    }
  };

  const createUser = async ({ username, password, role }) => {
    const normalizedUsername = username.trim().toLowerCase();
    const safeRole = normalizeRole(role);

    const result = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: normalizedUsername,
        password,
        role: safeRole,
      }),
    });

    setUsers((prev) => [...prev, result.data].sort((a, b) => a.id - b.id));
    return result.data;
  };

  const resetUserPassword = async (username, password) => {
    const normalizedUsername = username.trim().toLowerCase();

    await apiRequest(`/users/${normalizedUsername}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    });
  };

  const removeUser = async (username) => {
    const normalizedUsername = username.trim().toLowerCase();

    await apiRequest(`/users/${normalizedUsername}`, {
      method: 'DELETE',
    });

    setUsers((prev) => prev.filter((account) => account.username !== normalizedUsername));
    if (user?.username === normalizedUsername) {
      clearSession();
    }
    return true;
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        isAuthReady,
        login,
        register,
        forgotPassword,
        createUser,
        updateUserRole,
        resetUserPassword,
        removeUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
