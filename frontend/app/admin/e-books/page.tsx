"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Layers, 
  Eye, 
  Archive, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Receipt,
  Home,
  Users
} from 'lucide-react';
import { EBook, EBookEdition } from '@/types/ebook';

export default function AdminEBooksListPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  const fetchBooks = async (targetPage: number = page) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('page', String(targetPage));
      params.set('limit', '15');

      const res = await fetch(`/api/admin/ebooks?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBooks(data.books || []);
        if (data.pagination) {
          setPagination(data.pagination);
          setPage(data.pagination.page);
        }
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load eBooks.' });
      }
    } catch (err: any) {
      console.error('Failed to fetch eBooks:', err);
      setFeedback({ type: 'error', message: 'Network error loading eBooks.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchBooks(1);
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBooks(1);
  };

  const handleArchiveBook = async (bookId: string, title: string) => {
    if (!confirm(`Are you sure you want to archive "${title}"? This preserves historical orders while removing it from public view.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/ebooks/${bookId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: data.message });
        fetchBooks();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to archive eBook.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to archive eBook.' });
    }
  };

  const categories = Array.from(new Set(books.map(b => b.category).filter(Boolean)));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 font-ebook">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-navy">eBook Administration</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage website books, chapters, publication files, and ₹49/₹99/₹50 access pricing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/e-books/homepage">
              <Button variant="outline" size="sm" className="shadow-2xs text-xs">
                <Home className="w-3.5 h-3.5 mr-1 text-slate-500" /> Homepage Editor
              </Button>
            </Link>
            <Link href="/admin/e-book-customers">
              <Button variant="outline" size="sm" className="shadow-2xs text-xs">
                <Users className="w-3.5 h-3.5 mr-1 text-slate-500" /> Customers & Access
              </Button>
            </Link>
            <Link href="/admin/e-book-orders">
              <Button variant="outline" size="sm" className="shadow-2xs text-xs">
                <Receipt className="w-3.5 h-3.5 mr-1 text-slate-500" /> Orders Ledger
              </Button>
            </Link>
            <Link href="/admin/e-books/new">
              <Button size="sm" className="shadow-sm text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add New eBook
              </Button>
            </Link>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span>{feedback.message}</span>
            <button 
              onClick={() => setFeedback(null)} 
              className="text-xs font-semibold underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* FILTERS & SEARCH */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5" /> Status:
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* COLLECTION LIST */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3" />
            <p className="text-sm text-slate-500">Loading eBook catalog...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <EmptyState
              title="No eBooks Found"
              description="Create your first publication to manage website chapters, pricing, and downloadable PDFs."
              action={
                <Link href="/admin/e-books/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1.5" /> Create First eBook
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Book</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Editions & Chapters</th>
                    <th className="px-5 py-3.5">Pricing (Paise / ₹)</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {books.map((book) => {
                    const currentEdition = book.current_edition || book.editions?.[0];
                    const chapterCount = currentEdition?.chapters?.[0]?.count || 0;
                    const onlinePrice = currentEdition ? (currentEdition.price_read_online_paise / 100) : 49;
                    const downloadPrice = currentEdition ? (currentEdition.price_read_download_paise / 100) : 99;

                    return (
                      <tr key={book.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* BOOK INFO & COVER */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {book.cover_image_url ? (
                              <img
                                src={book.cover_image_url}
                                alt={book.title}
                                className="w-10 h-14 object-cover rounded shadow-xs border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-400">
                                <BookOpen className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <Link 
                                href={`/admin/e-books/${book.id}/edit`} 
                                className="font-semibold text-navy hover:text-blue-600 transition-colors"
                              >
                                {book.title}
                              </Link>
                              <div className="text-xs text-slate-500 mt-0.5">
                                By {book.author} • <code className="text-slate-400 text-[11px]">{book.slug}</code>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* CATEGORY */}
                        <td className="px-5 py-4 text-xs font-medium text-slate-600">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                            {book.category}
                          </span>
                        </td>

                        {/* EDITIONS & CHAPTERS */}
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            {book.editions?.length || 1} Edition(s)
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {chapterCount} Chapter(s) in current
                          </div>
                        </td>

                        {/* PRICING */}
                        <td className="px-5 py-4 text-xs">
                          <div className="font-semibold text-navy">
                            Read: ₹{onlinePrice} • Full: ₹{downloadPrice}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Upgrade: ₹{currentEdition ? (currentEdition.price_upgrade_pdf_paise / 100) : 50}
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-4">
                          {book.status === 'published' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Published
                            </span>
                          ) : book.status === 'archived' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <Archive className="w-3 h-3" /> Archived
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Draft
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/admin/e-books/${book.id}/edit`}>
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit & Chapters
                              </Button>
                            </Link>
                            {book.status !== 'archived' && (
                              <button
                                onClick={() => handleArchiveBook(book.id, book.title)}
                                title="Archive eBook"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-semibold text-slate-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-semibold text-slate-900">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span> of{' '}
                  <span className="font-semibold text-slate-900">{pagination.total}</span> eBooks
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1 || isLoading}
                    onClick={() => fetchBooks(pagination.page - 1)}
                    className="text-xs font-semibold h-8"
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-600 font-medium px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasMore || isLoading}
                    onClick={() => fetchBooks(pagination.page + 1)}
                    className="text-xs font-semibold h-8"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
