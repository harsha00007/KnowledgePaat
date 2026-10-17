"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  GitBranch,
  Layers,
  Sparkles,
  Archive,
  RefreshCw,
  Compass,
  Star,
  BookOpen,
} from 'lucide-react';
import type { SkillCatalogItem, SkillStatus, SkillType, SkillDifficulty } from '@/types/careerSkillGraph';

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const SKILL_TYPES: Array<{ label: string; value: string }> = [
  { label: 'All Types', value: 'all' },
  { label: 'Language', value: 'language' },
  { label: 'Framework', value: 'framework' },
  { label: 'Library', value: 'library' },
  { label: 'Database', value: 'database' },
  { label: 'Tool', value: 'tool' },
  { label: 'Platform', value: 'platform' },
  { label: 'Concept', value: 'concept' },
  { label: 'Soft Skill', value: 'soft_skill' },
  { label: 'Domain', value: 'domain' },
  { label: 'Practice', value: 'practice' },
  { label: 'Architecture', value: 'architecture' },
  { label: 'Other', value: 'other' },
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

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, typeFilter]);
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('software_development');
  const [formType, setFormType] = useState<SkillType>('language');
  const [formDifficulty, setFormDifficulty] = useState<SkillDifficulty>('beginner');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (typeFilter !== 'all') params.set('skill_type', typeFilter);
      params.set('limit', '20');
      params.set('page', String(page));

      const res = await fetch(`/api/admin/skills?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data.items || []);
        setTotalPages(data.totalPages || 0);
        setListError(null);
      }
      else { setListError('Unable to load catalog. Please retry.'); }
    } catch {
      setListError('Unable to load catalog. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, typeFilter, page]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleNameChange = (val: string) => {
    setFormName(val);
    const slugified = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormSlug(slugified);
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formSlug.trim()) {
      setFormError('Skill name and slug are required.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim(),
          short_description: formShortDesc.trim(),
          description: formDesc.trim(),
          category: formCategory,
          skill_type: formType,
          difficulty: formDifficulty,
          status: 'draft',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create skill.');
        return;
      }

      setIsCreateOpen(false);
      setFormName('');
      setFormSlug('');
      setFormShortDesc('');
      setFormDesc('');
      fetchSkills();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const publishedCount = skills.filter((s) => s.status === 'published').length;
  const draftCount = skills.filter((s) => s.status === 'draft').length;
  const archivedCount = skills.filter((s) => s.status === 'archived').length;

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '0.5rem',
                borderRadius: '10px',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Cpu size={24} />
              </div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                Skill Catalog
              </h1>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
              Global reusable skills taxonomy powering Career mappings and Roadmap dependency intelligence.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/admin/skills/graph">
              <Button
                variant="outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderColor: 'rgba(147, 51, 234, 0.4)',
                  color: '#c084fc',
                }}
              >
                <GitBranch size={16} />
                Skill Graph View
              </Button>
            </Link>

            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              }}
            >
              <Plus size={16} />
              New Skill
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Total Skills</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f8fafc', margin: '0.25rem 0 0 0' }}>{skills.length}</h3>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '0.6rem', borderRadius: '8px' }}>
                <Cpu size={20} />
              </div>
            </div>
          </Card>

          <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Published</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#34d399', margin: '0.25rem 0 0 0' }}>{publishedCount}</h3>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '0.6rem', borderRadius: '8px' }}>
                <CheckCircle2 size={20} />
              </div>
            </div>
          </Card>

          <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Drafts</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fbbf24', margin: '0.25rem 0 0 0' }}>{draftCount}</h3>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', padding: '0.6rem', borderRadius: '8px' }}>
                <Clock size={20} />
              </div>
            </div>
          </Card>

          <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Archived</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>{archivedCount}</h3>
              </div>
              <div style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', padding: '0.6rem', borderRadius: '8px' }}>
                <Archive size={20} />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter Controls */}
        <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search skills by name, description, slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                background: '#0a0f1d',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                minWidth: '180px',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                background: '#0a0f1d',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                minWidth: '160px',
              }}
            >
              {SKILL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: '#0a0f1d',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                minWidth: '150px',
              }}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={fetchSkills}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#334155', color: '#94a3b8' }}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Skills Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
            <p>Loading skills catalog...</p>
          </div>
        ) : skills.length === 0 ? (
          <EmptyState
            title="No skills found"
            description="Adjust your search filters or create a new skill in the catalog."
            action={
              <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
                Create Skill
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {skills.map((skill) => (
              <Card
                key={skill.id}
                style={{
                  background: '#131b2e',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '1.25rem' }}>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                      }}>
                        {skill.skill_type}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: '#0f172a',
                        color: '#94a3b8',
                        border: '1px solid #1e293b',
                      }}>
                        {skill.difficulty}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      background:
                        skill.status === 'published'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : skill.status === 'draft'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(148, 163, 184, 0.15)',
                      color:
                        skill.status === 'published'
                          ? '#34d399'
                          : skill.status === 'draft'
                          ? '#fbbf24'
                          : '#94a3b8',
                      border: `1px solid ${
                        skill.status === 'published'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : skill.status === 'draft'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(148, 163, 184, 0.3)'
                      }`,
                    }}>
                      {skill.status}
                    </span>
                  </div>

                  {/* Title & Slug */}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
                    {skill.name}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace', margin: '0 0 0.75rem 0' }}>
                    /{skill.slug}
                  </p>

                  <p style={{
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    lineHeight: '1.45',
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '2.5rem',
                  }}>
                    {skill.short_description || skill.description || 'No description provided.'}
                  </p>
                </div>

                {/* Footer */}
                <div style={{
                  padding: '0.85rem 1.25rem',
                  background: 'rgba(10, 15, 29, 0.6)',
                  borderTop: '1px solid #1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <Compass size={14} style={{ color: '#38bdf8' }} />
                    <span>Used in <strong>{skill.career_count ?? 0}</strong> careers</span>
                  </div>

                  <Link href={`/admin/skills/${skill.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{
                        borderColor: '#334155',
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      Manage
                      <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Skill Modal */}
        {isCreateOpen && (
          <Modal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            title="Create New Skill"
          >
            <form onSubmit={handleCreateSkill} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              {formError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '0.875rem',
                }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Skill Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python, Docker, System Design"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Slug * (Server-validated unique identifier)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. python, docker, system-design"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    Skill Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as SkillType)}
                    style={{
                      width: '100%',
                      background: '#0a0f1d',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '0.65rem',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    {SKILL_TYPES.filter((t) => t.value !== 'all').map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    Difficulty Level
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as SkillDifficulty)}
                    style={{
                      width: '100%',
                      background: '#0a0f1d',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '0.65rem',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Short Summary
                </label>
                <input
                  type="text"
                  placeholder="One sentence summary of the skill"
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Detailed Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what this skill encompasses..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  style={{ borderColor: '#334155', color: '#94a3b8' }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                >
                  {saving ? 'Creating...' : 'Create Skill'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
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
