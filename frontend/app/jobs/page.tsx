import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, MapPin, Briefcase, DollarSign, Filter, Building2 } from 'lucide-react';

export default function JobsPage() {
  return (
    <PublicLayout>
      {/* HEADER SECTION */}
      <section className="bg-gray-50 py-12 border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Dream Job</h1>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Job title, keywords, or company" 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="City, state, or remote" 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <Button size="lg" className="md:w-32">Search</Button>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT SECTION */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col lg:flex-row gap-8">
          
          {/* SIDEBAR FILTERS (UI ONLY) */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8 hidden md:block">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filters</h2>
              <button className="text-sm text-blue-600 hover:underline">Clear all</button>
            </div>
            
            <FilterSection title="Job Type">
              <FilterCheckbox label="Full-time" count="245" />
              <FilterCheckbox label="Part-time" count="42" />
              <FilterCheckbox label="Internship" count="128" />
              <FilterCheckbox label="Contract" count="15" />
            </FilterSection>

            <FilterSection title="Experience Level">
              <FilterCheckbox label="Fresher / Entry Level" count="180" />
              <FilterCheckbox label="Mid Level (1-3 yrs)" count="120" />
              <FilterCheckbox label="Senior Level (3+ yrs)" count="45" />
            </FilterSection>
            
            <FilterSection title="Work Mode">
              <FilterCheckbox label="On-site" count="150" />
              <FilterCheckbox label="Remote" count="180" />
              <FilterCheckbox label="Hybrid" count="90" />
            </FilterSection>
          </aside>

          {/* JOBS LIST */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">Showing <span className="font-semibold text-gray-900">412</span> jobs</p>
              <select className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
              tags={["React", "TypeScript", "Tailwind"]}
            />
            <JobCard 
              company="Global Finance Inc."
              role="Junior Data Analyst"
              location="Remote"
              type="Full-time"
              salary="₹6,00,000/year"
              posted="5 hours ago"
              tags={["Python", "SQL", "Excel"]}
            />
            <JobCard 
              company="Creative Studios"
              role="UI/UX Designer"
              location="Mumbai, India (Hybrid)"
              type="Full-time"
              salary="₹8,00,000/year"
              posted="1 day ago"
              tags={["Figma", "Prototyping", "Wireframing"]}
            />
            <JobCard 
              company="CloudServe Systems"
              role="Software Development Engineer 1"
              location="Pune, India"
              type="Full-time"
              salary="₹12,00,000/year"
              posted="2 days ago"
              tags={["Java", "Spring Boot", "AWS"]}
            />
            
            <div className="mt-8 flex justify-center">
              <Button variant="outline" className="w-full sm:w-auto">Load More Jobs</Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function FilterSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function FilterCheckbox({ label, count }: { label: string, count: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div className="flex items-center gap-2">
        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
        <span className="text-sm text-gray-600 group-hover:text-gray-900">{label}</span>
      </div>
      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{count}</span>
    </label>
  );
}

function JobCard({ company, role, location, type, salary, posted, tags }: { company: string, role: string, location: string, type: string, salary: string, posted: string, tags: string[] }) {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow border-gray-100 hover:border-blue-100">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600 cursor-pointer">{role}</h3>
            <p className="text-sm text-gray-500 mt-1">{company}</p>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-gray-600">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {location}</span>
              <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-gray-400" /> {type}</span>
              <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-gray-400" /> {salary}</span>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag, idx) => (
                <span key={idx} className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end justify-between sm:h-full mt-4 sm:mt-0 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
          <span className="text-xs text-gray-400 mb-4 hidden sm:block">{posted}</span>
          <Button size="sm">Apply Now</Button>
        </div>
      </div>
    </Card>
  );
}
