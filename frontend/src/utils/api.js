const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const AUTH_TOKEN_STORAGE_KEY = 'blood-donation-token';
export const USER_STORAGE_KEY = 'blood-donation-user';

export const getStoredToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
};

export const setStoredToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

export const setStoredUser = (user) => {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }
  window.localStorage.removeItem(USER_STORAGE_KEY);
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const apiRequest = async (path, options = {}) => {
  const token = options.token ?? getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({
    success: false,
    message: 'Invalid server response.',
  }));

  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || 'Request failed.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export { API_BASE_URL };
