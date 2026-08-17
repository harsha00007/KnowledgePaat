import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import {
  Search, MapPin, Briefcase, DollarSign, Filter,
  Building2, Clock, CheckCircle2, ChevronDown
} from 'lucide-react';
import Link from 'next/link';

export default function JobsPage() {
  return (
    <PublicLayout>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[var(--color-border)] pt-10 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Find Your First Job</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Verified fresher openings with direct application links.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="Job title, keyword, or company"
                className="w-full pl-10 pr-4 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] shadow-[var(--shadow-xs)] transition-colors"
              />
            </div>
            <div className="relative sm:w-52">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="City or Remote"
                className="w-full pl-10 pr-4 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] shadow-[var(--shadow-xs)] transition-colors"
              />
            </div>
            <Button className="h-10 px-6 shrink-0">Search Jobs</Button>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-6">

          {/* SIDEBAR FILTERS */}
          <aside className="w-full lg:w-60 xl:w-64 shrink-0 space-y-4 hidden lg:block">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Filter className="h-4 w-4" /> Filters
              </h2>
              <button className="text-xs text-[var(--color-brand-500)] hover:text-[var(--color-brand-600)] font-medium transition-colors">
                Clear all
              </button>
            </div>

            <FilterSection title="Job Type">
              <FilterCheckbox label="Full-time" count="245" />
              <FilterCheckbox label="Part-time" count="42" />
              <FilterCheckbox label="Internship" count="128" />
              <FilterCheckbox label="Contract" count="15" />
            </FilterSection>

            <FilterSection title="Experience Level">
              <FilterCheckbox label="Fresher / Entry Level" count="180" />
              <FilterCheckbox label="Mid Level (1–3 yrs)" count="120" />
              <FilterCheckbox label="Senior Level (3+ yrs)" count="45" />
            </FilterSection>

            <FilterSection title="Work Mode">
              <FilterCheckbox label="On-site" count="150" />
              <FilterCheckbox label="Remote" count="180" />
              <FilterCheckbox label="Hybrid" count="90" />
            </FilterSection>
          </aside>

          {/* JOB LISTINGS */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Showing <span className="font-semibold text-[var(--color-text-primary)]">412</span> verified jobs
              </p>
              <select className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] shadow-[var(--shadow-xs)]">
                <option>Most Relevant</option>
                <option>Most Recent</option>
              </select>
            </div>

            <JobCard
              company="TechNova Solutions"
              role="Frontend Developer Intern"
              location="Bangalore, India"
              type="Internship"
              salary="₹25,000/month"
              posted="2 hours ago"
              tags={['React', 'TypeScript', 'Tailwind']}
            />
            <JobCard
              company="Global Finance Inc."
              role="Junior Data Analyst"
              location="Remote"
              type="Full-time"
              salary="₹6,00,000/year"
              posted="5 hours ago"
              tags={['Python', 'SQL', 'Excel']}
            />
            <JobCard
              company="Creative Studios"
              role="UI/UX Designer"
              location="Mumbai, India (Hybrid)"
              type="Full-time"
              salary="₹8,00,000/year"
              posted="1 day ago"
              tags={['Figma', 'Prototyping', 'Wireframing']}
            />
            <JobCard
              company="CloudServe Systems"
              role="Software Development Engineer 1"
              location="Pune, India"
              type="Full-time"
              salary="₹12,00,000/year"
              posted="2 days ago"
              tags={['Java', 'Spring Boot', 'AWS']}
            />

            <div className="flex justify-center pt-4">
              <Button variant="outline" size="lg">Load More Jobs</Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

/* ─── SUB-COMPONENTS ──────────────────────────────────────────────────── */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function FilterCheckbox({ label, count }: { label: string; count: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)] focus:ring-offset-0 transition-colors"
        />
        <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
          {label}
        </span>
      </div>
      <span className="text-xs font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-muted)] px-1.5 py-0.5 rounded">
        {count}
      </span>
    </label>
  );
}

function JobCard({
  company, role, location, type, salary, posted, tags,
}: {
  company: string; role: string; location: string; type: string;
  salary: string; posted: string; tags: string[];
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-brand-300)] transition-all duration-200 group">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Company logo placeholder */}
        <div className="h-12 w-12 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-500)] transition-colors leading-snug">
                <Link href="#" className="focus-ring rounded-sm">{role}</Link>
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">{company}</span>
                <span className="text-[var(--color-text-tertiary)]">·</span>
                <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-success)]">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              </div>
            </div>

            <Button variant="primary" size="sm" className="shrink-0 self-start">
              Apply Now
            </Button>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <MapPin className="h-3.5 w-3.5" /> {location}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <Briefcase className="h-3.5 w-3.5" /> {type}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <DollarSign className="h-3.5 w-3.5" /> {salary}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <Clock className="h-3.5 w-3.5" /> {posted}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-block rounded-full bg-[var(--color-bg-muted)] border border-[var(--color-border)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
