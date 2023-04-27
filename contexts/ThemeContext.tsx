import React, { createContext, FC, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from 'styles/theme';
import useAnalytics from 'hooks/useAnalytics';

type ContextValues = {
  theme: 'light' | 'dark';
  changeTheme: () => void;
};

const defaultValues: ContextValues = {
  theme: 'light',
  changeTheme: () => undefined,
};

const ThemeContext = createContext(defaultValues);

export const ThemeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { setData } = useAnalytics();

  const updateTheme = useCallback(
    (newTheme: 'light' | 'dark') => {
      setTheme(newTheme);
      void setData({ theme: newTheme });
    },
    [setData],
  );

  useEffect(() => {
    const storageThemeRaw = window?.localStorage?.getItem('theme');
    if (storageThemeRaw) {
      const storageTheme = storageThemeRaw && JSON.parse(storageThemeRaw);

      if (storageTheme && (storageTheme === 'light' || storageTheme === 'dark')) {
        document.body.dataset.theme = storageTheme;
        updateTheme(storageTheme);
      }
    } else {
      const colorScheme = window?.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      updateTheme(colorScheme);
      if (window?.localStorage) {
        window.localStorage.setItem('theme', JSON.stringify(colorScheme));
      }
    }
  }, [updateTheme]);

  const changeTheme = useCallback(() => {
    const target = theme === 'light' ? 'dark' : 'light';
    updateTheme(target);
    sessionStorage.setItem('theme', JSON.stringify(target));
  }, [theme, updateTheme]);

  useEffect(() => {
    if (document?.body?.dataset?.theme && document?.body?.dataset?.theme !== theme) {
      document.body.dataset.theme = theme;
    }
  }, [theme, changeTheme]);

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      <MUIThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>{children}</MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

export function useCustomTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('Using ThemeContext outside of provider');
  }
  return ctx;
}

export default ThemeContext;
