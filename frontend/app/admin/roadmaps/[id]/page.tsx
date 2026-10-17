"use client";

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import {
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GitBranch,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Link2,
  Tag,
  Clock3,
  BookOpen,
  Star,
  Search,
  Check,
  Loader2,
  Globe,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  CareerRoadmap,
  CareerRoadmapSection,
  CareerRoadmapNode,
  CareerRoadmapNodeTopic,
  CareerRoadmapNodeRelationship,
  NodeType,
  NodeDifficulty,
  RelationshipType,
  RoadmapQualityReport,
} from '@/types/roadmap';
import type {
  CareerNodeResourceView,
  CareerResource,
  ResourceType,
  ResourceDifficulty,
} from '@/types/resource';
import { VALID_RESOURCE_TYPES, VALID_RESOURCE_DIFFICULTIES } from '@/types/resource';

interface SectionWithNodes extends CareerRoadmapSection {
  nodes: Array<
    CareerRoadmapNode & {
      topics: CareerRoadmapNodeTopic[];
      resources?: CareerNodeResourceView[];
    }
  >;
}

const NODE_TYPES: NodeType[] = ['SKILL', 'TOPIC', 'MILESTONE', 'CHECKPOINT'];
const NODE_DIFFICULTIES: NodeDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];
const RELATIONSHIP_TYPES: RelationshipType[] = [
  'PREREQUISITE',
  'NEXT',
  'RECOMMENDED',
  'OPTIONAL',
  'ALTERNATIVE',
];

