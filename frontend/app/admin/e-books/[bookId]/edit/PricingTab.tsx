"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Tag, 
  Percent, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  RefreshCw, 
  History, 
  Lock, 
  Sparkles,
  ArrowRight,
  BookOpen,
  Download
} from 'lucide-react';
import { Button } from '@/components/Button';
import { calculateSellingPrice, DiscountType, AuthoritativePricing } from '@/lib/ebook/pricing';
import { EBookEdition } from '@/types/ebook';

interface PricingTabProps {
  bookId: string;
  editions: EBookEdition[];
  activeEditionId: string;
  onEditionChange: (editionId: string) => void;
  onPricingSaved?: () => void;
}

export function PricingTab({
  bookId,
  editions,
  activeEditionId,
  onEditionChange,
  onPricingSaved,
}: PricingTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Authoritative server state
  const [serverPricing, setServerPricing] = useState<AuthoritativePricing | null>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  // Form states in Rupees (stored and submitted as paise)
  const [onlineOriginalRupees, setOnlineOriginalRupees] = useState<string>('49');
  const [onlineDiscountType, setOnlineDiscountType] = useState<DiscountType>('none');
  const [onlineDiscountValue, setOnlineDiscountValue] = useState<string>('0');

  const [downloadOriginalRupees, setDownloadOriginalRupees] = useState<string>('99');
  const [downloadDiscountType, setDownloadDiscountType] = useState<DiscountType>('none');
  const [downloadDiscountValue, setDownloadDiscountValue] = useState<string>('0');

  const [upgradeOriginalRupees, setUpgradeOriginalRupees] = useState<string>('50');
  const [upgradeDiscountType, setUpgradeDiscountType] = useState<DiscountType>('none');
  const [upgradeDiscountValue, setUpgradeDiscountValue] = useState<string>('0');

  const [changeReason, setChangeReason] = useState<string>('');

  // Fetch pricing from API
  const fetchPricing = async (editionIdToFetch?: string) => {
    const targetEditionId = editionIdToFetch || activeEditionId;
    if (!targetEditionId) return;

    setIsLoading(true);
    setConflictError(null);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}/pricing?editionId=${targetEditionId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load pricing.');
      }

      const p: AuthoritativePricing = data.pricing;
      setServerPricing(p);
      setAuditHistory(data.audit_history || []);

      // Populate form fields
      setOnlineOriginalRupees((p.online_original_price_paise / 100).toString());
      setOnlineDiscountType(p.online_discount_type || 'none');
      setOnlineDiscountValue(
        p.online_discount_type === 'percentage'
          ? (p.online_discount_value || 0).toString()
          : ((p.online_discount_value || 0) / 100).toString()
      );

      setDownloadOriginalRupees((p.download_original_price_paise / 100).toString());
      setDownloadDiscountType(p.download_discount_type || 'none');
      setDownloadDiscountValue(
        p.download_discount_type === 'percentage'
          ? (p.download_discount_value || 0).toString()
          : ((p.download_discount_value || 0) / 100).toString()
      );

      setUpgradeOriginalRupees((p.upgrade_original_price_paise / 100).toString());
      setUpgradeDiscountType(p.upgrade_discount_type || 'none');
      setUpgradeDiscountValue(
        p.upgrade_discount_type === 'percentage'
          ? (p.upgrade_discount_value || 0).toString()
          : ((p.upgrade_discount_value || 0) / 100).toString()
      );

      setChangeReason('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error fetching pricing.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeEditionId) {
      fetchPricing(activeEditionId);
    }
  }, [bookId, activeEditionId]);

  // Derived live calculations in paise
  const onlineOriginalPaise = Math.max(0, Math.round((parseFloat(onlineOriginalRupees) || 0) * 100));
  const onlineDiscountRaw = parseFloat(onlineDiscountValue) || 0;
  const onlineDiscountValForCalc = onlineDiscountType === 'fixed' ? Math.round(onlineDiscountRaw * 100) : onlineDiscountRaw;
  const onlineCalc = useMemo(
    () => calculateSellingPrice(onlineOriginalPaise, onlineDiscountType, onlineDiscountValForCalc),
    [onlineOriginalPaise, onlineDiscountType, onlineDiscountValForCalc]
  );

  const downloadOriginalPaise = Math.max(0, Math.round((parseFloat(downloadOriginalRupees) || 0) * 100));
  const downloadDiscountRaw = parseFloat(downloadDiscountValue) || 0;
  const downloadDiscountValForCalc = downloadDiscountType === 'fixed' ? Math.round(downloadDiscountRaw * 100) : downloadDiscountRaw;
  const downloadCalc = useMemo(
    () => calculateSellingPrice(downloadOriginalPaise, downloadDiscountType, downloadDiscountValForCalc),
    [downloadOriginalPaise, downloadDiscountType, downloadDiscountValForCalc]
  );

  const upgradeOriginalPaise = Math.max(0, Math.round((parseFloat(upgradeOriginalRupees) || 0) * 100));
  const upgradeDiscountRaw = parseFloat(upgradeDiscountValue) || 0;
  const upgradeDiscountValForCalc = upgradeDiscountType === 'fixed' ? Math.round(upgradeDiscountRaw * 100) : upgradeDiscountRaw;
  const upgradeCalc = useMemo(
    () => calculateSellingPrice(upgradeOriginalPaise, upgradeDiscountType, upgradeDiscountValForCalc),
    [upgradeOriginalPaise, upgradeDiscountType, upgradeDiscountValForCalc]
  );

  // Unsaved changes detection
  const hasUnsavedChanges = useMemo(() => {
    if (!serverPricing) return false;
    const onlineOrigChanged = onlineOriginalPaise !== serverPricing.online_original_price_paise;
    const onlineTypeChanged = onlineDiscountType !== serverPricing.online_discount_type;
    const onlineValChanged = onlineDiscountValForCalc !== Number(serverPricing.online_discount_value);

    const downOrigChanged = downloadOriginalPaise !== serverPricing.download_original_price_paise;
    const downTypeChanged = downloadDiscountType !== serverPricing.download_discount_type;
    const downValChanged = downloadDiscountValForCalc !== Number(serverPricing.download_discount_value);

    const upOrigChanged = upgradeOriginalPaise !== serverPricing.upgrade_original_price_paise;
    const upTypeChanged = upgradeDiscountType !== serverPricing.upgrade_discount_type;
    const upValChanged = upgradeDiscountValForCalc !== Number(serverPricing.upgrade_discount_value);

    return (
      onlineOrigChanged || onlineTypeChanged || onlineValChanged ||
      downOrigChanged || downTypeChanged || downValChanged ||
      upOrigChanged || upTypeChanged || upValChanged
    );
  }, [
    serverPricing,
    onlineOriginalPaise,
    onlineDiscountType,
    onlineDiscountValForCalc,
    downloadOriginalPaise,
    downloadDiscountType,
    downloadDiscountValForCalc,
    upgradeOriginalPaise,
    upgradeDiscountType,
    upgradeDiscountValForCalc,
  ]);

  // Validation rules check
  const validationError = useMemo(() => {
    if (downloadCalc.finalPricePaise < onlineCalc.finalPricePaise) {
      return `Read + Download selling price (₹${(downloadCalc.finalPricePaise / 100).toFixed(0)}) cannot be lower than Read Online selling price (₹${(onlineCalc.finalPricePaise / 100).toFixed(0)}).`;
    }
    if (onlineDiscountType === 'percentage' && (onlineDiscountRaw < 0 || onlineDiscountRaw > 100)) {
      return 'Read Online percentage discount must be between 0% and 100%.';
    }
    if (downloadDiscountType === 'percentage' && (downloadDiscountRaw < 0 || downloadDiscountRaw > 100)) {
      return 'Read + Download percentage discount must be between 0% and 100%.';
    }
    if (upgradeDiscountType === 'percentage' && (upgradeDiscountRaw < 0 || upgradeDiscountRaw > 100)) {
      return 'PDF Upgrade percentage discount must be between 0% and 100%.';
    }
    return null;
  }, [onlineCalc, downloadCalc, onlineDiscountType, downloadDiscountType, upgradeDiscountType, onlineDiscountRaw, downloadDiscountRaw, upgradeDiscountRaw]);

  // Save Pricing Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverPricing || !activeEditionId) return;

    if (!changeReason.trim()) {
      setFeedback({ type: 'error', message: 'A change reason is required for commercial audit logging.' });
      return;
    }

    if (validationError) {
      setFeedback({ type: 'error', message: validationError });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    setConflictError(null);

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editionId: activeEditionId,
          currentVersion: serverPricing.pricing_version,
          changeReason: changeReason.trim(),
          online: {
            original_price_paise: onlineOriginalPaise,
            discount_type: onlineDiscountType,
            discount_value: onlineDiscountValForCalc,
          },
          download: {
            original_price_paise: downloadOriginalPaise,
            discount_type: downloadDiscountType,
            discount_value: downloadDiscountValForCalc,
          },
          upgrade: {
            original_price_paise: upgradeOriginalPaise,
            discount_type: upgradeDiscountType,
            discount_value: upgradeDiscountValForCalc,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.conflict) {
          setConflictError(data.error || 'Concurrent update conflict detected. Please reload.');
          return;
        }
        throw new Error(data.error || 'Failed to save pricing.');
      }

      setFeedback({ type: 'success', message: 'Commercial pricing updated successfully.' });
      setChangeReason('');
      await fetchPricing(activeEditionId);
      if (onPricingSaved) onPricingSaved();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating pricing.' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEdition = editions.find(e => e.id === activeEditionId) || editions[0];

  return (
    <div className="space-y-6">
      {/* EDITION SELECTOR & HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Edition:</span>
          <select
            value={activeEditionId}
            onChange={(e) => {
              onEditionChange(e.target.value);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-navy bg-white"
          >
            {editions.map(ed => (
              <option key={ed.id} value={ed.id}>
                Edition #{ed.edition_number} ({ed.version_name}) — {ed.status.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {serverPricing && (
            <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono font-semibold border border-slate-200">
              Pricing Version: v{serverPricing.pricing_version}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs px-2.5 py-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300 animate-pulse">
              ● Unsaved Changes
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPricing(activeEditionId)}
            disabled={isLoading || isSaving}
            title="Reload latest pricing from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* CONCURRENCY CONFLICT BANNER */}
      {conflictError && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{conflictError}</span>
          </div>
          <Button
            size="sm"
            onClick={() => fetchPricing(activeEditionId)}
            className="bg-rose-700 hover:bg-rose-800 text-white shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload Latest Pricing
          </Button>
        </div>
      )}

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          Loading authoritative pricing details...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* PRICING PLANS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* PLAN 1: READ ONLINE */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy">Read Online</h3>
                    <p className="text-[11px] text-slate-400">Web browser reader</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Selling: ₹{(onlineCalc.finalPricePaise / 100).toFixed(0)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">List / Original Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={onlineOriginalRupees}
                    onChange={(e) => setOnlineOriginalRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{onlineOriginalPaise} paise</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={onlineDiscountType}
                    onChange={(e) => setOnlineDiscountType(e.target.value as DiscountType)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {onlineDiscountType === 'percentage' ? 'Discount (%)' : onlineDiscountType === 'fixed' ? 'Discount (₹)' : 'Value'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={onlineDiscountType === 'percentage' ? '0.1' : '1'}
                    max={onlineDiscountType === 'percentage' ? '100' : undefined}
                    disabled={onlineDiscountType === 'none'}
                    value={onlineDiscountType === 'none' ? '0' : onlineDiscountValue}
                    onChange={(e) => setOnlineDiscountValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Calculated Discount:</span>
                <span className="font-semibold text-emerald-600">
                  -₹{(onlineCalc.discountAmountPaise / 100).toFixed(0)} ({onlineOriginalPaise > 0 ? Math.round((onlineCalc.discountAmountPaise / onlineOriginalPaise) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* PLAN 2: READ + DOWNLOAD */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy">Read + Download</h3>
                    <p className="text-[11px] text-slate-400">Web reader + PDF download</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Selling: ₹{(downloadCalc.finalPricePaise / 100).toFixed(0)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">List / Original Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={downloadOriginalRupees}
                    onChange={(e) => setDownloadOriginalRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{downloadOriginalPaise} paise</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={downloadDiscountType}
                    onChange={(e) => setDownloadDiscountType(e.target.value as DiscountType)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {downloadDiscountType === 'percentage' ? 'Discount (%)' : downloadDiscountType === 'fixed' ? 'Discount (₹)' : 'Value'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={downloadDiscountType === 'percentage' ? '0.1' : '1'}
                    max={downloadDiscountType === 'percentage' ? '100' : undefined}
                    disabled={downloadDiscountType === 'none'}
                    value={downloadDiscountType === 'none' ? '0' : downloadDiscountValue}
                    onChange={(e) => setDownloadDiscountValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Calculated Discount:</span>
                <span className="font-semibold text-emerald-600">
                  -₹{(downloadCalc.discountAmountPaise / 100).toFixed(0)} ({downloadOriginalPaise > 0 ? Math.round((downloadCalc.discountAmountPaise / downloadOriginalPaise) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* PLAN 3: PDF UPGRADE */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy">PDF Upgrade Price</h3>
                    <p className="text-[11px] text-slate-400">For existing Read Online owners</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  Selling: ₹{(upgradeCalc.finalPricePaise / 100).toFixed(0)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">List / Base Upgrade (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={upgradeOriginalRupees}
                    onChange={(e) => setUpgradeOriginalRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{upgradeOriginalPaise} paise</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={upgradeDiscountType}
                    onChange={(e) => setUpgradeDiscountType(e.target.value as DiscountType)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {upgradeDiscountType === 'percentage' ? 'Discount (%)' : upgradeDiscountType === 'fixed' ? 'Discount (₹)' : 'Value'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={upgradeDiscountType === 'percentage' ? '0.1' : '1'}
                    max={upgradeDiscountType === 'percentage' ? '100' : undefined}
                    disabled={upgradeDiscountType === 'none'}
                    value={upgradeDiscountType === 'none' ? '0' : upgradeDiscountValue}
                    onChange={(e) => setUpgradeDiscountValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Calculated Discount:</span>
                <span className="font-semibold text-emerald-600">
                  -₹{(upgradeCalc.discountAmountPaise / 100).toFixed(0)} ({upgradeOriginalPaise > 0 ? Math.round((upgradeCalc.discountAmountPaise / upgradeOriginalPaise) * 100) : 0}%)
                </span>
              </div>
            </div>

          </div>

          {/* CUSTOMER-FACING LIVE PREVIEW */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" /> Customer-Facing Price Card Preview
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  How customers see pricing on the eBook store and details page:
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Live Storefront Preview
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Online Card Preview */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                <div>
                  <div className="font-bold text-sm text-navy">Read Online Plan</div>
                  <div className="text-xs text-slate-500">Instant web access in browser</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    {onlineCalc.discountAmountPaise > 0 && (
                      <span className="text-xs text-slate-400 line-through">
                        ₹{(onlineOriginalPaise / 100).toFixed(0)}
                      </span>
                    )}
                    <span className="text-xl font-bold text-navy">
                      ₹{(onlineCalc.finalPricePaise / 100).toFixed(0)}
                    </span>
                  </div>
                  {onlineCalc.discountAmountPaise > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {onlineDiscountType === 'percentage' ? `${onlineDiscountRaw}% OFF` : `₹${(onlineCalc.discountAmountPaise / 100).toFixed(0)} OFF`}
                    </span>
                  )}
                </div>
              </div>

              {/* Download Card Preview */}
              <div className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50/20 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="font-bold text-sm text-navy flex items-center gap-1.5">
                    Read + Download
                    <span className="text-[10px] font-bold uppercase bg-blue-600 text-white px-1.5 py-0.2 rounded">Recommended</span>
                  </div>
                  <div className="text-xs text-slate-500">Web access + offline PDF download</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    {downloadCalc.discountAmountPaise > 0 && (
                      <span className="text-xs text-slate-400 line-through">
                        ₹{(downloadOriginalPaise / 100).toFixed(0)}
                      </span>
                    )}
                    <span className="text-xl font-bold text-blue-900">
                      ₹{(downloadCalc.finalPricePaise / 100).toFixed(0)}
                    </span>
                  </div>
                  {downloadCalc.discountAmountPaise > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {downloadDiscountType === 'percentage' ? `${downloadDiscountRaw}% OFF` : `₹${(downloadCalc.discountAmountPaise / 100).toFixed(0)} OFF`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Upgrade banner preview */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg flex items-center justify-between text-xs text-purple-900">
              <span>Existing online readers will see: <strong>"Upgrade this edition to PDF Download for ₹{(upgradeCalc.finalPricePaise / 100).toFixed(0)}"</strong></span>
              {upgradeCalc.discountAmountPaise > 0 && (
                <span className="font-bold bg-purple-200/80 px-2 py-0.5 rounded">Special Upgrade Offer</span>
              )}
            </div>
          </div>

          {/* REQUIRED CHANGE REASON & SUBMISSION */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Commercial Pricing Change * (Required for Audit Trail)
              </label>
              <textarea
                rows={2}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Festival sale 20% discount on Read Online; revised base edition pricing..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {validationError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400">
                {serverPricing?.updated_at && (
                  <span>
                    Last modified: {new Date(serverPricing.updated_at).toLocaleString()} 
                    {serverPricing.updater_name ? ` by ${serverPricing.updater_name}` : ''}
                    {serverPricing.change_reason ? ` ("${serverPricing.change_reason}")` : ''}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSaving || !hasUnsavedChanges || Boolean(validationError) || !changeReason.trim()}
                className="shrink-0"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Saving Changes...' : 'Save Commercial Pricing'}
              </Button>
            </div>
          </div>

          {/* RECENT PRICING AUDIT TRAIL */}
          {auditHistory.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Pricing Modification History
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Administrator</th>
                      <th className="py-2 px-3">Reason</th>
                      <th className="py-2 px-3">Version</th>
                      <th className="py-2 px-3">Online Price</th>
                      <th className="py-2 px-3">Download Price</th>
                      <th className="py-2 px-3">Upgrade Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700">
                          {item.actor_name}
                        </td>
                        <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={item.change_reason}>
                          {item.change_reason}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          v{item.new_version || '1'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-navy">
                          ₹{item.new_values?.online_price_paise ? (item.new_values.online_price_paise / 100).toFixed(0) : '—'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-navy">
                          ₹{item.new_values?.download_price_paise ? (item.new_values.download_price_paise / 100).toFixed(0) : '—'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-navy">
                          ₹{item.new_values?.upgrade_price_paise ? (item.new_values.upgrade_price_paise / 100).toFixed(0) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
