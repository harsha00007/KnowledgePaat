"use client";

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import {
  Compass,
  ChevronLeft,
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Cpu,
  Layers,
  Save,
  RefreshCw,
  Star,
  Check,
} from 'lucide-react';
import type {
  CareerWithSkills,
  CareerSkillMapItem,
  SkillCatalogItem,
  SkillImportance,
  ProficiencyTarget,
  CareerQualityReport,
} from '@/types/careerSkillGraph';

export default function AdminCareerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const careerId = resolvedParams.id;

  const [career, setCareer] = useState<CareerWithSkills | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCareer, setSavingCareer] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('software_development');
  const [difficulty, setDifficulty] = useState('beginner');
  const [months, setMonths] = useState(6);
  const [status, setStatus] = useState('draft');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Quality Audit Modal
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [qualityReport, setQualityReport] = useState<CareerQualityReport | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  // Add Skill Modal
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<SkillCatalogItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [skillImportance, setSkillImportance] = useState<SkillImportance>('required');
  const [skillProficiency, setSkillProficiency] = useState<ProficiencyTarget>('working');
  const [skillOrder, setSkillOrder] = useState(1);
  const [skillNotes, setSkillNotes] = useState('');
  const [attachingSkill, setAttachingSkill] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/careers/${careerId}`);
      if (res.ok) {
        const data = await res.json();
        setCareer(data);
        setName(data.name);
        setSlug(data.slug);
        setCategory(data.category);
        setDifficulty(data.difficulty);
        setMonths(data.estimated_months);
        setStatus(data.status);
        setShortDesc(data.short_description || '');
        setDescription(data.description || '');
        setIsFeatured(data.is_featured || false);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [careerId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSaveCareer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCareer(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/careers/${careerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          category,
          difficulty,
          estimated_months: months,
          status,
          short_description: shortDesc,
          description,
          is_featured: isFeatured,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCareer((prev) => (prev ? { ...prev, ...updated } : null));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSavingCareer(false);
    }
  };

  const openQualityAudit = async () => {
    setIsQualityOpen(true);
    setQualityLoading(true);
    try {
      const res = await fetch(`/api/admin/careers/${careerId}/quality`);
      if (res.ok) {
        const report = await res.json();
        setQualityReport(report);
      }
    } catch {
      // ignore
    } finally {
      setQualityLoading(false);
    }
  };

  const handleTogglePublish = async (newStatus: 'published' | 'draft') => {
    try {
      const res = await fetch(`/api/admin/careers/${careerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        setCareer((prev) => (prev ? { ...prev, status: newStatus } : null));
        await openQualityAudit();
      }
    } catch {
      // ignore
    }
  };

  const openAddSkillModal = async () => {
    setIsAddSkillOpen(true);
    setAttachError(null);
    try {
      const res = await fetch('/api/admin/skills?limit=100');
      if (res.ok) {
        const data = await res.json();
        const mappedIds = new Set(career?.skills?.map((s) => s.skill_id) || []);
        const unmapped = (data.items || []).filter((s: SkillCatalogItem) => !mappedIds.has(s.id));
        setAvailableSkills(unmapped);
        if (unmapped.length > 0) {
          setSelectedSkillId(unmapped[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleAttachSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) return;

    setAttachingSkill(true);
    setAttachError(null);
    try {
      const res = await fetch(`/api/admin/careers/${careerId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: selectedSkillId,
          importance: skillImportance,
          proficiency_target: skillProficiency,
          display_order: skillOrder,
          notes: skillNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to map skill.');
      }

      setIsAddSkillOpen(false);
      setSkillNotes('');
      await fetchDetail();
    } catch (err: any) {
      setAttachError(err.message);
    } finally {
      setAttachingSkill(false);
    }
  };

  const handleDetachSkill = async (skillId: string) => {
    if (!confirm('Are you sure you want to detach this skill from this career?')) return;
    try {
      const res = await fetch(`/api/admin/careers/${careerId}/skills/${skillId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDetail();
      }
    } catch {
      // ignore
    }
  };

  const handleUpdateMapping = async (
    skillId: string,
    importance: SkillImportance,
    proficiency_target: ProficiencyTarget
  ) => {
    try {
      const res = await fetch(`/api/admin/careers/${careerId}/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importance, proficiency_target }),
      });
      if (res.ok) {
        await fetchDetail();
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Loading career configuration...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!career) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <p className="text-sm text-red-600 font-medium">Career not found.</p>
          <Link href="/admin/careers" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Career Catalog
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const requiredSkills = career.skills?.filter((s) => s.importance === 'required') || [];
  const recommendedSkills = career.skills?.filter((s) => s.importance === 'recommended') || [];
  const optionalSkills = career.skills?.filter((s) => s.importance === 'optional') || [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <Link
              href="/admin/careers"
              className="hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Career Catalog
            </Link>
            <span>/</span>
            <span className="text-[var(--color-text-primary)] font-semibold">{career.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openQualityAudit}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Publish Readiness Check
            </Button>
            {career.status === 'published' && (
              <Link href={`/careers/${career.slug}`} target="_blank">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Public View
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Career Overview Banner */}
        <Card flat className="p-5 sm:p-6 border border-[var(--color-border)] bg-[var(--color-surface)]">
          <form onSubmit={handleSaveCareer} className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                    {career.name}
                  </h1>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      status === 'published'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : status === 'draft'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  ID: <span className="font-mono text-[11px]">{career.id}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Saved!
                  </span>
                )}
                <Button type="submit" variant="primary" size="sm" isLoading={savingCareer}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save Changes
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Estimated Months
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Short Description
              </label>
              <textarea
                rows={2}
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>
          </form>
        </Card>

        {/* Career Skills Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Career Skills Mapping ({career.skills?.length || 0})
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Reusable competencies linked to this career role. Grouped by importance target.
              </p>
            </div>

            <Button variant="primary" size="sm" onClick={openAddSkillModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Map Existing Skill
            </Button>
          </div>

          {/* Skill Groups */}
          <div className="space-y-4">
            {/* 1. Required Skills */}
            <Card flat className="p-5 border border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Required Core Skills ({requiredSkills.length})
                </span>
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  Must be mastered for job readiness
                </span>
              </div>

              {requiredSkills.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No required skills attached yet. Add at least one to enable publication.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {requiredSkills.map((m) => renderSkillCard(m))}
                </div>
              )}
            </Card>

            {/* 2. Recommended Skills */}
            <Card flat className="p-5 border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Recommended Skills ({recommendedSkills.length})
                </span>
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  Expected by majority of hiring managers
                </span>
              </div>

              {recommendedSkills.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No recommended skills attached.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {recommendedSkills.map((m) => renderSkillCard(m))}
                </div>
              )}
            </Card>

            {/* 3. Optional Skills */}
            <Card flat className="p-5 border border-slate-200 dark:border-slate-800 bg-[var(--color-surface)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Optional / Specialization Skills ({optionalSkills.length})
                </span>
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  Differentiators & domain specializations
                </span>
              </div>

              {optionalSkills.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No optional skills attached.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {optionalSkills.map((m) => renderSkillCard(m))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Quality Audit Modal */}
        <Modal
          isOpen={isQualityOpen}
          onClose={() => setIsQualityOpen(false)}
          title="Career Quality & Publish Readiness"
          className="max-w-xl"
        >
          {qualityLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Auditing career metadata and skill mappings...</p>
            </div>
          ) : qualityReport ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      qualityReport.isPublishable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {qualityReport.isPublishable ? 'Ready to Publish' : 'Needs Attention'}
                  </span>
                  <h4 className="text-base font-bold text-[var(--color-text-primary)] mt-1.5">
                    {career.name}
                  </h4>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {qualityReport.score}
                    <span className="text-xs text-slate-400">/100</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Quality Score</span>
                </div>
              </div>

              {qualityReport.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">
                  <h5 className="font-bold mb-1 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    Blockers ({qualityReport.errors.length})
                  </h5>
                  <ul className="list-disc list-inside space-y-0.5">
                    {qualityReport.errors.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {qualityReport.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-xs">
                  <h5 className="font-bold mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Warnings ({qualityReport.warnings.length})
                  </h5>
                  <ul className="list-disc list-inside space-y-0.5">
                    {qualityReport.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <Button variant="secondary" size="sm" onClick={() => setIsQualityOpen(false)}>
                  Close
                </Button>

                {career.status === 'published' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-300"
                    onClick={() => handleTogglePublish('draft')}
                  >
                    Unpublish (Set to Draft)
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!qualityReport.isPublishable}
                    onClick={() => handleTogglePublish('published')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Publish Career Now
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Add Skill Modal */}
        <Modal
          isOpen={isAddSkillOpen}
          onClose={() => setIsAddSkillOpen(false)}
          title="Map Skill to Career"
          className="max-w-md"
        >
          <form onSubmit={handleAttachSkill} className="space-y-4 pt-2">
            {attachError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{attachError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Select Skill From Catalog *
              </label>
              {availableSkills.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">
                  All catalog skills are already mapped to this career or catalog is empty.
                </p>
              ) : (
                <select
                  required
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  {availableSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.skill_type} · {s.category})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Importance
                </label>
                <select
                  value={skillImportance}
                  onChange={(e) => setSkillImportance(e.target.value as SkillImportance)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  <option value="required">Required</option>
                  <option value="recommended">Recommended</option>
                  <option value="optional">Optional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                  Target Proficiency
                </label>
                <select
                  value={skillProficiency}
                  onChange={(e) => setSkillProficiency(e.target.value as ProficiencyTarget)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  <option value="beginner">Beginner</option>
                  <option value="working">Working</option>
                  <option value="proficient">Proficient</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                Display Order Sequence
              </label>
              <input
                type="number"
                min="1"
                value={skillOrder}
                onChange={(e) => setSkillOrder(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddSkillOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={availableSkills.length === 0}
                isLoading={attachingSkill}
              >
                Map Skill
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );

  function renderSkillCard(mapping: CareerSkillMapItem) {
    const s = mapping.skill;
    if (!s) return null;

    return (
      <div
        key={mapping.id}
        className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between gap-2 shadow-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/admin/skills/${s.id}`}
              className="text-xs font-bold text-[var(--color-text-primary)] hover:text-blue-600 transition-colors"
            >
              {s.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400 capitalize">{s.skill_type}</span>
              <span className="text-[10px] text-slate-300">·</span>
              <span className="text-[10px] text-slate-400 capitalize">{s.difficulty}</span>
            </div>
          </div>

          <button
            onClick={() => handleDetachSkill(s.id)}
            title="Detach skill"
            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-1 pt-2 border-t border-[var(--color-border)] text-[10px]">
          <select
            value={mapping.proficiency_target}
            onChange={(e) =>
              handleUpdateMapping(s.id, mapping.importance, e.target.value as ProficiencyTarget)
            }
            className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[10px] font-medium"
          >
            <option value="beginner">Beginner</option>
            <option value="working">Working</option>
            <option value="proficient">Proficient</option>
            <option value="advanced">Advanced</option>
          </select>

          <select
            value={mapping.importance}
            onChange={(e) =>
              handleUpdateMapping(s.id, e.target.value as SkillImportance, mapping.proficiency_target)
            }
            className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[10px] font-medium"
          >
            <option value="required">Required</option>
            <option value="recommended">Recommended</option>
            <option value="optional">Optional</option>
          </select>
        </div>
      </div>
    );
  }
}
