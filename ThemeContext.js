import { createContext } from 'react';

// anti crash (default light mode fallback just in case hihi)
export const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
  theme: {
    bg: '#f5f5f5',
    card: '#fff',
    text: '#111111',
    subText: '#666666',
    border: '#eeeeee',
  }
});