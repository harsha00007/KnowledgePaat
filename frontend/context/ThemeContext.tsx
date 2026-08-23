"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  /** Global Admin flag: whether Theme Support is enabled across the platform */
  isFeatureEnabled: boolean;
  /** The actively applied theme. Strictly 'light' if isFeatureEnabled is false */
  theme: Theme;
  /** The user's saved preference (persists, but only applied if isFeatureEnabled is true) */
  userPreference: Theme;
  /** Set user theme preference */
  setTheme: (newTheme: Theme) => void;
  /** Toggle between light and dark (only active when isFeatureEnabled is true) */
  toggleTheme: () => void;
  /** Admin function to toggle global Theme Support */
  setThemeFeatureEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  /** Loading state while initial platform settings are fetched */
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'knowledgepaat_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean>(false);
  const [userPreference, setUserPreference] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const supabase = useMemo(() => createClient(), []);

  // 1. Initial Load: Read DB platform_settings and local storage
  useEffect(() => {
    let isMounted = true;

    const initTheme = async () => {
      try {
        // Read local storage preference
        const savedPref = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (savedPref === 'dark' || savedPref === 'light') {
          if (isMounted) setUserPreference(savedPref);
        }

        // Fetch global setting from Supabase
        const { data, error } = await supabase
          .from('platform_settings')
          .select('theme_feature_enabled')
          .eq('id', 'global')
          .maybeSingle();

        if (isMounted) {
          if (!error && data && typeof data.theme_feature_enabled === 'boolean') {
            setIsFeatureEnabled(data.theme_feature_enabled);
          } else {
            // Default fallback if table or row not yet initialized
            setIsFeatureEnabled(false);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Could not load platform theme settings:', err);
        if (isMounted) {
          setIsFeatureEnabled(false);
          setIsLoading(false);
        }
      }
    };

    initTheme();

    // 2. Realtime listener for platform_settings changes
    const channel = supabase
      .channel('platform_settings_theme_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_settings' },
        (payload: any) => {
          if (payload.new && typeof payload.new.theme_feature_enabled === 'boolean') {
            setIsFeatureEnabled(payload.new.theme_feature_enabled);
          }
        }
      )
      .subscribe();

    // 3. Multi-tab sync for user preference
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setUserPreference(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorage);
    };
  }, [supabase]);

  // 4. Calculate effective theme: Strictly 'light' if feature is disabled
  const effectiveTheme: Theme = isFeatureEnabled && userPreference === 'dark' ? 'dark' : 'light';

  // 5. Apply effective theme to DOM
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [effectiveTheme]);

  // 6. User actions
  const setTheme = useCallback((newTheme: Theme) => {
    setUserPreference(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage errors (e.g. private browsing)
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  }, [effectiveTheme, setTheme]);

  // 7. Admin action to enable / disable theme feature
  const setThemeFeatureEnabled = useCallback(async (enabled: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          id: 'global',
          theme_feature_enabled: enabled,
          updated_by: user?.id || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error updating platform theme settings:', error);
        return { success: false, error: error.message };
      }

      setIsFeatureEnabled(enabled);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  }, [supabase]);

  const value = useMemo<ThemeContextType>(() => ({
    isFeatureEnabled,
    theme: effectiveTheme,
    userPreference,
    setTheme,
    toggleTheme,
    setThemeFeatureEnabled,
    isLoading,
  }), [isFeatureEnabled, effectiveTheme, userPreference, setTheme, toggleTheme, setThemeFeatureEnabled, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
