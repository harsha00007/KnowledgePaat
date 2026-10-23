"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { 
  BookOpen, 
  ArrowLeft, 
  Sparkles, 
  Save, 
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { generateSlug } from '@/lib/ebook/validation';

export default function AdminNewEBookPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [readerRole, setReaderRole] = useState('Full-Stack Engineer / Student');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');

  // Default prices in minor units (paise)
  const [onlinePricePaise, setOnlinePricePaise] = useState(4900); // ₹49
  const [downloadPricePaise, setDownloadPricePaise] = useState(9900); // ₹99
  const [upgradePricePaise, setUpgradePricePaise] = useState(5000); // ₹50

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/ebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          slug,
          subtitle: subtitle || null,
          category,
          reader_role: readerRole || null,
          language,
          description,
          price_read_online_paise: onlinePricePaise,
          price_read_download_paise: downloadPricePaise,
          price_upgrade_pdf_paise: upgradePricePaise
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create eBook.');
      }

      // Redirect directly to the full editor to upload cover and author chapters
      router.push(`/admin/e-books/${data.book.id}/edit`);
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage(err.message || 'An error occurred while creating the eBook.');
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12 font-ebook">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/e-books">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-navy">Create New eBook</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Define publication metadata, category, and access pricing tiers.
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* CARD 1: CORE METADATA */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              1. Book Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean Architecture in TypeScript"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Author Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harsha Vardhan"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Slug *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="clean-architecture-in-typescript"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Web Development">Web Development</option>
                  <option value="System Design">System Design</option>
                  <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                  <option value="Career & Interview Prep">Career & Interview Prep</option>
                  <option value="Cloud & DevOps">Cloud & DevOps</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Reader Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Junior & Mid-level Engineers"
                  value={readerRole}
                  onChange={(e) => setReaderRole(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subtitle (Optional)
                </label>
                <input
                  type="text"
                  placeholder="A practical, real-world handbook for scalable web applications"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Book Description & Summary *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Comprehensive description of the publication, what readers will learn, and chapter topics covered..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* CARD 2: ACCESS PRICING */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  2. Access Pricing Tiers
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  KnowledgePaat approved pricing models (stored in minor units / paise).
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                INR (₹) Standard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="text-xs font-semibold text-navy">Read Online</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={onlinePricePaise / 100}
                    onChange={(e) => setOnlinePricePaise(Math.round(Number(e.target.value) * 100))}
                    className="w-24 px-2.5 py-1.5 border border-slate-300 rounded text-sm font-bold text-navy"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Default: ₹49 ({onlinePricePaise} paise). Web reader access.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                <div className="text-xs font-semibold text-blue-900">Read + Download</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={downloadPricePaise / 100}
                    onChange={(e) => setDownloadPricePaise(Math.round(Number(e.target.value) * 100))}
                    className="w-24 px-2.5 py-1.5 border border-slate-300 rounded text-sm font-bold text-navy"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Default: ₹99 ({downloadPricePaise} paise). Web reader + PDF.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="text-xs font-semibold text-navy">PDF Upgrade Delta</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={upgradePricePaise / 100}
                    onChange={(e) => setUpgradePricePaise(Math.round(Number(e.target.value) * 100))}
                    className="w-24 px-2.5 py-1.5 border border-slate-300 rounded text-sm font-bold text-navy"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Default: ₹50 ({upgradePricePaise} paise). Online buyers upgrade fee.
                </p>
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/admin/e-books">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Creating eBook...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" /> Continue to Chapter & File Editor →
                </>
              )}
            </Button>
          </div>

        </form>
      </div>
    </AdminLayout>
  );
}
