import React, { useEffect, useMemo, useState } from 'react';
import { THEME_OPTIONS, ThemeContext } from './theme-context';

const THEME_STORAGE_KEY = 'blood-bank-theme';

const getStoredTheme = () => {
  if (typeof window === 'undefined') return 'crimson';
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme && THEME_OPTIONS[storedTheme] ? storedTheme : 'crimson';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      themeOptions: Object.values(THEME_OPTIONS),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
