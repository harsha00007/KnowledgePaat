"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { RoadmapComposerModal } from '@/components/roadmaps/RoadmapComposerModal';
import { EmptyState } from '@/components/EmptyState';
import {
  Route,
  Search,
  Plus,
  Edit,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRight,
  Filter,
  Check,
  X,
  RefreshCw,
  Copy,
} from 'lucide-react';
import type { CareerRoadmap, RoadmapCategory, RoadmapDifficulty } from '@/types/roadmap';

const CATEGORIES: RoadmapCategory[] = [
  'Development',
  'Data',
  'AI',
  'QA & Testing',
  'DevOps & Cloud',
  'Cybersecurity',
  'Product',
  'Design',
  'Other',
];

const DIFFICULTIES: RoadmapDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

export default function AdminRoadmapsPage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [roadmaps, setRoadmaps] = useState<CareerRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'draft'>('all');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoadmap, setEditingRoadmap] = useState<CareerRoadmap | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    short_description: '',
    description: '',
    category: 'Development' as RoadmapCategory,
    difficulty: 'Beginner' as RoadmapDifficulty,
    estimated_duration: '12 Weeks',
    thumbnail_url: '',
    seo_title: '',
    seo_description: '',
    is_active: false,
  });

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<CareerRoadmap | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Duplicating state
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDuplicate = async (roadmapId: string) => {
    try {
      setDuplicatingId(roadmapId);
      const res = await fetch(`/api/admin/roadmaps/${roadmapId}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to duplicate roadmap.');
      }
      await fetchRoadmaps();
    } catch (err: any) {
      alert(err.message || 'Error duplicating roadmap.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const fetchRoadmaps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/roadmaps');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch roadmaps.');
      }
      const data = await res.json();
      setRoadmaps(data.roadmaps || []);
    } catch (err: any) {
      setError(err.message || 'Error loading roadmaps.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoadmaps();
  }, [fetchRoadmaps]);

  const openCreateModal = () => {
    setEditingRoadmap(null);
    setFormData({
      title: '',
      slug: '',
      short_description: '',
      description: '',
      category: 'Development',
      difficulty: 'Beginner',
      estimated_duration: '12 Weeks',
      thumbnail_url: '',
      seo_title: '',
      seo_description: '',
      is_active: false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (roadmap: CareerRoadmap) => {
    setEditingRoadmap(roadmap);
    setFormData({
      title: roadmap.title,
      slug: roadmap.slug,
      short_description: roadmap.short_description,
      description: roadmap.description,
      category: roadmap.category,
      difficulty: roadmap.difficulty,
      estimated_duration: roadmap.estimated_duration,
      thumbnail_url: roadmap.thumbnail_url || '',
      seo_title: roadmap.seo_title || '',
      seo_description: roadmap.seo_description || '',
      is_active: roadmap.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setFormData((prev) => {
      // Auto-generate slug if creating new
      const next = { ...prev, title: val };
      if (!editingRoadmap) {
        next.slug = val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    try {
      const url = editingRoadmap
        ? `/api/admin/roadmaps/${editingRoadmap.id}`
        : '/api/admin/roadmaps';
      const method = editingRoadmap ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          const map: Record<string, string> = {};
          for (const d of data.details) map[d.field] = d.message;
          setFormErrors(map);
        } else {
          setFormErrors({ general: data.error || 'Failed to save roadmap.' });
        }
        return;
      }

      setIsModalOpen(false);
      fetchRoadmaps();
    } catch (err: any) {
      setFormErrors({ general: err.message || 'Error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (roadmap: CareerRoadmap) => {
    try {
      const res = await fetch(`/api/admin/roadmaps/${roadmap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !roadmap.is_active }),
      });
      if (res.ok) {
        fetchRoadmaps();
      }
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/roadmaps/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete roadmap.');
      }

      setDeleteTarget(null);
      fetchRoadmaps();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete roadmap.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredRoadmaps = roadmaps.filter((rm) => {
    const matchesSearch =
      !search ||
      rm.title.toLowerCase().includes(search.toLowerCase()) ||
      rm.slug.toLowerCase().includes(search.toLowerCase()) ||
      rm.short_description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || rm.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && rm.is_active) ||
      (selectedStatus === 'draft' && !rm.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Route className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Career Roadmaps
              </h1>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Create, configure, and publish structured career pathways.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRoadmaps}
              disabled={loading}
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="secondary" size="md" onClick={() => setComposerOpen(true)}>Compose Roadmap</Button>
            <Button variant="primary" size="md" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Roadmap
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card flat className="p-4 bg-[var(--color-surface)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="Search roadmaps by title, slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="draft">Draft Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Content */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[var(--color-text-tertiary)] space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Loading roadmaps...</p>
          </div>
        ) : filteredRoadmaps.length === 0 ? (
          <EmptyState
            title="No roadmaps found"
            description={
              search || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'No career roadmaps match your current filters. Try resetting search.'
                : 'No career roadmaps have been created yet. Click "+ Create Roadmap" to start.'
            }
            action={
              <Button variant="primary" size="md" onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create Roadmap
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roadmap</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredRoadmaps.map((rm) => (
                  <tr
                    key={rm.id}
                    className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div>
                        <Link
                          href={`/admin/roadmaps/${rm.id}`}
                          className="font-semibold text-[var(--color-text-primary)] hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
                        >
                          {rm.title}
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100" />
                        </Link>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 font-mono">
                          /roadmaps/{rm.slug}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                        {rm.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                        {rm.difficulty}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {rm.estimated_duration}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(rm)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          rm.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100'
                        }`}
                        title="Click to toggle status"
                      >
                        {rm.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            Draft
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">
                      {new Date(rm.updated_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/roadmaps/${rm.id}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            title="Manage Sections and Nodes"
                          >
                            <Layers className="w-3.5 h-3.5 mr-1" />
                            Manage
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(rm)}
                          title="Edit Roadmap Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        {rm.is_active && (
                          <Link
                            href={`/roadmaps/${rm.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View Public Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteTarget(rm);
                            setDeleteError(null);
                          }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete Roadmap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <RoadmapComposerModal isOpen={composerOpen} onClose={() => setComposerOpen(false)} onGenerated={fetchRoadmaps} />
        {/* Create / Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRoadmap ? 'Edit Career Roadmap' : 'Create Career Roadmap'}
          className="max-w-2xl"
        >
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {formErrors.general && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
                {formErrors.general}
              </div>
            )}

            {/* Template Presets */}
            {!editingRoadmap && (
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  Quick Template Presets
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        category: 'Development',
                        difficulty: 'Beginner',
                        estimated_duration: '16 Weeks',
                      }));
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-semibold text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                  >
                    💼 Role Path
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        category: 'Development',
                        difficulty: 'Intermediate',
                        estimated_duration: '8 Weeks',
                      }));
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 text-xs font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors"
                  >
                    ⚡ Core Skill
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        category: 'Development',
                        difficulty: 'Beginner',
                        estimated_duration: '6 Weeks',
                      }));
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                  >
                    🚀 Beginner Track
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        category: 'Cybersecurity',
                        difficulty: 'Intermediate',
                        estimated_duration: '4 Weeks',
                      }));
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
                  >
                    🛡️ Best Practice
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Python Developer"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.title && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    }))
                  }
                  placeholder="e.g. python-developer"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.slug && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.slug}</p>
                )}
              </div>
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Short Description *
              </label>
              <input
                type="text"
                required
                value={formData.short_description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, short_description: e.target.value }))
                }
                placeholder="Brief one-line summary for cards..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.short_description && (
                <p className="text-xs text-red-500 mt-1">{formErrors.short_description}</p>
              )}
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Detailed Description *
              </label>
              <textarea
                rows={3}
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Comprehensive overview of this career pathway..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.description && (
                <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value as RoadmapCategory,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Difficulty *
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      difficulty: e.target.value as RoadmapDifficulty,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Estimated Duration *
                </label>
                <input
                  type="text"
                  required
                  value={formData.estimated_duration}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, estimated_duration: e.target.value }))
                  }
                  placeholder="e.g. 16 Weeks"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* SEO Section */}
            <div className="pt-2 border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                SEO & Metadata (Optional)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                    SEO Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.seo_title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, seo_title: e.target.value }))
                    }
                    placeholder="Python Developer Roadmap | KnowledgePaat"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                    SEO Meta Description
                  </label>
                  <input
                    type="text"
                    value={formData.seo_description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, seo_description: e.target.value }))
                    }
                    placeholder="Step-by-step roadmap to become a Python developer..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span className="text-xs font-medium text-[var(--color-text-primary)]">
                {formData.is_active ? 'Active (Publicly visible)' : 'Draft (Admin only)'}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={saving}>
                {editingRoadmap ? 'Save Changes' : 'Create Roadmap'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Career Roadmap"
          className="max-w-md"
        >
          <div className="p-6 space-y-4">
            {deleteError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
                {deleteError}
              </div>
            )}
            <p className="text-sm text-[var(--color-text-secondary)]">
              Are you sure you want to delete{' '}
              <strong className="text-[var(--color-text-primary)]">
                {deleteTarget?.title}
              </strong>
              ? This action cannot be undone.
            </p>
            {deleteTarget?.is_active && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Active roadmaps cannot be deleted directly. Please change status to Draft first.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDelete}
                isLoading={deleting}
                disabled={deleteTarget?.is_active}
              >
                Delete Roadmap
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
