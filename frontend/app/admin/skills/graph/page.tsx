"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  GitBranch,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ExternalLink,
  Layers,
  Cpu,
  Compass,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import type { SkillGraphData, SkillGraphNode, SkillGraphEdge } from '@/types/careerSkillGraph';

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

export default function AdminSkillGraphPage() {
  const [graphData, setGraphData] = useState<SkillGraphData>({ nodes: [], edges: [] });
  const [page, setPage] = useState(1);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterRelType, setFilterRelType] = useState<string>('all');

  const fetchGraph = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const res = await fetch(`/api/admin/skills/graph?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
        setGraphError(null);
        if (data.nodes?.length > 0 && !selectedNodeId) {
          setSelectedNodeId(data.nodes[0].id);
        }
      }
      else setGraphError('Unable to load graph.');
    } catch {
      setGraphError('Unable to load graph.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [categoryFilter, page]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter((node) => {
      const matchSearch =
        !search.trim() ||
        node.name.toLowerCase().includes(search.toLowerCase()) ||
        node.slug.toLowerCase().includes(search.toLowerCase()) ||
        node.skill_type.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [graphData.nodes, search]);

  const selectedNode = useMemo(() => {
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graphData.nodes, selectedNodeId]);

  // Edges related to selected node
  const selectedNodeRelationships = useMemo(() => {
    if (!selectedNodeId) return { prerequisites: [], unlocks: [], others: [] };

    const nodeMap = new Map(graphData.nodes.map((n) => [n.id, n]));

    // Prerequisites: source -> target(selected), relationship = 'prerequisite'
    const prerequisites: Array<{ edge: SkillGraphEdge; skill: SkillGraphNode }> = [];
    // Unlocks: source(selected) -> target, relationship = 'prerequisite'
    const unlocks: Array<{ edge: SkillGraphEdge; skill: SkillGraphNode }> = [];
    // Others
    const others: Array<{ edge: SkillGraphEdge; skill: SkillGraphNode; direction: 'outgoing' | 'incoming' }> = [];

    for (const edge of graphData.edges) {
      if (edge.relationship_type === 'prerequisite') {
        if (edge.target === selectedNodeId && nodeMap.has(edge.source)) {
          prerequisites.push({ edge, skill: nodeMap.get(edge.source)! });
        } else if (edge.source === selectedNodeId && nodeMap.has(edge.target)) {
          unlocks.push({ edge, skill: nodeMap.get(edge.target)! });
        }
      } else {
        if (edge.source === selectedNodeId && nodeMap.has(edge.target)) {
          others.push({ edge, skill: nodeMap.get(edge.target)!, direction: 'outgoing' });
        } else if (edge.target === selectedNodeId && nodeMap.has(edge.source)) {
          others.push({ edge, skill: nodeMap.get(edge.source)!, direction: 'incoming' });
        }
      }
    }

    return { prerequisites, unlocks, others };
  }, [graphData, selectedNodeId]);

  // Foundational nodes (nodes with 0 prerequisites)
  const foundationalNodes = useMemo(() => {
    const hasIncomingPrereq = new Set<string>();
    for (const edge of graphData.edges) {
      if (edge.relationship_type === 'prerequisite') {
        hasIncomingPrereq.add(edge.target);
      }
    }
    return filteredNodes.filter((n) => !hasIncomingPrereq.has(n.id));
  }, [filteredNodes, graphData.edges]);

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <Link href="/admin/skills">
                <Button variant="outline" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: '#334155', color: '#94a3b8' }}>
                  <ChevronLeft size={16} />
                  Skill Catalog
                </Button>
              </Link>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                Skill Graph Inspector
              </h1>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              Interactive dependency graph validator: inspect prerequisite chains, cross-skill linkages, and cycle prevention.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button
              variant="outline"
              onClick={fetchGraph}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#334155', color: '#94a3b8' }}
            >
              <RefreshCw size={14} />
              Reload Graph
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search graph nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.6rem 0.85rem 0.6rem 2.25rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                background: '#0a0f1d',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.6rem 1rem',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                minWidth: '180px',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: 'auto' }}>
              Showing <strong>{filteredNodes.length}</strong> nodes • <strong>{graphData.edges.length}</strong> relationships
            </div>
          </div>
        </Card>

        {/* Main 2-Column Inspector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(360px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Visual Node Dependency Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Foundational Skills Strip */}
            <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <Sparkles size={16} style={{ color: '#38bdf8' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Foundational Root Skills (No Prerequisites)
                </h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {foundationalNodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{
                        background: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#0a0f1d',
                        border: `1px solid ${isSelected ? '#38bdf8' : '#334155'}`,
                        borderRadius: '8px',
                        padding: '0.45rem 0.75rem',
                        color: isSelected ? '#38bdf8' : '#e2e8f0',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {node.name}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Complete Graph Nodes Grid */}
            <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={18} style={{ color: '#c084fc' }} />
                  Knowledge Graph Nodes ({filteredNodes.length})
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Click any node to inspect dependency chain</span>
              </div>

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
                  <p>Building graph topology...</p>
                </div>
              ) : filteredNodes.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>No matching graph nodes found.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {filteredNodes.map((node) => {
                    const isSelected = node.id === selectedNodeId;
                    const incomingPrereqCount = graphData.edges.filter(
                      (e) => e.target === node.id && e.relationship_type === 'prerequisite'
                    ).length;
                    const outgoingPrereqCount = graphData.edges.filter(
                      (e) => e.source === node.id && e.relationship_type === 'prerequisite'
                    ).length;

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        style={{
                          background: isSelected ? 'rgba(59, 130, 246, 0.12)' : '#0a0f1d',
                          border: `1px solid ${isSelected ? '#3b82f6' : '#1e293b'}`,
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.25)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            background: 'rgba(148, 163, 184, 0.1)',
                            color: '#94a3b8',
                          }}>
                            {node.skill_type}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            background: node.difficulty === 'beginner' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: node.difficulty === 'beginner' ? '#34d399' : '#fbbf24',
                          }}>
                            {node.difficulty}
                          </span>
                        </div>

                        <div style={{ fontWeight: '700', color: isSelected ? '#60a5fa' : '#f8fafc', fontSize: '0.95rem' }}>
                          {node.name}
                        </div>

                        {/* Edge Counters */}
                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.6rem', fontSize: '0.75rem', color: '#64748b' }}>
                          <span title="Prerequisites required to learn this" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <ArrowLeft size={12} style={{ color: incomingPrereqCount > 0 ? '#fbbf24' : '#475569' }} />
                            {incomingPrereqCount} prereqs
                          </span>
                          <span title="Unlocks dependent skills" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <ArrowRight size={12} style={{ color: outgoingPrereqCount > 0 ? '#34d399' : '#475569' }} />
                            {outgoingPrereqCount} unlocks
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Active Node Dependency Inspector */}
          <div>
            {selectedNode ? (
              <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
                <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: '600', letterSpacing: '0.05em' }}>
                        Selected Graph Focus
                      </span>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc', margin: '0.25rem 0 0 0' }}>
                        {selectedNode.name}
                      </h2>
                      <p style={{ color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace', margin: '0.2rem 0 0 0' }}>
                        /{selectedNode.slug}
                      </p>
                    </div>

                    <Link href={`/admin/skills/${selectedNode.id}`}>
                      <Button variant="outline" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: '#334155', color: '#f8fafc', fontSize: '0.8rem' }}>
                        Manage
                        <ExternalLink size={12} />
                      </Button>
                    </Link>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#0a0f1d', color: '#94a3b8', border: '1px solid #1e293b' }}>
                      Category: {selectedNode.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#0a0f1d', color: '#94a3b8', border: '1px solid #1e293b' }}>
                      Type: {selectedNode.skill_type}
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#0a0f1d', color: '#94a3b8', border: '1px solid #1e293b' }}>
                      Difficulty: {selectedNode.difficulty}
                    </span>
                  </div>
                </div>

                {/* Prerequisites (Incoming) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowLeft size={14} />
                    Required Prerequisites ({selectedNodeRelationships.prerequisites.length})
                  </h4>
                  {selectedNodeRelationships.prerequisites.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>
                      None. This is a foundational root skill.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {selectedNodeRelationships.prerequisites.map(({ skill, edge }) => (
                        <div
                          key={edge.id}
                          onClick={() => setSelectedNodeId(skill.id)}
                          style={{
                            background: '#0a0f1d',
                            border: '1px solid #1e293b',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.85rem' }}>{skill.name}</span>
                          <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>Must learn first</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unlocks (Outgoing Prereqs) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#34d399', letterSpacing: '0.05em', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowRight size={14} />
                    Unlocks Downstream ({selectedNodeRelationships.unlocks.length})
                  </h4>
                  {selectedNodeRelationships.unlocks.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>
                      No skills explicitly list this as a prerequisite yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {selectedNodeRelationships.unlocks.map(({ skill, edge }) => (
                        <div
                          key={edge.id}
                          onClick={() => setSelectedNodeId(skill.id)}
                          style={{
                            background: '#0a0f1d',
                            border: '1px solid #1e293b',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.85rem' }}>{skill.name}</span>
                          <span style={{ color: '#34d399', fontSize: '0.75rem' }}>Direct downstream</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cross-Domain / Secondary Relationships */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>
                    Related / Complementary ({selectedNodeRelationships.others.length})
                  </h4>
                  {selectedNodeRelationships.others.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>
                      No cross-domain connections.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {selectedNodeRelationships.others.map(({ skill, edge }) => (
                        <div
                          key={edge.id}
                          onClick={() => setSelectedNodeId(skill.id)}
                          style={{
                            background: '#0a0f1d',
                            border: '1px solid #1e293b',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.85rem' }}>{skill.name}</span>
                          <span style={{ color: '#c084fc', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                            {edge.relationship_type.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card style={{ background: '#131b2e', border: '1px solid #1e293b', padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <Info size={24} style={{ margin: '0 auto 0.5rem auto' }} />
                <p>Select a node in the graph grid to inspect its prerequisites and dependents.</p>
              </Card>
            )}
          </div>
        </div>
        {graphError && <p role="alert">{graphError}</p>}
        <div className="flex gap-3 mt-4 items-center">
          <Button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Graph page {page}; edges connect nodes on this page.</span>
          <Button disabled={page >= (graphData.totalPages || 1) || loading} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
