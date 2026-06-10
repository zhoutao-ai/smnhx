'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'frost' | 'jade';

const THEME_ORDER: Theme[] = ['dark', 'light', 'frost', 'jade'];
const THEME_LABELS: Record<Theme, string> = {
  dark: '暗色',
  light: '亮色',
  frost: '霜蓝',
  jade: '墨玉',
};

const ALL_THEMES: Theme[] = ['dark', 'light', 'frost', 'jade'];

function isValidTheme(t: string | null): t is Theme {
  return ALL_THEMES.includes(t as Theme);
}

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  themeLabels: Record<Theme, string>;
  themeOrder: Theme[];
}>({ theme: 'dark', toggle: () => {}, themeLabels: THEME_LABELS, themeOrder: THEME_ORDER });

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (isValidTheme(attr)) return attr;
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('ziwei-theme');
    if (isValidTheme(saved)) setTheme(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('ziwei-theme', theme);
  }, [theme, mounted]);

  const toggle = () => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    setTheme(t => {
      const idx = THEME_ORDER.indexOf(t);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
    setTimeout(() => root.classList.remove('theme-transitioning'), 420);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, themeLabels: THEME_LABELS, themeOrder: THEME_ORDER }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
