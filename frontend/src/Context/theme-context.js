import { createContext, useContext } from 'react';

export const ThemeContext = createContext();

export const THEME_OPTIONS = {
  crimson: {
    id: 'crimson',
    name: 'Crimson',
    description: 'Classic hospital red theme.',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue clinical theme.',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    description: 'Fresh green care theme.',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm amber administration theme.',
  },
};

export const useTheme = () => useContext(ThemeContext);
