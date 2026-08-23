"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useTheme } from '@/context/ThemeContext';
import { createClient } from '@/utils/supabase/client';
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
  ExternalLink
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { 
    isFeatureEnabled, 
    setThemeFeatureEnabled, 
    theme, 
    toggleTheme, 
    isLoading: isThemeLoading 
  } = useTheme();

  const supabase = createClient();

  // Theme settings state
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeFeedback, setThemeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Social settings state
  const [socialLinks, setSocialLinks] = useState<SocialLinksSettings>(DEFAULT_SOCIAL_LINKS);
  const [isLoadingSocial, setIsLoadingSocial] = useState(true);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [socialFeedback, setSocialFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  // Handle Theme Toggle
  const handleToggleFeature = async () => {
    setIsSavingTheme(true);
    setThemeFeedback(null);
    try {
      const nextState = !isFeatureEnabled;
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
          message: res.error || 'Failed to update platform settings. Ensure you have administrator permissions.',
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

  // Handle Reset Social Links
  const handleResetSocialLinks = async () => {
    setIsLoadingSocial(true);
    setSocialFeedback(null);
    const links = await fetchSocialLinks();
    setSocialLinks(links);
    setIsLoadingSocial(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">

        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] font-display">
            System Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage global platform configuration, appearance defaults, and footer social links.
          </p>
        </div>

        {/* ── SECTION 1: APPEARANCE ───────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--color-brand-500)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] font-display">
              Appearance
            </h2>
          </div>

          {themeFeedback && (
            <div
              className={`p-4 rounded-[var(--radius-lg)] border flex items-start gap-3 animate-in fade-in duration-200 ${
                themeFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              {themeFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              )}
              <div className="text-sm font-medium">{themeFeedback.message}</div>
            </div>
          )}

          <Card className="overflow-hidden border border-[var(--color-border)] shadow-xs">
            <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-100)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] flex items-center justify-center shrink-0 mt-0.5">
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  ) : isFeatureEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Theme Support Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
                  {isFeatureEnabled ? (
                    <>
                      <strong>Currently Active:</strong> Users can choose Light or Dark Theme. The theme toggle is visible in the navigation headers of Public, Student, and Admin portals.
                    </>
                  ) : (
                    <>
                      <strong>Currently Inactive:</strong> Users will see the default Light Theme. Theme toggles are hidden globally, and any client-side overrides or stored preferences are strictly bypassed in favor of Light Theme.
                    </>
                  )}
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {isFeatureEnabled ? 'Disable Theme Support' : 'Enable Theme Support'}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                    {isFeatureEnabled
                      ? 'Reverts all users to Light Theme and hides theme switches.'
                      : 'Unlocks Dark Theme option for all students, visitors, and admins.'}
                  </p>
                </div>

                <Button
                  variant={isFeatureEnabled ? 'danger' : 'primary'}
                  size="md"
                  onClick={handleToggleFeature}
                  isLoading={isSavingTheme || isThemeLoading}
                  className="shrink-0"
                >
                  {isFeatureEnabled ? 'Turn OFF Theme Support' : 'Turn ON Theme Support'}
                </Button>
              </div>

              {/* Theme Preview Section */}
              {isFeatureEnabled && (
                <div className="mt-6 pt-6 border-t border-[var(--color-border)] space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        Admin Theme Preview
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Current active theme: <span className="font-bold uppercase text-[var(--color-brand-500)]">{theme}</span>
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={toggleTheme}
                      className="gap-2"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-4 h-4 text-amber-500" />
                          Switch to Light
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 text-slate-700" />
                          Switch to Dark
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* ── SECTION 2: SOCIAL MEDIA & FOOTER LINKS ─────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#00C2CB]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] font-display">
              Footer & Social Media Links
            </h2>
          </div>

          {socialFeedback && (
            <div
              className={`p-4 rounded-[var(--radius-lg)] border flex items-start gap-3 animate-in fade-in duration-200 ${
                socialFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              {socialFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              )}
              <div className="text-sm font-medium">{socialFeedback.message}</div>
            </div>
          )}

          <Card className="overflow-hidden border border-[var(--color-border)] shadow-xs">
            <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold">Social Media Profiles</CardTitle>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Configure profile URLs and toggle visibility for platforms displayed in the public footer.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResetSocialLinks}
                    disabled={isLoadingSocial || isSavingSocial}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveSocialLinks}
                    isLoading={isSavingSocial}
                    disabled={isLoadingSocial}
                    className="gap-1.5 text-xs shadow-brand font-bold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Social Links
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {isLoadingSocial ? (
                <div className="flex items-center justify-center py-10 text-slate-500 gap-2 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                  Loading social media settings...
                </div>
              ) : (
                <div className="space-y-4">
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const config = socialLinks[platform.key];
                    return (
                      <div
                        key={platform.key}
                        className={`p-4 rounded-xl border transition-all ${
                          config.enabled
                            ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 shadow-2xs'
                            : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                          
                          {/* Platform Header & Toggle */}
                          <div className="flex items-center justify-between sm:justify-start gap-3 sm:w-48 shrink-0">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(e) => handleSocialToggleChange(platform.key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]"></div>
                            </label>

                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[var(--color-text-primary)] font-display">
                                {platform.label}
                              </span>
                              {config.enabled && (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-[#2563EB] border border-blue-200">
                                  Live
                                </span>
                              )}
                            </div>
                          </div>

                          {/* URL Input */}
                          <div className="flex-1">
                            <Input
                              type="url"
                              placeholder={platform.placeholder}
                              value={config.url}
                              onChange={(e) => handleSocialUrlChange(platform.key, e.target.value)}
                              className="text-xs sm:text-sm"
                            />
                          </div>

                          {/* Preview Link */}
                          {config.url.trim() && (
                            <a
                              href={config.url.startsWith('http') ? config.url : `https://${config.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-2 text-slate-400 hover:text-[#2563EB] transition-colors rounded-lg hover:bg-slate-100"
                              title={`Preview ${platform.label} link`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Save button footer bar */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSaveSocialLinks}
                      isLoading={isSavingSocial}
                      className="shadow-brand font-bold gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Social Links
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </AdminLayout>
  );
}
