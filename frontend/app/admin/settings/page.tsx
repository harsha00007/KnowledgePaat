"use client";

import React, { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { useTheme } from '@/context/ThemeContext';
import { 
  Palette, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { 
    isFeatureEnabled, 
    setThemeFeatureEnabled, 
    theme, 
    toggleTheme, 
    isLoading 
  } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleToggleFeature = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const nextState = !isFeatureEnabled;
      const res = await setThemeFeatureEnabled(nextState);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: nextState
            ? 'Theme Support enabled! Users can now switch between Light and Dark themes.'
            : 'Theme Support disabled! Light Theme is now enforced globally across GradZenX.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to update platform settings. Ensure you have administrator permissions.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">

        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            System Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage global platform configuration, feature flags, and appearance defaults.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-[var(--radius-lg)] border flex items-start gap-3 animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            )}
            <div className="text-sm font-medium">{feedback.message}</div>
          </div>
        )}

        {/* SECTION: APPEARANCE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--color-brand-500)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Appearance
            </h2>
          </div>

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
                      Allow users to switch between Light and Dark appearance across GradZenX.
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                  {isLoading ? (
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
                  isLoading={isSaving || isLoading}
                  className="shrink-0"
                >
                  {isFeatureEnabled ? 'Turn OFF Theme Support' : 'Turn ON Theme Support'}
                </Button>
              </div>

              {/* Theme Preview Section (Visible when enabled) */}
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

      </div>
    </AdminLayout>
  );
}
