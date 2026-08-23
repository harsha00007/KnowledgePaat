"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  FeatureKey, 
  DEFAULT_FEATURE_FLAGS, 
  fetchFeatureFlags, 
  saveFeatureFlags, 
  isStudentModuleEnabled 
} from '@/lib/featureFlags';
import { createClient } from '@/utils/supabase/client';

export interface FeatureFlagContextType {
  flags: Record<FeatureKey, boolean>;
  isLoading: boolean;
  isFeatureEnabled: (key: FeatureKey) => boolean;
  isModuleEnabled: (key: FeatureKey) => boolean;
  isPortalEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  updateFlag: (key: FeatureKey, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  updateAllFlags: (newFlags: Partial<Record<FeatureKey, boolean>>) => Promise<{ success: boolean; error?: string }>;
  refreshFlags: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<FeatureKey, boolean>>(DEFAULT_FEATURE_FLAGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadFlags = useCallback(async () => {
    try {
      const data = await fetchFeatureFlags();
      setFlags(data.flags);
      setUpdatedAt(data.updatedAt || null);
      setUpdatedBy(data.updatedBy || null);
    } catch (err) {
      console.warn('Failed to load feature flags:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();

    // Listen for realtime changes on platform_settings
    const channel = supabase
      .channel('platform_settings_feature_flags')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_settings' },
        (payload: any) => {
          if (payload.new && payload.new.feature_flags) {
            setFlags(prev => ({
              ...prev,
              ...payload.new.feature_flags,
            }));
            if (payload.new.updated_at) setUpdatedAt(payload.new.updated_at);
            if (payload.new.updated_by) setUpdatedBy(payload.new.updated_by);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFlags, supabase]);

  const isFeatureEnabled = useCallback((key: FeatureKey): boolean => {
    return flags[key] ?? DEFAULT_FEATURE_FLAGS[key] ?? true;
  }, [flags]);

  const isModuleEnabled = useCallback((key: FeatureKey): boolean => {
    return isStudentModuleEnabled(flags, key);
  }, [flags]);

  const isPortalEnabled = useMemo(() => {
    return flags.student_portal ?? true;
  }, [flags.student_portal]);

  const updateFlag = useCallback(async (key: FeatureKey, enabled: boolean) => {
    const updated = { ...flags, [key]: enabled };
    setFlags(updated);
    const res = await saveFeatureFlags(updated);
    if (!res.success) {
      // Revert on error
      setFlags(flags);
    } else {
      setUpdatedAt(new Date().toISOString());
    }
    return res;
  }, [flags]);

  const updateAllFlags = useCallback(async (newFlags: Partial<Record<FeatureKey, boolean>>) => {
    const updated = { ...flags, ...newFlags };
    setFlags(updated);
    const res = await saveFeatureFlags(updated);
    if (!res.success) {
      setFlags(flags);
    } else {
      setUpdatedAt(new Date().toISOString());
    }
    return res;
  }, [flags]);

  const value = useMemo(() => ({
    flags,
    isLoading,
    isFeatureEnabled,
    isModuleEnabled,
    isPortalEnabled,
    updatedAt,
    updatedBy,
    updateFlag,
    updateAllFlags,
    refreshFlags: loadFlags,
  }), [
    flags,
    isLoading,
    isFeatureEnabled,
    isModuleEnabled,
    isPortalEnabled,
    updatedAt,
    updatedBy,
    updateFlag,
    updateAllFlags,
    loadFlags,
  ]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}
