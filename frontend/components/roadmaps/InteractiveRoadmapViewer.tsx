'use client';

import React, { useState, useMemo } from 'react';
import type { RoadmapDetail } from '@/types/roadmap';
import { useRoadmapProgress } from '@/hooks/useRoadmapProgress';
import { RoadmapProgressBar } from './RoadmapProgressBar';
import { CareerRoadmapGraph } from './CareerRoadmapGraph';
import { NextStepBanner } from './NextStepBanner';
import { CareerOutcomePanel } from './CareerOutcomePanel';
import {
  getNextStepRecommendation,
  getRoadmapOutcome,
  classifyRoadmap,
} from '@/lib/roadmapTaxonomy';

interface InteractiveRoadmapViewerProps {
  detail: RoadmapDetail;
  initialTopicId?: string;
}

export function InteractiveRoadmapViewer({
  detail,
  initialTopicId,
}: InteractiveRoadmapViewerProps) {
  // Extract all eligible node IDs across sections for deterministic progress calculations
  const eligibleNodeIds = useMemo(() => {
    return detail.sections.flatMap((s) => s.nodes.map((n) => n.id));
  }, [detail.sections]);

  const { statuses, stats, toggleStatus, isLoggedIn } = useRoadmapProgress(
    detail.roadmap.slug,
    eligibleNodeIds
  );

  // Controlled active topic selection between NextStepBanner and Graph
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialTopicId || null
  );

  // Determine immediate next recommended learning step
  const nextStepRecommendation = useMemo(() => {
    return getNextStepRecommendation(detail, statuses);
  }, [detail, statuses]);

  // Determine roadmap classification and outcome
  const classification = useMemo(() => {
    return classifyRoadmap(detail.roadmap.slug, detail.roadmap.category);
  }, [detail.roadmap.slug, detail.roadmap.category]);

  const careerOutcome = useMemo(() => {
    return getRoadmapOutcome(detail.roadmap);
  }, [detail.roadmap]);

  const isAllCompleted = stats.totalTopics > 0 && stats.progressPercent === 100;

  return (
    <div className="w-full space-y-8">
      {/* ── STICKY PROGRESS BAR ───────────────────────────────────────────── */}
      <RoadmapProgressBar
        roadmapTitle={detail.roadmap.title}
        stats={stats}
        isLoggedIn={isLoggedIn}
      />

      {/* ── WHAT SHOULD I LEARN NEXT? COMPONENT ───────────────────────────── */}
      <NextStepBanner
        recommendation={nextStepRecommendation}
        onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
        isAllCompleted={isAllCompleted}
      />

      {/* ── VISUAL ROADMAP MAP WORKSPACE ──────────────────────────────────── */}
      <CareerRoadmapGraph
        detail={detail}
        statuses={statuses}
        onToggleStatus={toggleStatus}
        initialTopicId={initialTopicId}
        selectedNodeId={selectedNodeId}
        onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
      />

      {/* ── CAREER OUTCOME & PORTFOLIO PANEL ──────────────────────────────── */}
      {classification === 'ROLE' && (
        <section className="pt-4">
          <CareerOutcomePanel
            roadmapTitle={detail.roadmap.title}
            outcome={careerOutcome}
          />
        </section>
      )}
    </div>
  );
}