export default function AdminRoadmapBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const roadmapId = resolvedParams.id;
  const router = useRouter();

  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [sections, setSections] = useState<SectionWithNodes[]>([]);
  const [relationships, setRelationships] = useState<CareerRoadmapNodeRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab: structure vs relationships
  const [activeTab, setActiveTab] = useState<'structure' | 'relationships'>('structure');

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // ── Section Modal State ──────────────────────────────────────────────────
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CareerRoadmapSection | null>(null);
  const [sectionForm, setSectionForm] = useState({
    title: '',
    slug: '',
    description: '',
    is_required: true,
    is_active: true,
  });
  const [savingSection, setSavingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  // ── Node Modal State ─────────────────────────────────────────────────────
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [editingNode, setEditingNode] = useState<CareerRoadmapNode | null>(null);
  const [nodeForm, setNodeForm] = useState({
    title: '',
    slug: '',
    description: '',
    node_type: 'TOPIC' as NodeType,
    difficulty: 'Beginner' as NodeDifficulty,
    estimated_minutes: 60,
    is_required: true,
    is_active: true,
    topicsText: '',
  });
  const [savingNode, setSavingNode] = useState(false);
  const [nodeError, setNodeError] = useState<string | null>(null);

  // ── Relationship Modal State ─────────────────────────────────────────────
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [relForm, setRelForm] = useState({
    source_node_id: '',
    target_node_id: '',
    relationship_type: 'PREREQUISITE' as RelationshipType,
  });
  const [savingRel, setSavingRel] = useState(false);
  const [relError, setRelError] = useState<string | null>(null);

  // ── Node Resources State ──────────────────────────────────────────────────
  const [managingResourceNode, setManagingResourceNode] = useState<
    (CareerRoadmapNode & { topics: CareerRoadmapNodeTopic[]; resources?: CareerNodeResourceView[] }) | null
  >(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceModalTab, setResourceModalTab] = useState<'attached' | 'search' | 'create'>('attached');
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const [availableResources, setAvailableResources] = useState<CareerResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceActionLoading, setResourceActionLoading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);

  // ── Quality Checker State ─────────────────────────────────────────────────
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [qualityReport, setQualityReport] = useState<RoadmapQualityReport | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);
  const [togglingPublish, setTogglingPublish] = useState(false);

  const [newResourceForm, setNewResourceForm] = useState<{
    title: string;
    description: string;
    resource_type: ResourceType;
    provider: string;
    url: string;
    thumbnail_url: string;
    category: string;
    difficulty: ResourceDifficulty;
    duration_minutes: number;
    is_free: boolean;
    price: string;
    currency: string;
    is_recommended: boolean;
    priority: number;
  }>({
    title: '',
    description: '',
    resource_type: 'YOUTUBE',
    provider: '',
    url: '',
    thumbnail_url: '',
    category: '',
    difficulty: 'Beginner',
    duration_minutes: 60,
    is_free: true,
    price: '',
    currency: 'INR',
    is_recommended: false,
    priority: 1,
  });

  // ── Fetch Roadmap Detail ─────────────────────────────────────────────────
  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/roadmaps/${roadmapId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load roadmap.');
      }
      const data = await res.json();
      setRoadmap(data.roadmap);
      setSections(data.sections || []);
      setRelationships(data.relationships || []);

      // Auto-expand all sections by default
      const exp: Record<string, boolean> = {};
      for (const s of data.sections || []) {
        exp[s.id] = true;
      }
      setExpandedSections((prev) => ({ ...exp, ...prev }));
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Sync managingResourceNode with fresh data whenever sections update
  useEffect(() => {
    if (managingResourceNode) {
      const allNodes = sections.flatMap((s) => s.nodes);
      const found = allNodes.find((n) => n.id === managingResourceNode.id);
      if (found) {
        setManagingResourceNode(found);
      }
    }
  }, [sections, managingResourceNode?.id]);

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // ── Quality Checker Actions ──────────────────────────────────────────────
  const handleOpenQualityCheck = async () => {
    setIsQualityModalOpen(true);
    setQualityLoading(true);
    setQualityError(null);
    try {
      const res = await fetch(`/api/admin/roadmaps/${roadmapId}/quality`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to evaluate roadmap quality.');
      }
      const data = await res.json();
      setQualityReport(data.report);
    } catch (err: any) {
      setQualityError(err.message || 'Error running quality check.');
    } finally {
      setQualityLoading(false);
    }
  };

  const handleTogglePublish = async (publish: boolean) => {
    try {
      setTogglingPublish(true);
      const res = await fetch(`/api/admin/roadmaps/${roadmapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: publish }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update publication status.');
      }
      setRoadmap(data.roadmap || (roadmap ? { ...roadmap, is_active: publish } : null));
      // Re-run quality check to refresh
      await handleOpenQualityCheck();
    } catch (err: any) {
      setQualityError(err.message || 'Publication status toggle failed.');
    } finally {
      setTogglingPublish(false);
    }
  };

  // ── Section Actions ──────────────────────────────────────────────────────
  const openAddSection = () => {
    setEditingSection(null);
    setSectionForm({
      title: '',
      slug: '',
      description: '',
      is_required: true,
      is_active: true,
    });
    setSectionError(null);
    setIsSectionModalOpen(true);
  };

  const openEditSection = (s: CareerRoadmapSection) => {
    setEditingSection(s);
    setSectionForm({
      title: s.title,
      slug: s.slug,
      description: s.description || '',
      is_required: s.is_required,
      is_active: s.is_active,
    });
    setSectionError(null);
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection(true);
    setSectionError(null);

    try {
      const url = editingSection
        ? `/api/admin/roadmaps/${roadmapId}/sections/${editingSection.id}`
        : `/api/admin/roadmaps/${roadmapId}/sections`;
      const method = editingSection ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save section.');
      }

      setIsSectionModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      setSectionError(err.message);
    } finally {
      setSavingSection(false);
    }
  };

  const handleMoveSection = async (section: CareerRoadmapSection, direction: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === section.id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sections.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const targetSection = sections[targetIdx];

    try {
      // Swap sequences
      await Promise.all([
        fetch(`/api/admin/roadmaps/${roadmapId}/sections/${section.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence: targetSection.sequence }),
        }),
        fetch(`/api/admin/roadmaps/${roadmapId}/sections/${targetSection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence: section.sequence }),
        }),
      ]);

      fetchDetail();
    } catch (err) {
      console.error('Failed to reorder sections', err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      const res = await fetch(`/api/admin/roadmaps/${roadmapId}/sections/${sectionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete section.');
        return;
      }
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to delete section.');
    }
  };

  // ── Node Actions ─────────────────────────────────────────────────────────
  const openAddNode = (sectionId: string) => {
    setTargetSectionId(sectionId);
    setEditingNode(null);
    setNodeForm({
      title: '',
      slug: '',
      description: '',
      node_type: 'TOPIC',
      difficulty: 'Beginner',
      estimated_minutes: 60,
      is_required: true,
      is_active: true,
      topicsText: '',
    });
    setNodeError(null);
    setIsNodeModalOpen(true);
  };

  const openEditNode = (node: CareerRoadmapNode & { topics?: CareerRoadmapNodeTopic[] }) => {
    setTargetSectionId(node.section_id);
    setEditingNode(node);
    setNodeForm({
      title: node.title,
      slug: node.slug,
      description: node.description || '',
      node_type: node.node_type,
      difficulty: node.difficulty,
      estimated_minutes: node.estimated_minutes,
      is_required: node.is_required,
      is_active: node.is_active,
      topicsText: (node.topics || []).map((t) => t.topic).join(', '),
    });
    setNodeError(null);
    setIsNodeModalOpen(true);
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNode(true);
    setNodeError(null);

    const topics = nodeForm.topicsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const url = editingNode
        ? `/api/admin/roadmaps/${roadmapId}/nodes/${editingNode.id}`
        : `/api/admin/roadmaps/${roadmapId}/nodes`;
      const method = editingNode ? 'PATCH' : 'POST';

      const payload = {
        section_id: targetSectionId,
        title: nodeForm.title,
        slug: nodeForm.slug,
        description: nodeForm.description,
        node_type: nodeForm.node_type,
        difficulty: nodeForm.difficulty,
        estimated_minutes: Number(nodeForm.estimated_minutes),
        is_required: nodeForm.is_required,
        is_active: nodeForm.is_active,
        topics,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save node.');
      }

      setIsNodeModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      setNodeError(err.message);
    } finally {
      setSavingNode(false);
    }
  };

  const handleMoveNode = async (
    sectionNodes: CareerRoadmapNode[],
    node: CareerRoadmapNode,
    direction: 'up' | 'down'
  ) => {
    const idx = sectionNodes.findIndex((n) => n.id === node.id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sectionNodes.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const targetNode = sectionNodes[targetIdx];

    try {
      await Promise.all([
        fetch(`/api/admin/roadmaps/${roadmapId}/nodes/${node.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence: targetNode.sequence }),
        }),
        fetch(`/api/admin/roadmaps/${roadmapId}/nodes/${targetNode.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence: node.sequence }),
        }),
      ]);

      fetchDetail();
    } catch (err) {
      console.error('Failed to reorder nodes', err);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node?')) return;
    try {
      const res = await fetch(`/api/admin/roadmaps/${roadmapId}/nodes/${nodeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete node.');
        return;
      }
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to delete node.');
    }
  };

  // ── Relationship Actions ─────────────────────────────────────────────────
  const allNodesList = sections.flatMap((s) => s.nodes);

  const openAddRelModal = (defaultSourceId?: string) => {
    setRelForm({
      source_node_id: defaultSourceId || (allNodesList[0]?.id ?? ''),
      target_node_id: '',
      relationship_type: 'PREREQUISITE',
    });
    setRelError(null);
    setIsRelModalOpen(true);
  };

  const handleSaveRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRel(true);
    setRelError(null);

    if (relForm.source_node_id === relForm.target_node_id) {
      setRelError('Source and target node cannot be the same node.');
      setSavingRel(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/roadmaps/${roadmapId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create relationship.');
      }

      setIsRelModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      setRelError(err.message);
    } finally {
      setSavingRel(false);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    if (!confirm('Delete this relationship connection?')) return;
    try {
      const res = await fetch(`/api/admin/roadmaps/${roadmapId}/relationships/${relId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete relationship.');
        return;
      }
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to delete relationship.');
    }
  };

  // ── Node Resource Actions ────────────────────────────────────────────────
  const openManageResources = (
    node: CareerRoadmapNode & { topics: CareerRoadmapNodeTopic[]; resources?: CareerNodeResourceView[] }
  ) => {
    setManagingResourceNode(node);
    setResourceModalTab('attached');
    setResourceError(null);
    setResourceSearchQuery('');
    setNewResourceForm({
      title: '',
      description: '',
      resource_type: 'YOUTUBE',
      provider: '',
      url: '',
      thumbnail_url: '',
      category: roadmap?.category || 'Development',
      difficulty: node.difficulty || 'Beginner',
      duration_minutes: node.estimated_minutes || 60,
      is_free: true,
      price: '',
      currency: 'INR',
      is_recommended: false,
      priority: (node.resources?.length || 0) + 1,
    });
    setIsResourceModalOpen(true);
  };

  const fetchLibraryResources = async (query = '') => {
    try {
      setLoadingResources(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      params.set('active', 'true');
      const res = await fetch(`/api/admin/resources?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableResources(data.resources || []);
      }
    } catch (err: any) {
      console.error('Failed to load library resources', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleAttachExisting = async (res: CareerResource) => {
    if (!managingResourceNode) return;
    try {
      setResourceActionLoading(true);
      setResourceError(null);
      const nextPriority = (managingResourceNode.resources?.length || 0) + 1;
      const response = await fetch(
        `/api/admin/roadmaps/${roadmapId}/nodes/${managingResourceNode.id}/resources`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resource_id: res.id,
            priority: nextPriority,
            is_recommended: false,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to attach resource.');
      }
      await fetchDetail();
      setResourceModalTab('attached');
    } catch (err: any) {
      setResourceError(err.message || 'Failed to attach resource.');
    } finally {
      setResourceActionLoading(false);
    }
  };

  const handleToggleRecommended = async (resourceId: string, currentRecommended: boolean) => {
    if (!managingResourceNode) return;
    try {
      setResourceActionLoading(true);
      setResourceError(null);
      const response = await fetch(
        `/api/admin/roadmaps/${roadmapId}/nodes/${managingResourceNode.id}/resources/${resourceId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_recommended: !currentRecommended,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update recommendation.');
      }
      await fetchDetail();
    } catch (err: any) {
      setResourceError(err.message || 'Failed to update recommendation.');
    } finally {
      setResourceActionLoading(false);
    }
  };

  const handleMoveResource = async (att: CareerNodeResourceView, direction: 'up' | 'down') => {
    if (!managingResourceNode || !managingResourceNode.resources) return;
    try {
      setResourceActionLoading(true);
      setResourceError(null);
      const currentList = [...managingResourceNode.resources];
      const currentIndex = currentList.findIndex((r) => r.id === att.id);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= currentList.length) return;

      const currentPriority = att.priority;
      const targetPriority = currentList[targetIndex].priority;

      const newCurrentPriority = targetPriority;
      const newTargetPriority =
        currentPriority === targetPriority
          ? direction === 'up'
            ? targetPriority + 1
            : targetPriority - 1
          : currentPriority;

      await fetch(
        `/api/admin/roadmaps/${roadmapId}/nodes/${managingResourceNode.id}/resources/${currentList[targetIndex].resource_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: newTargetPriority }),
        }
      );

      await fetch(
        `/api/admin/roadmaps/${roadmapId}/nodes/${managingResourceNode.id}/resources/${att.resource_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: newCurrentPriority }),
        }
      );

      await fetchDetail();
    } catch (err: any) {
      setResourceError(err.message || 'Failed to change resource priority.');
    } finally {
      setResourceActionLoading(false);
    }
  };

  const handleDetachResource = async (resourceId: string) => {
    if (!managingResourceNode) return;
    if (
      !confirm(
        'Detach this resource from this node? The resource remains safely available in the central library.'
      )
    ) {
      return;
    }
    try {
      setResourceActionLoading(true);
      setResourceError(null);
      const response = await fetch(
        `/api/admin/roadmaps/${roadmapId}/nodes/${managingResourceNode.id}/resources/${resourceId}`,
        {
          method: 'DELETE',
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to detach resource.');
      }
      await fetchDetail();
    } catch (err: any) {
      setResourceError(err.message || 'Failed to detach resource.');
    } finally {
      setResourceActionLoading(false);
    }
  };

  const handleCreateAndAttachResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingResourceNode) return;
    try {
      setResourceActionLoading(true);
      setResourceError(null);

      const payload = {
        title: newResourceForm.title.trim(),
        description: newResourceForm.description.trim(),
        resource_type: newResourceForm.resource_type,
        provider: newResourceForm.provider.trim(),
        url: newResourceForm.url.trim(),
        thumbnail_url: newResourceForm.thumbnail_url.trim() || undefined,
        category: newResourceForm.category.trim() || roadmap?.category || 'Development',
        difficulty: newResourceForm.difficulty,
        duration_minutes: newResourceForm.duration_minutes || undefined,
        is_free: newResourceForm.is_free,
        price: newResourceForm.is_free ? undefined : parseFloat(newResourceForm.price) || 0,
        currency: newResourceForm.is_free ? undefined : newResourceForm.currency || 'INR',
        is_recommended: newResourceForm.is_recommended,
        priority: newResourceForm.priority || 1,
        is_active: true,
      };

      const response = await fetch(
        `/api/admin/roadmaps/${roadmapId}/nodes/${managingResourceNode.id}/resources`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_resource: payload,
            is_recommended: newResourceForm.is_recommended,
            priority: newResourceForm.priority || 1,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const errorDetails = data.details?.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        throw new Error(errorDetails || data.error || 'Failed to create and attach resource.');
      }

      await fetchDetail();
      setResourceModalTab('attached');
    } catch (err: any) {
      setResourceError(err.message || 'Failed to create and attach resource.');
    } finally {
      setResourceActionLoading(false);
    }
  };

  // Node lookup map
  const nodeMap = new Map<string, CareerRoadmapNode>();
  for (const n of allNodesList) nodeMap.set(n.id, n);

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
          <Link
            href="/admin/roadmaps"
            className="hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1 font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Roadmaps
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text-primary)] font-semibold truncate">
            {roadmap?.title || 'Structure Builder'}
          </span>
        </div>

        {/* Roadmap Summary Banner */}
        {roadmap && (
          <Card flat className="p-5 sm:p-6 bg-[var(--color-surface)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                    {roadmap.title}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      roadmap.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {roadmap.is_active ? 'Active' : 'Draft'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                    {roadmap.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                    {roadmap.difficulty}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 line-clamp-2">
                  {roadmap.short_description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenQualityCheck}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                  Quality Check
                </Button>
                {roadmap.is_active && (
                  <Link
                    href={`/roadmaps/${roadmap.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Public View
                    </Button>
                  </Link>
                )}
                <Button variant="primary" size="sm" onClick={openAddSection}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Section
                </Button>
              </div>
            </div>

            {/* Sub-Tabs: Structure vs Relationships */}
            <div className="flex items-center gap-4 mt-6 border-b border-[var(--color-border)]">
              <button
                onClick={() => setActiveTab('structure')}
                className={`pb-2.5 text-sm font-semibold transition-colors relative ${
                  activeTab === 'structure'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Roadmap Structure ({sections.length} Sections, {allNodesList.length} Nodes)
              </button>
              <button
                onClick={() => setActiveTab('relationships')}
                className={`pb-2.5 text-sm font-semibold transition-colors relative ${
                  activeTab === 'relationships'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Relationships & Prerequisites ({relationships.length})
              </button>
            </div>
          </Card>
        )}

        {/* Loading / Error States */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center text-[var(--color-text-tertiary)] space-y-3">
            <Layers className="w-7 h-7 animate-pulse text-blue-500" />
            <p className="text-sm font-medium">Loading roadmap structure...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Structure Builder */}
        {!loading && activeTab === 'structure' && (
          <div className="space-y-4">
            {sections.length === 0 ? (
              <EmptyState
                title="No sections yet"
                description="A roadmap needs at least one section (e.g. 01 Foundation, 02 Core Skills) to hold nodes."
                action={
                  <Button variant="primary" size="md" onClick={openAddSection}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create First Section
                  </Button>
                }
              />
            ) : (
              sections.map((section, sIndex) => {
                const isExpanded = expandedSections[section.id] ?? true;
                return (
                  <Card key={section.id} flat className="overflow-hidden border border-[var(--color-border)]">
                    {/* Section Header */}
                    <div className="p-4 bg-[var(--color-bg-subtle)] flex items-center justify-between gap-3 border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSectionExpand(section.id)}
                          className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {String(section.sequence).padStart(2, '0')}
                          </span>
                          <h3 className="font-semibold text-sm sm:text-base text-[var(--color-text-primary)]">
                            {section.title}
                          </h3>
                        </div>

                        <span className="text-xs text-[var(--color-text-tertiary)] hidden sm:inline">
                          ({section.nodes.length} nodes)
                        </span>

                        {!section.is_active && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Section Action Buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={sIndex === 0}
                          onClick={() => handleMoveSection(section, 'up')}
                          title="Move section up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={sIndex === sections.length - 1}
                          onClick={() => handleMoveSection(section, 'down')}
                          title="Move section down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSection(section)}
                          title="Edit section"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openAddNode(section.id)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add Node
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSection(section.id)}
                          className="text-red-500 hover:text-red-600"
                          title="Delete section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Section Description */}
                    {section.description && isExpanded && (
                      <div className="px-5 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
                        {section.description}
                      </div>
                    )}

                    {/* Section Nodes List */}
                    {isExpanded && (
                      <div className="p-4 bg-[var(--color-surface)]">
                        {section.nodes.length === 0 ? (
                          <div className="p-6 text-center border-2 border-dashed border-[var(--color-border)] rounded-xl">
                            <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                              No nodes in this section yet.
                            </p>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openAddNode(section.id)}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Add First Node
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {section.nodes.map((node, nIndex) => {
                              // Find prerequisites of this node
                              const prereqs = relationships
                                .filter(
                                  (r) =>
                                    r.target_node_id === node.id &&
                                    r.relationship_type === 'PREREQUISITE'
                                )
                                .map((r) => nodeMap.get(r.source_node_id)?.title)
                                .filter(Boolean);

                              return (
                                <div
                                  key={node.id}
                                  className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                                        {node.title}
                                      </span>
                                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                                        {node.node_type}
                                      </span>
                                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                        {node.difficulty}
                                      </span>
                                      <span className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                                        <Clock3 className="w-3 h-3" />
                                        {node.estimated_minutes}m
                                      </span>
                                      {!node.is_active && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                          Inactive
                                        </span>
                                      )}
                                    </div>

                                    {node.description && (
                                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                                        {node.description}
                                      </p>
                                    )}

                                    {/* Topics and Prerequisites */}
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                      {node.topics && node.topics.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <Tag className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                                          {node.topics.map((t) => (
                                            <span
                                              key={t.id}
                                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]"
                                            >
                                              {t.topic}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {prereqs.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                                          <GitBranch className="w-3 h-3" />
                                          <span>Prereq: {prereqs.join(', ')}</span>
                                        </div>
                                      )}

                                      {/* Resources Summary */}
                                      {node.resources && node.resources.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                            <BookOpen className="w-3 h-3 text-blue-500" />
                                            {node.resources.length} resource{node.resources.length > 1 ? 's' : ''}:
                                          </span>
                                          {node.resources.slice(0, 3).map((r) => (
                                            <span
                                              key={r.id}
                                              className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                                r.is_recommended
                                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-semibold'
                                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]'
                                              }`}
                                            >
                                              {r.is_recommended && (
                                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                              )}
                                              {r.title}
                                            </span>
                                          ))}
                                          {node.resources.length > 3 && (
                                            <span className="text-[10px] text-slate-400">
                                              +{node.resources.length - 3} more
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Node Actions */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openManageResources(node)}
                                      title="Manage node resources"
                                      className="text-blue-600 dark:text-blue-400 font-medium"
                                    >
                                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                                      <span className="text-xs">
                                        {node.resources && node.resources.length > 0
                                          ? node.resources.length
                                          : '+'}
                                      </span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={nIndex === 0}
                                      onClick={() => handleMoveNode(section.nodes, node, 'up')}
                                      title="Move node up"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={nIndex === section.nodes.length - 1}
                                      onClick={() => handleMoveNode(section.nodes, node, 'down')}
                                      title="Move node down"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditNode(node)}
                                      title="Edit node"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openAddRelModal(node.id)}
                                      title="Connect relationship"
                                    >
                                      <Link2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteNode(node.id)}
                                      className="text-red-500 hover:text-red-600"
                                      title="Delete node"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Relationships Manager */}
        {!loading && activeTab === 'relationships' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                  Node Relationships & Prerequisites
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Configure prerequisite, next, recommended, and alternative edges between learning nodes.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openAddRelModal()}
                disabled={allNodesList.length < 2}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Relationship
              </Button>
            </div>

            {relationships.length === 0 ? (
              <EmptyState
                title="No relationships defined"
                description="Connect nodes with prerequisites or progression paths to define learning sequence."
                action={
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => openAddRelModal()}
                    disabled={allNodesList.length < 2}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create First Relationship
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] uppercase text-[11px] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Source Node</th>
                      <th className="py-3 px-4">Relationship</th>
                      <th className="py-3 px-4">Target Node</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {relationships.map((rel) => {
                      const source = nodeMap.get(rel.source_node_id);
                      const target = nodeMap.get(rel.target_node_id);

                      return (
                        <tr key={rel.id} className="hover:bg-[var(--color-bg-subtle)]/50">
                          <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                            {source?.title || 'Unknown Source Node'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {rel.relationship_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                            {target?.title || 'Unknown Target Node'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRelationship(rel.id)}
                              className="text-red-500 hover:text-red-600"
                              title="Delete relationship"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section Modal */}
        <Modal
          isOpen={isSectionModalOpen}
          onClose={() => setIsSectionModalOpen(false)}
          title={editingSection ? 'Edit Section' : 'Add Section'}
        >
          <form onSubmit={handleSaveSection} className="p-6 space-y-4">
            {sectionError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
                {sectionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Section Title *
              </label>
              <input
                type="text"
                required
                value={sectionForm.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setSectionForm((prev) => ({
                    ...prev,
                    title: val,
                    slug: !editingSection
                      ? val.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-')
                      : prev.slug,
                  }));
                }}
                placeholder="e.g. 01 Foundation"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Slug (URL safe) *
              </label>
              <input
                type="text"
                required
                value={sectionForm.slug}
                onChange={(e) =>
                  setSectionForm((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  }))
                }
                placeholder="e.g. foundation"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={sectionForm.description}
                onChange={(e) =>
                  setSectionForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Core foundational skills required before advanced learning..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={sectionForm.is_required}
                  onChange={(e) =>
                    setSectionForm((prev) => ({ ...prev, is_required: e.target.checked }))
                  }
                  className="rounded border-[var(--color-border)] text-blue-600"
                />
                Required Section
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={sectionForm.is_active}
                  onChange={(e) =>
                    setSectionForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="rounded border-[var(--color-border)] text-blue-600"
                />
                Active (Visible)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsSectionModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={savingSection}>
                {editingSection ? 'Save Section' : 'Create Section'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Node Modal */}
        <Modal
          isOpen={isNodeModalOpen}
          onClose={() => setIsNodeModalOpen(false)}
          title={editingNode ? 'Edit Node' : 'Add Node'}
          className="max-w-xl"
        >
          <form onSubmit={handleSaveNode} className="p-6 space-y-4">
            {nodeError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
                {nodeError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Node Title *
                </label>
                <input
                  type="text"
                  required
                  value={nodeForm.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodeForm((prev) => ({
                      ...prev,
                      title: val,
                      slug: !editingNode
                        ? val.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-')
                        : prev.slug,
                    }));
                  }}
                  placeholder="e.g. Python OOP"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Slug (URL safe) *
                </label>
                <input
                  type="text"
                  required
                  value={nodeForm.slug}
                  onChange={(e) =>
                    setNodeForm((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    }))
                  }
                  placeholder="e.g. python-oop"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Type *
                </label>
                <select
                  value={nodeForm.node_type}
                  onChange={(e) =>
                    setNodeForm((prev) => ({
                      ...prev,
                      node_type: e.target.value as NodeType,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  {NODE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Difficulty *
                </label>
                <select
                  value={nodeForm.difficulty}
                  onChange={(e) =>
                    setNodeForm((prev) => ({
                      ...prev,
                      difficulty: e.target.value as NodeDifficulty,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                >
                  {NODE_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Minutes *
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  required
                  value={nodeForm.estimated_minutes}
                  onChange={(e) =>
                    setNodeForm((prev) => ({
                      ...prev,
                      estimated_minutes: parseInt(e.target.value) || 60,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={nodeForm.description}
                onChange={(e) =>
                  setNodeForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Understand classes, objects, inheritance, and encapsulation in Python."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Topics Covered (comma-separated)
              </label>
              <input
                type="text"
                value={nodeForm.topicsText}
                onChange={(e) =>
                  setNodeForm((prev) => ({ ...prev, topicsText: e.target.value }))
                }
                placeholder="Classes, Objects, Inheritance, Polymorphism"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={nodeForm.is_required}
                  onChange={(e) =>
                    setNodeForm((prev) => ({ ...prev, is_required: e.target.checked }))
                  }
                  className="rounded border-[var(--color-border)] text-blue-600"
                />
                Required Skill
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={nodeForm.is_active}
                  onChange={(e) =>
                    setNodeForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="rounded border-[var(--color-border)] text-blue-600"
                />
                Active (Visible)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsNodeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={savingNode}>
                {editingNode ? 'Save Node' : 'Create Node'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Relationship Modal */}
        <Modal
          isOpen={isRelModalOpen}
          onClose={() => setIsRelModalOpen(false)}
          title="Connect Relationship"
          className="max-w-md"
        >
          <form onSubmit={handleSaveRelationship} className="p-6 space-y-4">
            {relError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
                {relError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Source Node *
              </label>
              <select
                required
                value={relForm.source_node_id}
                onChange={(e) =>
                  setRelForm((prev) => ({ ...prev, source_node_id: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              >
                <option value="">Select source node...</option>
                {allNodesList.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title} ({n.node_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Relationship Type *
              </label>
              <select
                required
                value={relForm.relationship_type}
                onChange={(e) =>
                  setRelForm((prev) => ({
                    ...prev,
                    relationship_type: e.target.value as RelationshipType,
                  }))
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              >
                {RELATIONSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Target Node *
              </label>
              <select
                required
                value={relForm.target_node_id}
                onChange={(e) =>
                  setRelForm((prev) => ({ ...prev, target_node_id: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
              >
                <option value="">Select target node...</option>
                {allNodesList
                  .filter((n) => n.id !== relForm.source_node_id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title} ({n.node_type})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsRelModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={savingRel}>
                Create Connection
              </Button>
            </div>
          </form>
        </Modal>

        {/* Resource Manager Modal */}
        <Modal
          isOpen={isResourceModalOpen}
          onClose={() => setIsResourceModalOpen(false)}
          title={`Manage Resources: ${managingResourceNode?.title || 'Node'}`}
          className="max-w-2xl"
        >
          <div className="p-6 space-y-4">
            {resourceError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
                {resourceError}
              </div>
            )}

            {/* Sub-Tabs: Attached vs Search Library vs Create New */}
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
              <button
                type="button"
                onClick={() => setResourceModalTab('attached')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  resourceModalTab === 'attached'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Attached Resources ({managingResourceNode?.resources?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setResourceModalTab('search');
                  fetchLibraryResources(resourceSearchQuery);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  resourceModalTab === 'search'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                + Attach Existing
              </button>
              <button
                type="button"
                onClick={() => setResourceModalTab('create')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  resourceModalTab === 'create'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                + Create & Attach New
              </button>
            </div>

            {/* Tab 1: Attached Resources */}
            {resourceModalTab === 'attached' && (
              <div className="space-y-3">
                {!managingResourceNode?.resources ||
                managingResourceNode.resources.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[var(--color-border)] rounded-xl">
                    <BookOpen className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                      No resources attached to this node
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                      Attach tutorials, official documentation, or courses to guide students on this node.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setResourceModalTab('search');
                          fetchLibraryResources();
                        }}
                      >
                        <Search className="w-3.5 h-3.5 mr-1" />
                        Browse Library
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setResourceModalTab('create')}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Create New
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {managingResourceNode.resources.map((att, idx) => {
                      const res = att;
                      return (
                        <div
                          key={att.id}
                          className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {att.is_recommended && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  ⭐ Recommended
                                </span>
                              )}
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)]">
                                Priority {att.priority}
                              </span>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                {res.resource_type}
                              </span>
                              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                                {res.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                              <span>{res.provider}</span>
                              <span>•</span>
                              <span>{res.difficulty}</span>
                              <span>•</span>
                              <span>{res.is_free ? 'Free' : `${res.currency} ${res.price}`}</span>
                              {res.duration_minutes && (
                                <>
                                  <span>•</span>
                                  <span>{res.duration_minutes}m</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={idx === 0 || resourceActionLoading}
                              onClick={() => handleMoveResource(att, 'up')}
                              title="Move Priority Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={
                                idx === (managingResourceNode.resources?.length || 1) - 1 ||
                                resourceActionLoading
                              }
                              onClick={() => handleMoveResource(att, 'down')}
                              title="Move Priority Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant={att.is_recommended ? 'secondary' : 'ghost'}
                              size="sm"
                              disabled={resourceActionLoading}
                              onClick={() =>
                                handleToggleRecommended(att.resource_id, att.is_recommended)
                              }
                              title={
                                att.is_recommended
                                  ? 'Unset recommended'
                                  : 'Make primary recommended'
                              }
                              className={att.is_recommended ? 'text-amber-600' : ''}
                            >
                              <Star
                                className={`w-3.5 h-3.5 mr-1 ${
                                  att.is_recommended ? 'fill-amber-500 text-amber-500' : ''
                                }`}
                              />
                              {att.is_recommended ? 'Recommended' : 'Recommend'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={resourceActionLoading}
                              onClick={() => handleDetachResource(att.resource_id)}
                              className="text-red-500 hover:text-red-600"
                              title="Detach from node (preserves library resource)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Search Existing Library Resources */}
            {resourceModalTab === 'search' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={resourceSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setResourceSearchQuery(val);
                      fetchLibraryResources(val);
                    }}
                    placeholder="Search by title, provider, or category..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                  />
                </div>

                {loadingResources ? (
                  <div className="py-8 flex justify-center text-[var(--color-text-tertiary)]">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                ) : availableResources.length === 0 ? (
                  <p className="text-xs text-center py-6 text-[var(--color-text-tertiary)]">
                    No resources found. Try another search or create a new resource.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {availableResources.map((res) => {
                      const isAlreadyAttached = managingResourceNode?.resources?.some(
                        (r) => r.resource_id === res.id
                      );
                      return (
                        <div
                          key={res.id}
                          className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                {res.resource_type}
                              </span>
                              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                                {res.title}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--color-text-tertiary)]">
                              {res.provider} • {res.difficulty} •{' '}
                              {res.is_free ? 'Free' : `${res.currency} ${res.price}`}
                            </div>
                          </div>

                          <Button
                            variant={isAlreadyAttached ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={isAlreadyAttached || resourceActionLoading}
                            onClick={() => handleAttachExisting(res)}
                          >
                            {isAlreadyAttached ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Attached
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Attach
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Create & Attach New Resource */}
            {resourceModalTab === 'create' && (
              <form
                onSubmit={handleCreateAndAttachResource}
                className="space-y-3 max-h-[440px] overflow-y-auto pr-1"
              >
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Resource Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newResourceForm.title}
                    onChange={(e) =>
                      setNewResourceForm((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="e.g. Python OOP Tutorial - Classes and Objects"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      Resource Type *
                    </label>
                    <select
                      required
                      value={newResourceForm.resource_type}
                      onChange={(e) =>
                        setNewResourceForm((p) => ({
                          ...p,
                          resource_type: e.target.value as ResourceType,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    >
                      {VALID_RESOURCE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      Provider *
                    </label>
                    <input
                      type="text"
                      required
                      value={newResourceForm.provider}
                      onChange={(e) =>
                        setNewResourceForm((p) => ({ ...p, provider: e.target.value }))
                      }
                      placeholder="e.g. YouTube, Official Docs"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Resource URL * (https://...)
                  </label>
                  <input
                    type="url"
                    required
                    value={newResourceForm.url}
                    onChange={(e) =>
                      setNewResourceForm((p) => ({ ...p, url: e.target.value }))
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      Difficulty
                    </label>
                    <select
                      value={newResourceForm.difficulty}
                      onChange={(e) =>
                        setNewResourceForm((p) => ({
                          ...p,
                          difficulty: e.target.value as ResourceDifficulty,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
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
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newResourceForm.duration_minutes}
                      onChange={(e) =>
                        setNewResourceForm((p) => ({
                          ...p,
                          duration_minutes: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newResourceForm.priority}
                      onChange={(e) =>
                        setNewResourceForm((p) => ({
                          ...p,
                          priority: Number(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newResourceForm.is_free}
                      onChange={(e) =>
                        setNewResourceForm((p) => ({ ...p, is_free: e.target.checked }))
                      }
                      className="rounded border-[var(--color-border)] text-blue-600"
                    />
                    Free Resource
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newResourceForm.is_recommended}
                      onChange={(e) =>
                        setNewResourceForm((p) => ({
                          ...p,
                          is_recommended: e.target.checked,
                        }))
                      }
                      className="rounded border-[var(--color-border)] text-blue-600"
                    />
                    ⭐ Set as Recommended
                  </label>
                </div>

                {!newResourceForm.is_free && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newResourceForm.price}
                        onChange={(e) =>
                          setNewResourceForm((p) => ({ ...p, price: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                        Currency
                      </label>
                      <input
                        type="text"
                        value={newResourceForm.currency}
                        onChange={(e) =>
                          setNewResourceForm((p) => ({ ...p, currency: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setResourceModalTab('attached')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={resourceActionLoading}
                  >
                    Save & Attach
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>

        {/* Quality Check Modal */}
        <Modal
          isOpen={isQualityModalOpen}
          onClose={() => setIsQualityModalOpen(false)}
          title="Roadmap Quality & Readiness Check"
          className="max-w-2xl"
        >
          {qualityLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Auditing roadmap structure, DAG relationships & resource attachments...</p>
            </div>
          ) : qualityError ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{qualityError}</span>
            </div>
          ) : qualityReport ? (
            <div className="space-y-6">
              {/* Score header */}
              <div className="p-5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        qualityReport.isReadyToPublish
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {qualityReport.isReadyToPublish ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready to Publish
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Needs Attention ({qualityReport.errors.length} blockers)
                        </>
                      )}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      Status: {roadmap?.is_active ? 'Active / Published' : 'Draft'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-[var(--color-text-primary)] mt-2">
                    {roadmap?.title}
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {qualityReport.stats.sectionCount} Stages · {qualityReport.stats.nodeCount} Nodes · {qualityReport.stats.topicCount} Concepts · {qualityReport.stats.resourceCount} Curated Resources
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-3xl font-extrabold text-[var(--color-text-primary)]">
                    {qualityReport.score}
                    <span className="text-sm font-medium text-[var(--color-text-tertiary)]">/100</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                    Quality Score
                  </span>
                </div>
              </div>

              {/* Checklist breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Verification Checklist
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2">
                    {roadmap?.title && roadmap?.short_description ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span>Title & Description complete</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2">
                    {roadmap?.category ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span>Category specified</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2">
                    {qualityReport.stats.sectionCount > 0 && qualityReport.stats.nodeCount > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span>Has sections & nodes</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2">
                    {!qualityReport.errors.some((e) => e.includes('cycle') || e.includes('non-existent')) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span>Valid DAG (no cycles/broken edges)</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2">
                    {!qualityReport.warnings.some((w) => w.includes('description')) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span>Node descriptions written</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2">
                    {qualityReport.stats.resourceCount > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span>Resources attached ({qualityReport.stats.resourceCount} total)</span>
                  </div>
                </div>
              </div>

              {/* Blockers / Errors */}
              {qualityReport.errors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                  <h5 className="text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5 mb-2">
                    <XCircle className="w-4 h-4" />
                    Publication Blockers ({qualityReport.errors.length})
                  </h5>
                  <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
                    {qualityReport.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {qualityReport.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Quality Recommendations ({qualityReport.warnings.length})
                  </h5>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                    {qualityReport.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions footer */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsQualityModalOpen(false)}
                >
                  Close
                </Button>

                {roadmap?.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-300 hover:bg-amber-50"
                    isLoading={togglingPublish}
                    onClick={() => handleTogglePublish(false)}
                  >
                    Unpublish Roadmap (Set to Draft)
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!qualityReport.isReadyToPublish}
                    isLoading={togglingPublish}
                    onClick={() => handleTogglePublish(true)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Publish Roadmap Now
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </AdminLayout>
  );
}
