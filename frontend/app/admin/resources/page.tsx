"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import {
  Library,
  Search,
  Plus,
  Edit,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  RefreshCw,
  Video,
  BookOpen,
  FileText,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import type {
  CareerResource,
  ResourceType,
  ResourceDifficulty,
  ResourceCreatePayload,
} from '@/types/resource';
import { VALID_RESOURCE_TYPES, VALID_RESOURCE_DIFFICULTIES } from '@/types/resource';
import { getResourceTypeIcon, formatDuration } from '@/components/roadmaps/ResourceCard';

const CATEGORIES = [
  'Development',
  'Data',
  'AI',
  'QA & Testing',
  'DevOps & Cloud',
  'Cybersecurity',
  'Product',
  'Design',
  'Python',
  'SQL',
  'Databases',
  'Git',
  'Linux',
  'Web Development',
  'APIs',
  'Other',
];

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<CareerResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedPricing, setSelectedPricing] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<CareerResource | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ResourceCreatePayload>({
    title: '',
    description: '',
    resource_type: 'YOUTUBE',
    provider: '',
    url: '',
    thumbnail_url: '',
    duration_minutes: 60,
    difficulty: 'Beginner',
    category: 'Development',
    is_free: true,
    price: null,
    currency: 'INR',
    language: 'English',
    instructor: '',
    rating: 4.8,
    is_recommended: false,
    priority: 1,
    is_active: true,
  });

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<CareerResource | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/resources');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load resources.');
      }
      const data = await res.json();
      setResources(data.resources || []);
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading resources.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const openCreateModal = () => {
    setEditingResource(null);
    setFormData({
      title: '',
      description: '',
      resource_type: 'YOUTUBE',
      provider: '',
      url: '',
      thumbnail_url: '',
      duration_minutes: 60,
      difficulty: 'Beginner',
      category: 'Development',
      is_free: true,
      price: null,
      currency: 'INR',
      language: 'English',
      instructor: '',
      rating: 4.8,
      is_recommended: false,
      priority: 1,
      is_active: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (res: CareerResource) => {
    setEditingResource(res);
    setFormData({
      title: res.title,
      description: res.description || '',
      resource_type: res.resource_type,
      provider: res.provider,
      url: res.url,
      thumbnail_url: res.thumbnail_url || '',
      duration_minutes: res.duration_minutes ?? null,
      difficulty: res.difficulty,
      category: res.category || 'Development',
      is_free: res.is_free,
      price: res.price ?? null,
      currency: res.currency || 'INR',
      language: res.language || 'English',
      instructor: res.instructor || '',
      rating: res.rating ?? null,
      is_recommended: res.is_recommended,
      priority: res.priority || 1,
      is_active: res.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    try {
      const url = editingResource
        ? `/api/admin/resources/${editingResource.id}`
        : '/api/admin/resources';
      const method = editingResource ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        price: formData.is_free ? null : Number(formData.price) || 0,
        duration_minutes: formData.duration_minutes
          ? Number(formData.duration_minutes)
          : null,
        rating: formData.rating ? Number(formData.rating) : null,
        priority: Number(formData.priority) || 1,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          const map: Record<string, string> = {};
          for (const d of data.details) map[d.field] = d.message;
          setFormErrors(map);
        } else {
          setFormErrors({ general: data.error || 'Failed to save resource.' });
        }
        return;
      }

      setIsModalOpen(false);
      fetchResources();
    } catch (err: any) {
      setFormErrors({ general: err.message || 'Error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (res: CareerResource) => {
    try {
      const response = await fetch(`/api/admin/resources/${res.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !res.is_active }),
      });
      if (response.ok) {
        fetchResources();
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
      const res = await fetch(`/api/admin/resources/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete resource.');
      }

      setDeleteTarget(null);
      fetchResources();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete resource.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      !search ||
      res.title.toLowerCase().includes(search.toLowerCase()) ||
      res.provider.toLowerCase().includes(search.toLowerCase()) ||
      res.category.toLowerCase().includes(search.toLowerCase()) ||
      res.url.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      selectedType === 'all' || res.resource_type === selectedType;

    const matchesCategory =
      selectedCategory === 'all' || res.category === selectedCategory;

    const matchesDifficulty =
      selectedDifficulty === 'all' || res.difficulty === selectedDifficulty;

    const matchesPricing =
      selectedPricing === 'all' ||
      (selectedPricing === 'free' && res.is_free) ||
      (selectedPricing === 'paid' && !res.is_free);

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && res.is_active) ||
      (selectedStatus === 'inactive' && !res.is_active);

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesDifficulty &&
      matchesPricing &&
      matchesStatus
    );
  });

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Library className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Resource Library
              </h1>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Curate, organize, and manage reusable learning resources for roadmap nodes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchResources}
              disabled={loading}
              title="Refresh resources list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="primary" size="md" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Resource
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card flat className="p-4 bg-[var(--color-surface)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="Search by title, provider, URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Type */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Types</option>
                {VALID_RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing */}
            <div>
              <select
                value={selectedPricing}
                onChange={(e) => setSelectedPricing(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Free & Paid</option>
                <option value="free">Free Only</option>
                <option value="paid">Paid Only</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Table / List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[var(--color-text-tertiary)] space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Loading resource catalog...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <EmptyState
            title="No resources found"
            description={
              search || selectedType !== 'all' || selectedCategory !== 'all'
                ? 'No resources match your current filter settings. Try clearing search.'
                : 'No learning resources exist in the library yet. Click "+ Add Resource" to create one.'
            }
            action={
              <Button variant="primary" size="md" onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Resource
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Pricing</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredResources.map((res) => {
                  const duration = formatDuration(res.duration_minutes);

                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[var(--color-text-primary)] line-clamp-1">
                              {res.title}
                            </span>
                            {res.is_recommended && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                                Rec
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                            <span className="font-medium text-[var(--color-text-secondary)]">
                              {res.provider}
                            </span>
                            {res.rating && (
                              <span className="flex items-center gap-0.5 text-amber-600">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {res.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                          {getResourceTypeIcon(res.resource_type)}
                          <span>{res.resource_type.replace('_', ' ')}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                          {res.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {res.difficulty}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            res.is_free
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                          }`}
                        >
                          {res.is_free
                            ? 'Free'
                            : `${res.currency || 'INR'} ${res.price || ''}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[var(--color-text-tertiary)]">
                        {duration || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleActive(res)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            res.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="Click to toggle active status"
                        >
                          {res.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-slate-500" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(res)}
                            title="Edit Resource"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Open External Resource"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget(res);
                              setDeleteError(null);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="Delete Resource"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingResource ? 'Edit Resource' : 'Add Learning Resource'}
          className="max-w-2xl"
        >
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {formErrors.general && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
                {formErrors.general}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Resource Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g. Python for Beginners — Full Course"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.title && (
                <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Resource Type *
                </label>
                <select
                  value={formData.resource_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      resource_type: e.target.value as ResourceType,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  {VALID_RESOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Provider Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.provider}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, provider: e.target.value }))
                  }
                  placeholder="e.g. YouTube, freeCodeCamp, Udemy, Official Docs"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
                {formErrors.provider && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.provider}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Resource URL * (https://...)
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] font-mono"
              />
              {formErrors.url && (
                <p className="text-xs text-red-500 mt-1">{formErrors.url}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Overview of syllabus, concepts, and takeaways..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Difficulty *
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      difficulty: e.target.value as ResourceDifficulty,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  {VALID_RESOURCE_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Duration (Mins)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duration_minutes ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration_minutes: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="e.g. 120"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            {/* Free vs Paid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
              <div>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_free}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_free: e.target.checked }))
                    }
                    className="rounded border-[var(--color-border)] text-blue-600"
                  />
                  Free Resource
                </label>
              </div>

              {!formData.is_free && (
                <>
                  <div>
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                      Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required={!formData.is_free}
                      value={formData.price ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder="e.g. 499"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, currency: e.target.value }))
                      }
                      placeholder="INR, USD"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Additional details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  Instructor / Author
                </label>
                <input
                  type="text"
                  value={formData.instructor ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, instructor: e.target.value }))
                  }
                  placeholder="e.g. Tim Ruscica"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  Rating (1.0 - 5.0)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.rating ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rating: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="e.g. 4.9"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  Default Priority
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.priority ?? 1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6 pt-3 border-t border-[var(--color-border)]">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_recommended}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_recommended: e.target.checked,
                    }))
                  }
                  className="rounded border-[var(--color-border)] text-blue-600"
                />
                ⭐ Recommended by Default
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="rounded border-[var(--color-border)] text-blue-600"
                />
                Active Status
              </label>
            </div>

            {/* Actions */}
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
                {editingResource ? 'Save Changes' : 'Create Resource'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Resource"
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
              ?
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-[var(--color-border)]">
              If this resource is attached to roadmap nodes, deletion will be rejected to protect student pathway stability. Deactivating it is recommended.
            </p>

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
              >
                Delete Resource
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
