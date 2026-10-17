import type { RoadmapContentDefinition } from '../types';

export const gitGithubSkillRoadmap: RoadmapContentDefinition = {
  title: 'Git & GitHub',
  slug: 'git-github',
  short_description:
    'Master version control: branching strategies, commit history, merge conflict resolution, rebasing, stashing, and pull request workflows.',
  description:
    'Essential roadmap for every software engineer. Learn Git internal mechanics (trees, commits, blobs), branching strategies, interactive rebasing, cherry-picking, stash management, and collaborative GitHub pull request etiquette.',
  category: 'Development',
  difficulty: 'Beginner',
  estimated_duration: '4 Weeks',
  seo_title: 'Git & GitHub Skill Roadmap | KnowledgePaat',
  seo_description:
    'Master Git version control, branching, merge conflicts, interactive rebase, and GitHub pull requests.',
  is_active: true,
  type: 'SKILL',
  sections: [
    {
      title: '01 Fundamentals & Daily Commands',
      slug: '01-fundamentals',
      description: 'Repositories, staging area, commits, inspection, and remotes.',
      sequence: 1,
      is_required: true,
      nodes: [
        {
          title: 'Git Architecture & Staging Workflow',
          slug: 'git-staging-workflow',
          description: 'Working directory vs staging area vs commit history, git status, diff, log, and checkout.',
          node_type: 'SKILL',
          difficulty: 'Beginner',
          estimated_minutes: 90,
          sequence: 1,
          is_required: true,
          topics: ['Working Directory & Index', 'Atomic Commits & Good Commit Messages', 'Inspecting History with git log --oneline'],
        },
      ],
    },
    {
      title: '02 Branching, Merging & Conflict Resolution',
      slug: '02-branching-merging',
      description: 'Feature branches, fast-forward merges, 3-way merges, and solving conflict markers.',
      sequence: 2,
      is_required: true,
      nodes: [
        {
          title: 'Branching Strategies & Resolving Conflicts',
          slug: 'branching-conflicts',
          description: 'Git flow, trunk-based development, reading conflict markers (<<<<<<<, =======, >>>>>>>), and merging.',
          node_type: 'SKILL',
          difficulty: 'Beginner',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['Trunk-Based Development vs Git Flow', 'Merge Conflict Markers & Resolution', 'Git Stash & Work in Progress'],
          prerequisites: ['git-staging-workflow'],
        },
      ],
    },
    {
      title: '03 Advanced Git & Team Collaboration',
      slug: '03-advanced-git',
      description: 'Interactive rebase, cherry-pick, reset vs revert, and GitHub PR reviews.',
      sequence: 3,
      is_required: true,
      nodes: [
        {
          title: 'Interactive Rebase, Cherry-Pick & Clean History',
          slug: 'rebase-cherry-pick',
          description: 'Squashing commits with rebase -i, picking specific fixes, undoing mistakes with reflog and reset.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 150,
          sequence: 1,
          is_required: true,
          topics: ['Interactive Rebase (squash, fixup, reword)', 'git cherry-pick', 'git reflog for Disaster Recovery', 'GitHub Pull Request Review Workflows'],
          prerequisites: ['branching-conflicts'],
        },
      ],
    },
  ],
};
