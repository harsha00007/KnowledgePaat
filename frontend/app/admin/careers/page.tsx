"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import {
  Compass,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Archive,
  RefreshCw,
  Activity,
} from 'lucide-react';
import type { CareerCatalogItem, CareerStatus, CareerDifficulty } from '@/types/careerSkillGraph';

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All Careers', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const CATEGORIES = [
  { label: 'All Categories', value: 'all' },
  { label: 'Software Development', value: 'software_development' },
  { label: 'Data & Analytics', value: 'data' },
  { label: 'AI & Machine Learning', value: 'ai_ml' },
  { label: 'QA & Testing', value: 'qa_testing' },
  { label: 'DevOps & Cloud', value: 'devops_cloud' },
  { label: 'Cybersecurity', value: 'cybersecurity' },
  { label: 'Design', value: 'design' },
  { label: 'Product & Management', value: 'product' },
  { label: 'Business', value: 'business' },
  { label: 'Other', value: 'other' },
];

export default function AdminCareersPage() {
  const [careers, setCareers] = useState<CareerCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter]);
  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('software_development');
  const [formDifficulty, setFormDifficulty] = useState<CareerDifficulty>('beginner');
  const [formMonths, setFormMonths] = useState(6);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Health Check Modal
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchCareers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('limit', '20');
      params.set('page', String(page));

      const res = await fetch(`/api/admin/careers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCareers(data.items || []);
        setTotalPages(data.totalPages || 0);
        setListError(null);
      }
      else { setListError('Unable to load catalog. Please retry.'); }
    } catch {
      setListError('Unable to load catalog. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, page]);

  useEffect(() => {
    fetchCareers();
  }, [fetchCareers]);

  const handleNameChange = (val: string) => {
    setFormName(val);
    setFormSlug(
      val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          short_description: formShortDesc,
          description: formDesc,
          category: formCategory,
          difficulty: formDifficulty,
          estimated_months: formMonths,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create career.');
      }

      setIsCreateOpen(false);
      setFormName('');
      setFormSlug('');
      setFormShortDesc('');
      setFormDesc('');
      await fetchCareers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runHealthCheck = async () => {
    setIsHealthOpen(true);
    setHealthLoading(true);
    try {
      const res = await fetch('/api/admin/careers/health-check');
      const data = await res.json();
      if (!res.ok) {
        setHealthData({ status: 'ERROR', issues: [data.error || 'Health check unavailable.'], stats: {} });
      } else setHealthData(data);
    } catch {
      setHealthData({ status: 'ERROR', issues: ['Health check unavailable. Please retry.'], stats: {} });
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Compass className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Career Catalog
              </h1>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Central role database mapping global careers to reusable skills and competencies.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={runHealthCheck}
              className="border-slate-200 dark:border-slate-800"
            >
              <Activity className="w-4 h-4 mr-1.5 text-blue-500" />
              Health Audit
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Career
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search careers by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <div className="flex rounded-xl p-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === s.value
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Career Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Loading career catalog...</p>
          </div>
        ) : careers.length === 0 ? (
          <EmptyState
            title="No careers found"
            description="Create your first career role to start building reusable skill mappings."
            action={
              <Button variant="primary" size="md" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Career
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {careers.map((career) => (
              <Card
                key={career.id}
                flat
                className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        career.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : career.status === 'draft'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {career.status}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                      {career.category.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--color-text-primary)] group-hover:text-blue-600 transition-colors">
                    {career.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                    {career.short_description || career.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-3 mt-4 text-[11px] text-[var(--color-text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {career.estimated_months} Months
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-blue-500" />
                      {career.skill_count || 0} Skills Mapped
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                  {career.status === 'published' ? (
                    <Link
                      href={`/careers/${career.slug}`}
                      target="_blank"
                      className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Public View
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">Draft</span>
                  )}

                  <Link href={`/admin/careers/${career.id}`}>
                    <Button variant="outline" size="sm" className="text-xs group-hover:border-blue-500">
                      Manage Skills
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Career Role"
          className="max-w-lg"
        >
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Career Role Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Python Developer"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Slug (URL Identifier) *
              </label>
              <input
                type="text"
                required
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Difficulty
                </label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value as CareerDifficulty)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Short Description (Summary) *
              </label>
              <textarea
                required
                rows={2}
                placeholder="High-level commercial description of this career path..."
                value={formShortDesc}
                onChange={(e) => setFormShortDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={saving}>
                Create Career
              </Button>
            </div>
          </form>
        </Modal>

        {/* Health Check Modal */}
        <Modal
          isOpen={isHealthOpen}
          onClose={() => setIsHealthOpen(false)}
          title="Career & Skill Graph Health Audit"
          className="max-w-xl"
        >
          {healthLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Auditing graph connections and constraints...</p>
            </div>
          ) : healthData ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      healthData.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : healthData.status === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    System Status: {healthData.status}
                  </span>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {healthData.stats.totalCareers} Careers · {healthData.stats.totalSkills} Skills · {healthData.stats.totalMappings} Mappings · {healthData.stats.totalRelationships} Graph Edges
                  </p>
                </div>
              </div>

              {healthData.issues.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All graph relationships, slugs, and constraints are completely valid!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">
                    Detected Issues ({healthData.issues.length})
                  </h4>
                  <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                    {healthData.issues.map((issue: string, idx: number) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
                <Button variant="secondary" size="sm" onClick={() => setIsHealthOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
        {listError && <p role="alert" className="text-red-600">{listError}</p>}
        <div className="flex items-center justify-between gap-3 mt-4">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page} of {Math.max(1, totalPages)}</span>
          <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
