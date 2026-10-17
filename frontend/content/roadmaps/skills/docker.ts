import type { RoadmapContentDefinition } from '../types';

export const dockerSkillRoadmap: RoadmapContentDefinition = {
  title: 'Docker & Containers',
  slug: 'docker',
  short_description:
    'Deep-dive into containerization: Dockerfile directives, multi-stage builds, networking, volumes, compose files, and security hardening.',
  description:
    'Comprehensive technology roadmap for Docker. Learn container runtime mechanics, image layer optimization, environment reproducibility, multi-container orchestration with Docker Compose, and production security.',
  category: 'DevOps & Cloud',
  difficulty: 'Beginner',
  estimated_duration: '6 Weeks',
  seo_title: 'Docker & Containers Skill Roadmap | KnowledgePaat',
  seo_description:
    'Master Docker containerization, Dockerfiles, multi-stage builds, networking, volumes, and Docker Compose.',
  is_active: true,
  type: 'SKILL',
  sections: [
    {
      title: '01 Container Mechanics & Basic Commands',
      slug: '01-container-mechanics',
      description: 'Understanding container isolation, Docker CLI commands, and pulling/running images.',
      sequence: 1,
      is_required: true,
      nodes: [
        {
          title: 'Container Lifecycles & Docker CLI',
          slug: 'container-lifecycles-cli',
          description: 'docker run, ps, exec, logs, port mapping (-p), environment flags (-e), and container restarts.',
          node_type: 'SKILL',
          difficulty: 'Beginner',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['Containers vs Virtual Machines', 'Port Forwarding & Detached Mode', 'Inspecting Container Logs & Exec Shell'],
        },
      ],
    },
    {
      title: '02 Dockerfile Mastery & Layer Caching',
      slug: '02-dockerfile-optimization',
      description: 'Authoring efficient Dockerfiles, multi-stage builds, and minimizing image footprint.',
      sequence: 2,
      is_required: true,
      nodes: [
        {
          title: 'Multi-Stage Builds & Minimal Images',
          slug: 'multistage-builds-minimal-images',
          description: 'Using alpine/distroless bases, caching dependencies, and non-root USER execution for security.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 180,
          sequence: 1,
          is_required: true,
          topics: ['Layer Caching Strategies', 'Multi-Stage Build Syntax', 'Distroless & Alpine Bases', 'Running as Non-Root User'],
          prerequisites: ['container-lifecycles-cli'],
        },
      ],
    },
    {
      title: '03 Networking, Volumes & Docker Compose',
      slug: '03-networking-volumes-compose',
      description: 'Persistent storage, container-to-container communication, and multi-service compose stacks.',
      sequence: 3,
      is_required: true,
      nodes: [
        {
          title: 'Docker Compose & Multi-Service Stacks',
          slug: 'docker-compose-stacks',
          description: 'Defining web servers, databases, and redis caches in declarative docker-compose.yml files.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 180,
          sequence: 1,
          is_required: true,
          topics: ['Named Volumes & Bind Mounts', 'Bridge Networks & Service Discovery', 'Environment Files (.env)', 'Healthchecks & depends_on'],
          prerequisites: ['multistage-builds-minimal-images'],
        },
      ],
    },
  ],
};
