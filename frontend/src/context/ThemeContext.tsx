import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('simplebank_theme') as Theme) || 'dark';
  });

  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('simplebank_theme', theme);

    if (theme === 'dark') {
      root.classList.add('dark');
      setIsDark(true);
    } else if (theme === 'light') {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        root.classList.add('dark');
        setIsDark(true);
      } else {
        root.classList.remove('dark');
        setIsDark(false);
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
