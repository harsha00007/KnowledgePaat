"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { NodeDetailDrawer } from '@/components/roadmaps/NodeDetailDrawer';
import {
  Clock,
  Sparkles,
  GitBranch,
  BookOpen,
  Milestone,
  Flag,
  CheckCircle2,
  Star,
  Layers,
  ArrowDown,
  ArrowRight,
  Compass,
  Check,
  ChevronRight,
  Eye,
  Info,
  Zap,
  CornerDownRight,
} from 'lucide-react';
import type {
  RoadmapDetail,
  CareerRoadmapNode,
  CareerRoadmapNodeTopic,
  CareerRoadmapSection,
  TopicProgressStatus,
  ValidTopicStatus,
} from '@/types/roadmap';
import type { CareerNodeResourceView } from '@/types/resource';

interface CareerRoadmapGraphProps {
  detail: RoadmapDetail;
  statuses?: Record<string, TopicProgressStatus>;
  onToggleStatus?: (nodeId: string, status: ValidTopicStatus) => void;
  initialTopicId?: string;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
}

export function CareerRoadmapGraph({
  detail,
  statuses = {},
  onToggleStatus,
  initialTopicId,
  selectedNodeId: controlledSelectedNodeId,
  onSelectNode,
}: CareerRoadmapGraphProps) {
  const { roadmap, sections, relationships } = detail;

  // Selected node for detail drawer (controlled or uncontrolled)
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(
    initialTopicId || null
  );

  const selectedNodeId =
    controlledSelectedNodeId !== undefined
      ? controlledSelectedNodeId
      : internalSelectedNodeId;

  const setSelectedNodeId = (id: string | null) => {
    setInternalSelectedNodeId(id);
    onSelectNode?.(id);
  };

  // Quick lookup map of all nodes by id
  const nodeMap = useMemo(() => {
    const map = new Map<
      string,
      CareerRoadmapNode & {
        topics?: CareerRoadmapNodeTopic[];
        resources?: CareerNodeResourceView[];
      }
    >();
    for (const sec of sections) {
      for (const node of sec.nodes) {
        map.set(node.id, node);
      }
    }
    return map;
  }, [sections]);

  // Selected node object
  const selectedNode = useMemo(() => {
    return selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;
  }, [selectedNodeId, nodeMap]);

  // Compute relationship sets for the currently selected node
  const { prerequisiteNodeIds, nextNodeIds, prerequisites, nextNodes } = useMemo(() => {
    if (!selectedNodeId) {
      return {
        prerequisiteNodeIds: new Set<string>(),
        nextNodeIds: new Set<string>(),
        prerequisites: [],
        nextNodes: [],
      };
    }

    const prereqIds = new Set<string>();
    const nextIds = new Set<string>();
    const prereqTitles: string[] = [];
    const nextTitles: string[] = [];

    for (const rel of relationships) {
      if (rel.target_node_id === selectedNodeId) {
        prereqIds.add(rel.source_node_id);
        const node = nodeMap.get(rel.source_node_id);
        if (node) prereqTitles.push(node.title);
      }
      if (rel.source_node_id === selectedNodeId) {
        nextIds.add(rel.target_node_id);
        const node = nodeMap.get(rel.target_node_id);
        if (node) nextTitles.push(node.title);
      }
    }

    return {
      prerequisiteNodeIds: prereqIds,
      nextNodeIds: nextIds,
      prerequisites: prereqTitles,
      nextNodes: nextTitles,
    };
  }, [selectedNodeId, relationships, nodeMap]);

  // Handler to select node by title (used inside detail drawer for links)
  const handleSelectNodeByTitle = useCallback(
    (title: string) => {
      for (const sec of sections) {
        for (const n of sec.nodes) {
          if (n.title.toLowerCase() === title.toLowerCase()) {
            setSelectedNodeId(n.id);
            return;
          }
        }
      }
    },
    [sections]
  );

  // Deep-link topic opening
  React.useEffect(() => {
    if (initialTopicId && nodeMap.has(initialTopicId)) {
      setSelectedNodeId(initialTopicId);
    }
  }, [initialTopicId, nodeMap]);

  // Jump smoothly to a stage on click
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(`section-anchor-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Helper for Node Type Icons
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'MILESTONE':
        return <Milestone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'CHECKPOINT':
        return <Flag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'SKILL':
        return <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const h = minutes / 60;
      return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
    }
    return `${minutes}m`;
  };

  if (!sections || sections.length === 0) {
    return (
      <div className="py-20 text-center text-[var(--color-text-secondary)]">
        <p className="text-base font-semibold">Roadmap curriculum is being finalized.</p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
          Check back shortly to view the structured skill map.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* ── WORKSPACE MAP WRAPPER ─────────────────────────────────────────── */}
      <div className="w-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden relative">
        {/* Subtle Map Canvas Background Pattern */}
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000000_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px]"
          aria-hidden="true"
        />

        {/* Workspace Toolbar / Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/70 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
          {/* Stage Fast-Jump Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mr-1 shrink-0">
              Stages:
            </span>
            {sections.map((sec, idx) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-900 border border-[var(--color-border)] hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
              >
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="truncate max-w-[100px]">{sec.title.replace(/^\d+\s*/, '')}</span>
              </button>
            ))}
          </div>

          {/* Interactive Legend */}
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-tertiary)] flex-wrap shrink-0">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Skill</span>
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Topic</span>
            </span>
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Learning</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>Skip</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Resource</span>
            </span>
          </div>
        </div>

        {/* ── ROADMAP CANVAS CONTENT ────────────────────────────────────────── */}
        <div className="p-4 sm:p-8 md:p-12 lg:p-16 relative z-10">
          {/* Continuous Central Trunk Spine (Desktop) */}
          <div
            className="hidden md:block absolute left-1/2 top-12 bottom-20 -translate-x-1/2 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-400 to-purple-500 opacity-25 dark:opacity-30 pointer-events-none"
            aria-hidden="true"
          />

          {/* Continuous Mobile Timeline Rail (< md) */}
          <div
            className="md:hidden absolute left-5 top-8 bottom-12 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-400 to-purple-500 opacity-30 pointer-events-none"
            aria-hidden="true"
          />

          {/* ── SECTIONS LOOP ──────────────────────────────────────────────── */}
          <div className="space-y-16 sm:space-y-20 relative">
            {sections.map((section, sIndex) => {
              const nodeCount = section.nodes.length;

              return (
                <div
                  key={section.id}
                  id={`section-anchor-${section.id}`}
                  className="relative scroll-mt-24"
                >
                  {/* ── SECTION STAGE ANCHOR MARKER ───────────────────────── */}
                  <div className="flex items-center justify-start md:justify-center mb-8 pl-12 md:pl-0 relative z-20">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/10">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-blue-600 text-white dark:bg-blue-500">
                        {String(section.sequence).padStart(2, '0')}
                      </span>
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                        {section.title.replace(/^\d+\s*/, '')}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--color-text-tertiary)]">
                        {nodeCount} {nodeCount === 1 ? 'Skill' : 'Skills'}
                      </span>
                    </div>

                    {/* Desktop Center Pulse Node Marker */}
                    <div
                      className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-sm z-30"
                      aria-hidden="true"
                    />

                    {/* Mobile Timeline Node Marker */}
                    <div
                      className="md:hidden absolute left-5 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 z-30"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Section Description (if provided) */}
                  {section.description && (
                    <p className="text-xs text-center text-[var(--color-text-secondary)] max-w-xl mx-auto mb-8 pl-12 md:pl-0">
                      {section.description}
                    </p>
                  )}

                  {/* ── DESKTOP BRANCHING NODES CONTAINER (>= md) ─────────── */}
                  <div className="hidden md:block relative z-20 max-w-5xl mx-auto">
                    {/* Visual Branch Rails (SVG Connectors for multiple nodes) */}
                    {nodeCount > 1 && (
                      <div className="flex justify-center mb-4" aria-hidden="true">
                        <div className="h-4 w-0.5 bg-blue-500/30" />
                      </div>
                    )}

                    {/* Dynamic Responsive Multi-Column Grid */}
                    <div
                      className={`grid gap-4 justify-center items-stretch ${
                        nodeCount === 1
                          ? 'grid-cols-1 max-w-xs mx-auto'
                          : nodeCount === 2
                          ? 'grid-cols-2 max-w-2xl mx-auto'
                          : nodeCount === 3
                          ? 'grid-cols-3 max-w-4xl mx-auto'
                          : 'grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto'
                      }`}
                    >
                      {section.nodes.map((node) => {
                        const isSelected = selectedNodeId === node.id;
                        const isPrereq = prerequisiteNodeIds.has(node.id);
                        const isNext = nextNodeIds.has(node.id);
                        const isDimmed =
                          selectedNodeId !== null &&
                          !isSelected &&
                          !isPrereq &&
                          !isNext;
                        const nodeStatus = statuses[node.id] || null;
                        const hasResources = Boolean(
                          node.resources && node.resources.length > 0
                        );
                        const hasRecommendedResource = Boolean(
                          node.resources?.some((r) => r.is_recommended)
                        );

                        return (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => setSelectedNodeId(node.id)}
                            aria-label={`${node.title} - ${nodeStatus ? nodeStatus : 'Not started'}`}
                            aria-pressed={nodeStatus === 'done' || nodeStatus === 'learning'}
                            className={`group relative text-left rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                              isSelected
                                ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/40 shadow-xl shadow-blue-500/15 scale-[1.02] z-30'
                                : isPrereq
                                ? 'bg-purple-50/70 dark:bg-purple-950/50 border-purple-400 ring-2 ring-purple-400/40 shadow-md z-20'
                                : isNext
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-400/40 shadow-md z-20'
                                : nodeStatus === 'done'
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-1 ring-emerald-500/30'
                                : nodeStatus === 'learning'
                                ? 'bg-purple-50/60 dark:bg-purple-950/40 border-purple-500 dark:border-purple-600 ring-1 ring-purple-500/30'
                                : nodeStatus === 'skip'
                                ? 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-300 dark:border-slate-700 opacity-60'
                                : isDimmed
                                ? 'opacity-40 hover:opacity-90 bg-white dark:bg-slate-900 border-[var(--color-border)]'
                                : 'bg-white dark:bg-slate-900 border-[var(--color-border)] hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10'
                            }`}
                          >
                            {/* Top Meta: Icon + Type Badge + Difficulty */}
                            <div>
                              <div className="flex items-center justify-between gap-1.5 mb-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                                  {getNodeIcon(node.node_type)}
                                  <span className="font-mono uppercase text-[10px] tracking-wider">
                                    {node.node_type}
                                  </span>
                                </span>

                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                    node.difficulty === 'Beginner'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : node.difficulty === 'Intermediate'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                      : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                  }`}
                                >
                                  {node.difficulty}
                                </span>
                              </div>

                              {/* Title */}
                              <h4
                                className={`text-xs sm:text-sm font-bold transition-colors line-clamp-2 leading-snug ${
                                  nodeStatus === 'skip'
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-[var(--color-text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                }`}
                              >
                                {node.title}
                              </h4>
                            </div>

                            {/* Bottom Row: Estimated Duration & Resource Badge */}
                            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[var(--color-border)]/70 text-[11px] text-[var(--color-text-tertiary)]">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                                <span>{formatDuration(node.estimated_minutes)}</span>
                              </span>

                              {/* Highlights & Status Badges */}
                              {isSelected ? (
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                                  <span>Selected</span>
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              ) : nodeStatus === 'done' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Done</span>
                                </span>
                              ) : nodeStatus === 'learning' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 rounded">
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>Learning</span>
                                </span>
                              ) : nodeStatus === 'skip' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  <CornerDownRight className="w-2.5 h-2.5" />
                                  <span>Skipped</span>
                                </span>
                              ) : isPrereq ? (
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 rounded">
                                  Prereq
                                </span>
                              ) : isNext ? (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                  Next Step
                                </span>
                              ) : hasResources ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                                  <Star className="w-2.5 h-2.5 fill-current text-amber-500" />
                                  <span>{hasRecommendedResource ? 'Guide' : 'Resources'}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-[var(--color-text-tertiary)] group-hover:text-blue-600 transition-colors">
                                  Details →
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── MOBILE READABLE TIMELINE (< md) ───────────────────── */}
                  <div className="md:hidden pl-12 space-y-3 relative z-20">
                    {section.nodes.map((node, nIndex) => {
                      const isSelected = selectedNodeId === node.id;
                      const nodeStatus = statuses[node.id] || null;
                      const hasResources = Boolean(
                        node.resources && node.resources.length > 0
                      );

                      return (
                        <div key={node.id} className="relative">
                          {/* Branch Connector Line */}
                          <div
                            className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-0.5 bg-blue-500/30"
                            aria-hidden="true"
                          />

                          <button
                            type="button"
                            onClick={() => setSelectedNodeId(node.id)}
                            aria-label={`${node.title} - ${nodeStatus ? nodeStatus : 'Not started'}`}
                            aria-pressed={nodeStatus === 'done' || nodeStatus === 'learning'}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 ring-2 ring-blue-500/30'
                                : nodeStatus === 'done'
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30'
                                : nodeStatus === 'learning'
                                ? 'bg-purple-50/60 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/30'
                                : nodeStatus === 'skip'
                                ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 opacity-60'
                                : 'bg-white dark:bg-slate-900 border-[var(--color-border)] active:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {getNodeIcon(node.node_type)}
                                <h4
                                  className={`text-xs font-bold truncate ${
                                    nodeStatus === 'skip'
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-[var(--color-text-primary)]'
                                  }`}
                                >
                                  {node.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)] flex-wrap">
                                <span>{node.difficulty}</span>
                                <span>•</span>
                                <span>{formatDuration(node.estimated_minutes)}</span>
                                {nodeStatus === 'done' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5" />
                                      Done
                                    </span>
                                  </>
                                )}
                                {nodeStatus === 'learning' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-0.5">
                                      <Zap className="w-2.5 h-2.5" />
                                      Learning
                                    </span>
                                  </>
                                )}
                                {nodeStatus === 'skip' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-500 font-medium">Skipped</span>
                                  </>
                                )}
                                {hasResources && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-600 flex items-center gap-0.5 font-medium">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      Resource
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Connecting Downward Line between Sections */}
                  {sIndex < sections.length - 1 && (
                    <div className="hidden md:flex justify-center pt-10" aria-hidden="true">
                      <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-900 border border-[var(--color-border)] flex items-center justify-center text-blue-500 shadow-xs z-20">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── FINAL JOB READY GOAL MILESTONE ────────────────────────────── */}
          <div className="pt-16 sm:pt-20 flex justify-center pl-12 md:pl-0 relative z-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Career Ready Milestone Achieved</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT-SIDE SLIDE-OVER DETAIL DRAWER ───────────────────────────── */}
      <NodeDetailDrawer
        isOpen={Boolean(selectedNode)}
        onClose={() => setSelectedNodeId(null)}
        node={selectedNode}
        prerequisites={prerequisites}
        nextNodes={nextNodes}
        onSelectNodeByTitle={handleSelectNodeByTitle}
        currentStatus={selectedNodeId ? statuses[selectedNodeId] || null : null}
        onToggleStatus={onToggleStatus}
      />
    </div>
  );
}
