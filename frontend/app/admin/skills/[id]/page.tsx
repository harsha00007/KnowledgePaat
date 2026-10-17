"use client";

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import {
  Cpu,
  ChevronLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Save,
  RefreshCw,
  GitBranch,
  Layers,
  ArrowRight,
  Compass,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import type {
  SkillDetailWithRelations,
  SkillCatalogItem,
  SkillType,
  SkillDifficulty,
  SkillStatus,
  SkillRelationshipType,
} from '@/types/careerSkillGraph';

const SKILL_TYPES: Array<{ label: string; value: string }> = [
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

export default function AdminSkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const skillId = resolvedParams.id;

  const [skill, setSkill] = useState<SkillDetailWithRelations | null>(null);
  const [relationshipPage, setRelationshipPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingSkill, setSavingSkill] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('software_development');
  const [skillType, setSkillType] = useState<SkillType>('language');
  const [difficulty, setDifficulty] = useState<SkillDifficulty>('beginner');
  const [status, setStatus] = useState<SkillStatus>('draft');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Add Relationship Modal
  const [isAddRelOpen, setIsAddRelOpen] = useState(false);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerPages, setPickerPages] = useState(1);
  const [allSkills, setAllSkills] = useState<SkillCatalogItem[]>([]);
  const [selectedTargetSkillId, setSelectedTargetSkillId] = useState('');
  const [relDirection, setRelDirection] = useState<'prerequisite_of_this' | 'this_is_prerequisite_for' | 'related' | 'builds_on' | 'commonly_used_with' | 'alternative'>('prerequisite_of_this');
  const [relStrength, setRelStrength] = useState(3);
  const [relNotes, setRelNotes] = useState('');
  const [addingRel, setAddingRel] = useState(false);
  const [relError, setRelError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/skills/${skillId}?page=${relationshipPage}`);
      if (res.ok) {
        const data = await res.json();
        const s: SkillDetailWithRelations = { ...data, ...data.relationships, careers: data.careers };
        setSkill(s);
        setName(s.name);
        setSlug(s.slug);
        setCategory(s.category);
        setSkillType(s.skill_type);
        setDifficulty(s.difficulty);
        setStatus(s.status);
        setShortDesc(s.short_description || '');
        setDescription(s.description || '');
        setIsFeatured(s.is_featured);
      } else {
        setErrorMessage('Failed to load skill details.');
      }
    } catch {
      setErrorMessage('Failed to load skill details.');
    } finally {
      setLoading(false);
    }
  }, [skillId, relationshipPage]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const loadAllSkills = async (page = 1) => {
    try {
      const res = await fetch(`/api/admin/skills?limit=20&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        const otherSkills = (data.items || []).filter((s: SkillCatalogItem) => s.id !== skillId);
        setAllSkills(otherSkills);
        setPickerPage(page);
        setPickerPages(data.totalPages || 1);
        setSelectedTargetSkillId(otherSkills[0]?.id || '');
        if (otherSkills.length > 0 && !selectedTargetSkillId) {
          setSelectedTargetSkillId(otherSkills[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleOpenAddRel = () => {
    setRelError(null);
    setRelNotes('');
    loadAllSkills();
    setIsAddRelOpen(true);
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      setSavingSkill(true);
      const res = await fetch(`/api/admin/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          category,
          skill_type: skillType,
          difficulty,
          status,
          short_description: shortDesc.trim(),
          description: description.trim(),
          is_featured: isFeatured,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update skill.');
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchDetail();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update skill.');
    } finally {
      setSavingSkill(false);
    }
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    setRelError(null);

    if (!selectedTargetSkillId) {
      setRelError('Please select a target skill.');
      return;
    }

    try {
      setAddingRel(true);

      let sourceId = skillId;
      let targetId = selectedTargetSkillId;
      let relType: SkillRelationshipType = 'prerequisite';

      if (relDirection === 'prerequisite_of_this') {
        // Target is prerequisite TO this skill: Target -> This
        sourceId = selectedTargetSkillId;
        targetId = skillId;
        relType = 'prerequisite';
      } else if (relDirection === 'this_is_prerequisite_for') {
        // This skill is prerequisite TO target: This -> Target
        sourceId = skillId;
        targetId = selectedTargetSkillId;
        relType = 'prerequisite';
      } else {
        sourceId = skillId;
        targetId = selectedTargetSkillId;
        relType = relDirection as SkillRelationshipType;
      }

      const res = await fetch(`/api/admin/skills/${skillId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_skill_id: sourceId,
          target_skill_id: targetId,
          relationship_type: relType,
          strength: relStrength,
          notes: relNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRelError(data.error || 'Failed to establish relationship.');
        return;
      }

      setIsAddRelOpen(false);
      fetchDetail();
    } catch (err: any) {
      setRelError(err.message || 'An unexpected error occurred.');
    } finally {
      setAddingRel(false);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    if (!confirm('Are you sure you want to delete this relationship?')) return;

    try {
      const res = await fetch(`/api/admin/skills/${skillId}/relationships/${relId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchDetail();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete relationship');
      }
    } catch {
      alert('Network error deleting relationship');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
          <p>Loading skill details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!skill) {
    return (
      <AdminLayout>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
          <p>Skill not found.</p>
          <Link href="/admin/skills">
            <Button variant="outline">Return to Skill Catalog</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Top Breadcrumb & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/admin/skills">
              <Button variant="outline" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: '#334155', color: '#94a3b8' }}>
                <ChevronLeft size={16} />
                Skill Catalog
              </Button>
            </Link>
            <span style={{ color: '#475569' }}>/</span>
            <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '1.1rem' }}>{skill.name}</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              background: skill.status === 'published' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: skill.status === 'published' ? '#34d399' : '#fbbf24',
              border: `1px solid ${skill.status === 'published' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}>
              {skill.status}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href={`/skills/${skill.slug}`} target="_blank">
              <Button variant="outline" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#334155', color: '#38bdf8' }}>
                <ExternalLink size={14} />
                Public View
              </Button>
            </Link>
            <Link href="/admin/skills/graph">
              <Button variant="outline" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'rgba(147, 51, 234, 0.4)', color: '#c084fc' }}>
                <GitBranch size={14} />
                Graph Inspector
              </Button>
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '8px', color: '#f87171', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '8px', color: '#34d399', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>Skill changes saved successfully.</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Skill Metadata Form */}
          <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={20} style={{ color: '#3b82f6' }} />
              Skill Information
            </h2>

            <form onSubmit={handleSaveSkill} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Skill Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', background: '#0a0f1d', border: '1px solid #334155', borderRadius: '8px', padding: '0.65rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>URL Slug *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  style={{ width: '100%', background: '#0a0f1d', border: '1px solid #334155', borderRadius: '8px', padding: '0.65rem', color: '#f8fafc', fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', background: '#0a0f1d', border: '1px solid #334155', borderRadius: '8px', padding: '0.65rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Skill Type</label>
                  <select
                    value={skillType}
                    onChange={(e) => setSkillType(e.target.value as SkillType)}
                    style={{ width: '100%', background: '#0a0f1d', border: '1px solid #334155', borderRadius: '8px', padding: '0.65rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {SKILL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as SkillDifficulty)}
                    style={{ width: '100%', background: '#0a0f1d', border: '1px solid #334155', borderRadius: '8px', padding: '0.65rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SkillStatus)}
                    style={{ width: '100%', background: '#0a0f1d', border: '1px solid #334155', borderRadius: '8px', padding: '0.65rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Short Summary</label>
                <input
                  type="text"
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  style={{ width: '100%', background: '#0a0f1d', border: '1px solid #334155', borderRadius: '8px', padding: '0.65rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', background: '#0a0f1d', border: '1px solid #334155', borderRadius: '8px', padding: '0.65rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="featured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                />
                <label htmlFor="featured" style={{ color: '#f8fafc', fontSize: '0.9rem', cursor: 'pointer' }}>
                  Feature this skill on public directories
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={savingSkill}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                >
                  <Save size={16} />
                  {savingSkill ? 'Saving...' : 'Save Skill Changes'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Right Column: Careers Using Skill & Relationships */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Careers Using Skill */}
            <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={18} style={{ color: '#38bdf8' }} />
                  Used By Careers ({skill.careers?.length ?? 0})
                </h3>
              </div>

              {(!skill.careers || skill.careers.length === 0) ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                  This skill is not currently mapped to any career. You can map it from any Career management page.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {skill.careers.map(({ career, importance, proficiency_target }) => (
                    <div
                      key={career.id}
                      style={{
                        background: '#0a0f1d',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '0.95rem' }}>{career.name}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background:
                              importance === 'required'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : importance === 'recommended'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(148, 163, 184, 0.15)',
                            color:
                              importance === 'required'
                                ? '#f87171'
                                : importance === 'recommended'
                                ? '#60a5fa'
                                : '#94a3b8',
                          }}>
                            {importance}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Target: {proficiency_target}
                          </span>
                        </div>
                      </div>

                      <Link href={`/admin/careers/${career.id}`}>
                        <Button variant="outline" size="sm" style={{ borderColor: '#334155', color: '#94a3b8', fontSize: '0.8rem' }}>
                          Manage
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Skill Relationships & Dependencies */}
            <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GitBranch size={18} style={{ color: '#c084fc' }} />
                    Skill Relationships
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    Defines prerequisite dependency graph & cross-skill affinities.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddRel}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(147, 51, 234, 0.4)', color: '#c084fc' }}
                >
                  <Plus size={14} />
                  Add Relationship
                </Button>
              </div>

              {/* Prerequisites Section */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Prerequisites (Required Before This Skill)</span>
                </h4>
                {(!skill.prerequisites || skill.prerequisites.length === 0) ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>None specified.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {skill.prerequisites.map((rel) => {
                      const other = rel.source_skill_id === skillId ? rel.target_skill : rel.source_skill;
                      return (
                        <div key={rel.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0f1d', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                          <div>
                            <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem' }}>{other?.name || 'Unknown'}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>({other?.skill_type})</span>
                            {rel.notes && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>{rel.notes}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRelationship(rel.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                            title="Remove prerequisite"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Builds On / Related / Other Relationships */}
              <div>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Related / Associated Skills
                </h4>
                {((skill.related?.length ?? 0) + (skill.builds_on?.length ?? 0) + (skill.commonly_used_with?.length ?? 0) + (skill.alternatives?.length ?? 0)) === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>No secondary relationships defined.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      ...(skill.builds_on || []).map((r) => ({ ...r, label: 'Builds On' })),
                      ...(skill.related || []).map((r) => ({ ...r, label: 'Related' })),
                      ...(skill.commonly_used_with || []).map((r) => ({ ...r, label: 'Commonly Used With' })),
                      ...(skill.alternatives || []).map((r) => ({ ...r, label: 'Alternative' })),
                    ].map((rel) => {
                      const other = rel.source_skill_id === skillId ? rel.target_skill : rel.source_skill;
                      return (
                        <div key={rel.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0f1d', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                          <div>
                            <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem' }}>{other?.name || 'Unknown'}</span>
                            <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', marginLeft: '0.5rem' }}>
                              {rel.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRelationship(rel.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                            title="Remove relationship"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Add Relationship Modal */}
        {isAddRelOpen && (
          <Modal
            isOpen={isAddRelOpen}
            onClose={() => setIsAddRelOpen(false)}
            title="Add Skill Relationship"
          >
            <form onSubmit={handleAddRelationship} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              {relError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <AlertTriangle size={16} />
                  <span>{relError}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Relationship Semantics *
                </label>
                <select
                  value={relDirection}
                  onChange={(e) => setRelDirection(e.target.value as any)}
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
                  <option value="prerequisite_of_this">Target skill is PREREQUISITE for {skill.name}</option>
                  <option value="this_is_prerequisite_for">{skill.name} is PREREQUISITE for Target skill</option>
                  <option value="builds_on">Builds on Target skill</option>
                  <option value="related">Related to Target skill</option>
                  <option value="commonly_used_with">Commonly used with Target skill</option>
                  <option value="alternative">Alternative to Target skill</option>
                </select>
                {(relDirection === 'prerequisite_of_this' || relDirection === 'this_is_prerequisite_for') && (
                  <p style={{ color: '#38bdf8', fontSize: '0.78rem', margin: '0.35rem 0 0 0' }}>
                    ℹ️ Prerequisite edges are checked by server-side cycle detection. Cyclic dependencies will be automatically rejected.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Select Target Skill *
                </label>
                <select
                  value={selectedTargetSkillId}
                  onChange={(e) => setSelectedTargetSkillId(e.target.value)}
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
                  {allSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.skill_type} — {s.category})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2 mt-2">
                  <Button type="button" disabled={pickerPage <= 1} onClick={() => loadAllSkills(pickerPage - 1)}>Previous skills</Button>
                  <span>{pickerPage} / {pickerPages}</span>
                  <Button type="button" disabled={pickerPage >= pickerPages} onClick={() => loadAllSkills(pickerPage + 1)}>Next skills</Button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Strength (1 to 5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={relStrength}
                  onChange={(e) => setRelStrength(parseInt(e.target.value, 10) || 3)}
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
                  Notes / Pedagogical Context (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Master fundamental syntax before framework abstractions"
                  value={relNotes}
                  onChange={(e) => setRelNotes(e.target.value)}
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
                  onClick={() => setIsAddRelOpen(false)}
                  style={{ borderColor: '#334155', color: '#94a3b8' }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={addingRel}
                  style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}
                >
                  {addingRel ? 'Connecting...' : 'Add Relationship'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
        <div className="flex gap-3 mt-4 items-center">
          <Button disabled={relationshipPage <= 1 || loading} onClick={() => setRelationshipPage(relationshipPage - 1)}>Previous relationships</Button>
          <span>Page {relationshipPage} of {Math.max(1, skill?.totalPages || 1)}</span>
          <Button disabled={relationshipPage >= (skill?.totalPages || 1) || loading} onClick={() => setRelationshipPage(relationshipPage + 1)}>Next relationships</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
