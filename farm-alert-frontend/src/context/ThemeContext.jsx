import { createContext, useContext, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// ThemeContext — global dark / light mode state
// Persists to localStorage; applies 'dark' class to <html>.
// ---------------------------------------------------------------------------
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Read saved preference; default to light mode if not set
    const saved = localStorage.getItem('farmalert-theme-v2');
    if (saved) return saved === 'dark';
    // Default to light mode instead of system preference
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('farmalert-theme-v2', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Convenience hook
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
