"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { useTheme } from '@/context/ThemeContext';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { createClient } from '@/utils/supabase/client';
import {
  FeatureKey,
  FeatureCategory,
  FEATURE_METADATA,
  DEFAULT_FEATURE_FLAGS,
  CATEGORY_LABELS,
} from '@/lib/featureFlags';
import {
  SocialLinksSettings,
  DEFAULT_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
  fetchSocialLinks,
  saveSocialLinks,
  validateSocialUrl,
} from '@/lib/socialLinks';
import { 
  Palette, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  Sparkles,
  RefreshCw,
  Share2,
  Save,
  RotateCcw,
  ExternalLink,
  Sliders,
  Lock,
  Unlock,
  Check,
  X,
  AlertTriangle,
  Clock,
  Layers,
  Power,
  Globe,
  Briefcase,
  Bot,
  FileText,
  User,
  Zap,
  ShoppingBag,
  PackageCheck
} from 'lucide-react';

type TabKey = 'features' | 'appearance' | 'social';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('features');

  // Theme Context
  const { 
    isFeatureEnabled: isThemeEnabled, 
    setThemeFeatureEnabled, 
    theme, 
    toggleTheme, 
    isLoading: isThemeLoading 
  } = useTheme();

  // Feature Flag Context
  const {
    flags,
    isFeatureEnabled,
    updateFlag,
    updateAllFlags,
    isLoading: isFlagsLoading,
    updatedAt: flagsUpdatedAt,
    updatedBy: flagsUpdatedBy,
    refreshFlags
  } = useFeatureFlags();

  const supabase = createClient();

  // Theme settings state
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeFeedback, setThemeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Social settings state
  const [socialLinks, setSocialLinks] = useState<SocialLinksSettings>(DEFAULT_SOCIAL_LINKS);
  const [isLoadingSocial, setIsLoadingSocial] = useState(true);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [socialFeedback, setSocialFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Feature Flag UI State
  const [isSavingFlag, setIsSavingFlag] = useState<string | null>(null);
  const [flagFeedback, setFlagFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    featureKey: FeatureKey | null;
    targetState: boolean;
    featureName: string;
  }>({
    isOpen: false,
    featureKey: null,
    targetState: false,
    featureName: '',
  });

  // Load social settings on mount
  useEffect(() => {
    const loadSocials = async () => {
      setIsLoadingSocial(true);
      const links = await fetchSocialLinks();
      setSocialLinks(links);
      setIsLoadingSocial(false);
    };
    loadSocials();
  }, []);

  // Handle Feature Toggle Click
  const handleFeatureToggleClick = (featureKey: FeatureKey, currentEnabled: boolean, featureName: string) => {
    const targetState = !currentEnabled;
    // For disabling sensitive features or master switch, show confirmation modal
    if (!targetState) {
      setConfirmModal({
        isOpen: true,
        featureKey,
        targetState: false,
        featureName,
      });
    } else {
      executeFeatureToggle(featureKey, true);
    }
  };

  const executeFeatureToggle = async (featureKey: FeatureKey, enabled: boolean) => {
    setIsSavingFlag(featureKey);
    setFlagFeedback(null);
    try {
      const res = await updateFlag(featureKey, enabled);
      if (res.success) {
        setFlagFeedback({
          type: 'success',
          message: `${FEATURE_METADATA.find(f => f.key === featureKey)?.label || featureKey} is now ${enabled ? 'ENABLED (Active for Students)' : 'DISABLED (Locked / Coming Soon)'}.`,
        });
      } else {
        setFlagFeedback({
          type: 'error',
          message: res.error || 'Failed to update feature flag.',
        });
      }
    } catch (err: any) {
      setFlagFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSavingFlag(null);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Handle Bulk Feature Actions
  const handleEnableAllFeatures = async () => {
    setIsSavingFlag('bulk');
    setFlagFeedback(null);
    try {
      const allEnabled = Object.keys(DEFAULT_FEATURE_FLAGS).reduce((acc, k) => {
        acc[k as FeatureKey] = true;
        return acc;
      }, {} as Record<FeatureKey, boolean>);

      const res = await updateAllFlags(allEnabled);
      if (res.success) {
        setFlagFeedback({
          type: 'success',
          message: 'All Student Portal features and public gateways have been ENABLED successfully.',
        });
      } else {
        setFlagFeedback({
          type: 'error',
          message: res.error || 'Failed to enable all features.',
        });
      }
    } catch (err: any) {
      setFlagFeedback({
        type: 'error',
        message: err.message || 'An error occurred.',
      });
    } finally {
      setIsSavingFlag(null);
    }
  };

  const handleResetFeatureDefaults = async () => {
    setIsSavingFlag('bulk');
    setFlagFeedback(null);
    try {
      const res = await updateAllFlags(DEFAULT_FEATURE_FLAGS);
      if (res.success) {
        setFlagFeedback({
          type: 'success',
          message: 'Feature flags have been reset to factory defaults.',
        });
      } else {
        setFlagFeedback({
          type: 'error',
          message: res.error || 'Failed to reset feature flags.',
        });
      }
    } catch (err: any) {
      setFlagFeedback({
        type: 'error',
        message: err.message || 'An error occurred.',
      });
    } finally {
      setIsSavingFlag(null);
    }
  };

  // Handle Theme Toggle
  const handleToggleFeature = async () => {
    setIsSavingTheme(true);
    setThemeFeedback(null);
    try {
      const nextState = !isThemeEnabled;
      const res = await setThemeFeatureEnabled(nextState);
      if (res.success) {
        setThemeFeedback({
          type: 'success',
          message: nextState
            ? 'Theme Support enabled! Users can now switch between Light and Dark themes.'
            : 'Theme Support disabled! Light Theme is now enforced globally across KnowledgePaat.',
        });
      } else {
        setThemeFeedback({
          type: 'error',
          message: res.error || 'Failed to update platform settings.',
        });
      }
    } catch (err: any) {
      setThemeFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSavingTheme(false);
    }
  };

  // Handle Social Settings Change
  const handleSocialUrlChange = (key: keyof SocialLinksSettings, url: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        url,
      },
    }));
  };

  const handleSocialToggleChange = (key: keyof SocialLinksSettings, enabled: boolean) => {
    setSocialLinks(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled,
      },
    }));
  };

  // Handle Save Social Links
  const handleSaveSocialLinks = async () => {
    setSocialFeedback(null);

    // Validate enabled platforms
    for (const platform of SOCIAL_PLATFORMS) {
      const config = socialLinks[platform.key];
      if (config.enabled && config.url.trim()) {
        const val = validateSocialUrl(config.url);
        if (!val.isValid) {
          setSocialFeedback({
            type: 'error',
            message: `Invalid URL for ${platform.label}: ${val.error}`,
          });
          return;
        }
      }
    }

    setIsSavingSocial(true);
    try {
      const res = await saveSocialLinks(socialLinks);
      if (res.success) {
        setSocialFeedback({
          type: 'success',
          message: 'Social media links updated successfully.',
        });
      } else {
        setSocialFeedback({
          type: 'error',
          message: 'Unable to save social media links.',
        });
      }
    } catch {
      setSocialFeedback({
        type: 'error',
        message: 'Unable to save social media links.',
      });
    } finally {
      setIsSavingSocial(false);
    }
  };

  const handleResetSocialLinks = async () => {
    setIsLoadingSocial(true);
    setSocialFeedback(null);
    const links = await fetchSocialLinks();
    setSocialLinks(links);
    setIsLoadingSocial(false);
  };

  const categories: FeatureCategory[] = ['core', 'tools', 'prep', 'store', 'auth'];
  const masterPortalEnabled = isFeatureEnabled('student_portal');

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl pb-16">

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-blue-200 font-display">
              Management Control Center
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] font-display">
            System & Feature Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Configure live Student Portal modules, rollout gates, public sign-up access, appearance, and social links.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-px">
          <button
            onClick={() => setActiveTab('features')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-[var(--radius-md)] border-b-2 transition-colors ${
              activeTab === 'features'
                ? 'border-[var(--color-brand-600)] text-[var(--color-brand-600)] bg-white font-bold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Student Portal Controls
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-[var(--radius-md)] border-b-2 transition-colors ${
              activeTab === 'appearance'
                ? 'border-[var(--color-brand-600)] text-[var(--color-brand-600)] bg-white font-bold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-slate-50'
            }`}
          >
            <Palette className="w-4 h-4" />
            Appearance & Theme
          </button>

          <button
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-[var(--radius-md)] border-b-2 transition-colors ${
              activeTab === 'social'
                ? 'border-[var(--color-brand-600)] text-[var(--color-brand-600)] bg-white font-bold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-slate-50'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Social Media Links
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: STUDENT PORTAL CONTROLS & FEATURE MANAGEMENT            */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'features' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Feedback Banner */}
            {flagFeedback && (
              <div
                className={`p-4 rounded-[var(--radius-lg)] border flex items-start gap-3 ${
                  flagFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {flagFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                )}
                <div className="text-sm font-medium">{flagFeedback.message}</div>
              </div>
            )}

            {/* MASTER PORTAL SWITCH BANNER */}
            <div className={`p-6 rounded-[var(--radius-2xl)] border transition-all ${
              masterPortalEnabled
                ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-blue-800 shadow-md'
                : 'bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white border-amber-800/80 shadow-md'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-display ${
                      masterPortalEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    }`}>
                      <Power className="w-3 h-3" />
                      {masterPortalEnabled ? 'Student Portal Active' : 'Student Portal Paused'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Master Control Switch
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold font-display tracking-tight text-white">
                    Student Portal Master Access
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {masterPortalEnabled 
                      ? 'The Student Portal is live. Students can access active modules according to individual feature toggles below.'
                      : 'The Student Portal is globally locked. All student routes show the Coming Soon screen regardless of individual module toggles.'}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => handleFeatureToggleClick('student_portal', masterPortalEnabled, 'Student Portal Master Access')}
                    disabled={isSavingFlag === 'student_portal'}
                    className={`px-5 py-2.5 rounded-[var(--radius-lg)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg focus-ring ${
                      masterPortalEnabled
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isSavingFlag === 'student_portal' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : masterPortalEnabled ? (
                      <>
                        <Lock className="w-4 h-4" /> Suspend Student Portal
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" /> Enable Student Portal
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
                <Shield className="w-4 h-4 text-[var(--color-brand-600)]" />
                <span>
                  Admin features and <strong>Admin Login</strong> always remain 100% accessible.
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnableAllFeatures}
                  isLoading={isSavingFlag === 'bulk'}
                  className="text-xs font-semibold"
                >
                  <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Enable All Modules
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFeatureDefaults}
                  isLoading={isSavingFlag === 'bulk'}
                  className="text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-500" /> Reset to Defaults
                </Button>
              </div>
            </div>

            {/* CATEGORIZED FEATURE TOGGLE LIST */}
            {categories.map((category) => {
              const categoryFeatures = FEATURE_METADATA.filter(
                (f) => f.category === category && f.key !== 'student_portal'
              );

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] font-display flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-brand-500)]" />
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <span className="text-[11px] text-[var(--color-text-tertiary)] font-medium">
                      {categoryFeatures.filter(f => isFeatureEnabled(f.key)).length} of {categoryFeatures.length} Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {categoryFeatures.map((feat) => {
                      const enabled = isFeatureEnabled(feat.key);
                      const isOperating = !masterPortalEnabled && feat.category !== 'auth';

                      return (
                        <div
                          key={feat.key}
                          className={`p-4 sm:p-5 rounded-[var(--radius-xl)] border transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            enabled
                              ? 'border-[var(--color-border)] shadow-xs hover:border-slate-300'
                              : 'border-amber-200/80 bg-amber-50/20 shadow-none'
                          }`}
                        >
                          {/* Feature Info */}
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                                {feat.label}
                              </span>

                              {/* Status Badge */}
                              {enabled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                  Coming Soon
                                </span>
                              )}

                              <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                {feat.routePrefix}
                              </span>

                              {isOperating && (
                                <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/70 px-1.5 py-0.5 rounded">
                                  Suspended by Master Portal Switch
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                              {feat.description}
                            </p>
                          </div>

                          {/* Toggle Action */}
                          <div className="shrink-0 flex items-center gap-3 self-end sm:self-center">
                            <button
                              onClick={() => handleFeatureToggleClick(feat.key, enabled, feat.label)}
                              disabled={isSavingFlag === feat.key}
                              className={`px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-bold flex items-center gap-1.5 transition-colors focus-ring ${
                                enabled
                                  ? 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                              }`}
                            >
                              {isSavingFlag === feat.key ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : enabled ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" /> Disable
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" /> Enable
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* AUDIT LOG FOOTER */}
            <div className="p-4 bg-slate-50 border border-[var(--color-border)] rounded-[var(--radius-xl)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary)]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Last Configuration Sync:{' '}
                  <strong>{flagsUpdatedAt ? new Date(flagsUpdatedAt).toLocaleString() : 'System Default'}</strong>
                </span>
              </div>
              <div>
                <span>Synchronized By: <strong>{flagsUpdatedBy || 'System Administrator'}</strong></span>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: APPEARANCE & THEME SETTINGS                             */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {themeFeedback && (
              <div
                className={`p-4 rounded-[var(--radius-lg)] border flex items-start gap-3 animate-in fade-in duration-200 ${
                  themeFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {themeFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                )}
                <div className="text-sm font-medium">{themeFeedback.message}</div>
              </div>
            )}

            <Card className="overflow-hidden border border-[var(--color-border)] shadow-xs">
              <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Theme Support</CardTitle>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                        Allow users to switch between Light and Dark appearance across KnowledgePaat.
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isThemeLoading ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold bg-slate-100 text-slate-600">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
                      </span>
                    ) : isThemeEnabled ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Theme Support Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Theme Support Disabled
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                
                {/* Explanation Banner */}
                <div className="rounded-[var(--radius-md)] p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
                    <Shield className="w-4 h-4 text-[var(--color-brand-500)]" />
                    Admin Source of Truth
                  </div>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">
                    {isThemeEnabled ? (
                      <>
                        <strong>Currently Active:</strong> Users can choose Light or Dark Theme. The theme toggle is visible in navigation headers.
                      </>
                    ) : (
                      <>
                        <strong>Currently Inactive:</strong> Users will see the default Light Theme. Theme toggles are hidden globally.
                      </>
                    )}
                  </p>
                </div>

                {/* Primary Action Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {isThemeEnabled ? 'Disable Global Theme Support' : 'Enable Global Theme Support'}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {isThemeEnabled
                        ? 'Enforce Light theme globally and hide all user theme controls.'
                        : 'Allow all users to customize and toggle their theme preference.'}
                    </p>
                  </div>

                  <Button
                    variant={isThemeEnabled ? 'outline' : 'primary'}
                    size="sm"
                    onClick={handleToggleFeature}
                    isLoading={isSavingTheme}
                    className="shrink-0 font-semibold"
                  >
                    {isThemeEnabled ? (
                      <>
                        <Sun className="w-4 h-4 mr-1.5 text-amber-500" /> Enforce Light Only
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 mr-1.5" /> Enable Theme Support
                      </>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: SOCIAL MEDIA LINKS                                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'social' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {socialFeedback && (
              <div
                className={`p-4 rounded-[var(--radius-lg)] border flex items-start gap-3 animate-in fade-in duration-200 ${
                  socialFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {socialFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                )}
                <div className="text-sm font-medium">{socialFeedback.message}</div>
              </div>
            )}

            <Card className="overflow-hidden border border-[var(--color-border)] shadow-xs">
              <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center shrink-0 mt-0.5">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Public Footer Social Media Links</CardTitle>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                        Configure official social channel links displayed in the website footer.
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                
                {isLoadingSocial ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-brand-600)]" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const config = socialLinks[platform.key];
                      return (
                        <div
                          key={platform.key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/40"
                        >
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <input
                              type="checkbox"
                              id={`toggle-${platform.key}`}
                              checked={config.enabled}
                              onChange={(e) => handleSocialToggleChange(platform.key, e.target.checked)}
                              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]"
                            />
                            <label
                              htmlFor={`toggle-${platform.key}`}
                              className="text-xs font-bold text-[var(--color-text-primary)] cursor-pointer"
                            >
                              {platform.label}
                            </label>
                          </div>

                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={config.url}
                              disabled={!config.enabled}
                              onChange={(e) => handleSocialUrlChange(platform.key, e.target.value)}
                              placeholder={platform.placeholder}
                              className={`w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${
                                config.enabled
                                  ? 'bg-white border-[var(--color-border)] text-[var(--color-text-primary)]'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetSocialLinks}
                        disabled={isSavingSocial}
                        className="text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Changes
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveSocialLinks}
                        isLoading={isSavingSocial}
                        className="text-xs font-semibold shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" /> Save Social Links
                      </Button>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        )}

        {/* CONFIRMATION MODAL FOR DISABLING SENSITIVE FEATURES */}
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          title={`Disable ${confirmModal.featureName}?`}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] text-xs text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Students will immediately see a <strong>Coming Soon</strong> screen when visiting this section. Existing student data and records will remain completely intact.
              </p>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)]">
              You can re-enable this module at any time from this dashboard without any code changes.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirmModal.featureKey) {
                    executeFeatureToggle(confirmModal.featureKey, false);
                  }
                }}
                isLoading={isSavingFlag === confirmModal.featureKey}
                className="text-xs font-semibold"
              >
                Confirm & Disable Feature
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </AdminLayout>
  );
}
