"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Power, 
  Trash2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingBag,
  Tag,
  DollarSign,
  Layers
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { StoreProduct, ProductType, PRODUCT_TYPE_LABELS } from '@/lib/store';

const initialForm: Partial<StoreProduct> = {
  title: '',
  description: '',
  product_type: 'question_pack',
  price: 29.00,
  original_price: 49.00,
  status: 'active'
};

export default function AdminStorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<StoreProduct>>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProducts(data as StoreProduct[]);
    } catch (err) {
      console.error("Error fetching store products:", err);
    } finally {
      setIsFetching(false);
    }
  };

  // Filtering Logic
  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === '' || 
      p.title.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query);

    const matchesType = typeFilter === '' || p.product_type === typeFilter;
    const matchesStatus = statusFilter === '' || p.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  // ---------------- FORM HANDLING ---------------- //
  const openAddForm = () => {
    setFormData(initialForm);
    setFormErrors({});
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const openEditForm = (p: StoreProduct) => {
    setFormData(p);
    setFormErrors({});
    setSelectedProduct(p);
    setIsFormModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = "Product Title is required.";
    if (!formData.product_type) errors.product_type = "Product Type is required.";
    if (formData.price === undefined || formData.price === null || Number(formData.price) < 0) {
      errors.price = "Valid price is required.";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    
    try {
      const payload = {
        title: formData.title,
        description: formData.description || '',
        product_type: formData.product_type,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : null,
        status: formData.status || 'active',
        updated_at: new Date().toISOString()
      };

      if (selectedProduct) {
        // Update
        const { error } = await supabase
          .from('store_products')
          .update(payload)
          .eq('id', selectedProduct.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('store_products')
          .insert(payload);
        if (error) throw error;
      }

      await fetchProducts();
      setIsFormModalOpen(false);
    } catch (err) {
      console.error("Error saving store product:", err);
      alert("Failed to save product.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------- ACTIONS ---------------- //
  const handleToggleStatus = async () => {
    if (!selectedProduct) return;
    setIsProcessing(true);
    try {
      const newStatus = selectedProduct.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('store_products')
        .update({ status: newStatus })
        .eq('id', selectedProduct.id);
      if (error) throw error;
      
      await fetchProducts();
      setIsStatusModalOpen(false);
    } catch (err) {
      console.error("Error toggling product status:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', selectedProduct.id);
      if (error) throw error;
      
      await fetchProducts();
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting product:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Store Products</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Create and manage digital products, question packs, note downloads, and study bundles.
            </p>
          </div>
          <Button size="sm" onClick={openAddForm} className="shrink-0 text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Add Product
          </Button>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Product Title or Description..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <select 
              value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Types</option>
              <option value="question_pack">Question Packs</option>
              <option value="note">Study Notes</option>
              <option value="note_bundle">Notes Bundles</option>
              <option value="interview_bundle">Master Bundles</option>
            </select>
            
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-full justify-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* DATA TABLE CONTAINER */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No store products found."
                description="Create a new digital product or try relaxing your search filters."
                action={<Button size="sm" onClick={openAddForm}>Add Product</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">
                      <th className="px-5 py-3.5 w-2/5">Product Title</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Price</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Created</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedProducts.map(p => {
                      const typeMeta = PRODUCT_TYPE_LABELS[p.product_type];

                      return (
                        <tr key={p.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-[var(--color-text-primary)] leading-snug">{p.title}</p>
                            <p className="text-[11px] text-[var(--color-text-tertiary)] truncate max-w-sm mt-0.5">{p.description}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta?.color} ${typeMeta?.textColor} ${typeMeta?.border}`}>
                              {typeMeta?.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-extrabold text-[var(--color-text-primary)]">₹{p.price}</span>
                            {p.original_price && p.original_price > p.price && (
                              <span className="text-[10px] text-[var(--color-text-tertiary)] line-through ml-1.5 font-medium">₹{p.original_price}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                              {p.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-[var(--color-text-secondary)]">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                            <button onClick={() => { setSelectedProduct(p); setIsViewModalOpen(true); }} className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditForm(p)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedProduct(p); setIsStatusModalOpen(true); }} className={`p-1.5 rounded transition-colors ${p.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={p.status === 'active' ? "Deactivate" : "Activate"}>
                              <Power className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedProduct(p); setIsDeleteModalOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                </span>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="p-1.5 h-8 w-8 justify-center" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" className="p-1.5 h-8 w-8 justify-center" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      <Modal isOpen={isFormModalOpen} onClose={() => !isProcessing && setIsFormModalOpen(false)} title={selectedProduct ? "Edit Store Product" : "Add Store Product"} className="max-w-xl">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Product Title *</label>
            <input type="text" name="title" value={formData.title || ''} onChange={handleFormChange} placeholder="e.g. Complete TCS NQT Technical Pack" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            {formErrors.title && <p className="text-red-500 mt-1">{formErrors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Product Type *</label>
              <select name="product_type" value={formData.product_type} onChange={handleFormChange} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white">
                <option value="question_pack">Question Pack</option>
                <option value="note">Study Note (PDF)</option>
                <option value="note_bundle">Notes Bundle</option>
                <option value="interview_bundle">Interview Master Bundle</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Selling Price (₹) *</label>
              <input type="number" name="price" value={formData.price} onChange={handleFormChange} placeholder="29" min="0" step="1" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
              {formErrors.price && <p className="text-red-500 mt-1">{formErrors.price}</p>}
            </div>
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Original Price (₹)</label>
              <input type="number" name="original_price" value={formData.original_price || ''} onChange={handleFormChange} placeholder="49" min="0" step="1" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Description</label>
            <textarea name="description" value={formData.description || ''} onChange={handleFormChange} rows={3} placeholder="Detailed description of what this pack or bundle contains..." className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" />
          </div>

          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Publishing Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={handleFormChange} />
                <span>Active (Listed in Store)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="inactive" checked={formData.status === 'inactive'} onChange={handleFormChange} />
                <span>Inactive (Hidden)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Product Overview" className="max-w-md">
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)] leading-snug">{selectedProduct.title}</h2>
                <p className="text-[11px] text-[var(--color-text-tertiary)] uppercase font-semibold mt-0.5">{selectedProduct.product_type.replace('_', ' ')}</p>
              </div>
              <span className="text-lg font-extrabold text-[var(--color-brand-600)]">₹{selectedProduct.price}</span>
            </div>

            <div>
              <h4 className="font-bold text-[var(--color-text-primary)] mb-1">Description</h4>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{selectedProduct.description}</p>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Are you sure you want to <strong>{selectedProduct.status === 'active' ? 'deactivate' : 'activate'}</strong> "{selectedProduct.title}"?
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className={selectedProduct.status === 'active' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                onClick={handleToggleStatus} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : selectedProduct.status === 'active' ? 'Yes, Deactivate' : 'Yes, Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isProcessing && setIsDeleteModalOpen(false)} title="Delete Store Product">
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-red-50 text-red-900 p-4 rounded-[var(--radius-lg)] border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">Warning: This action cannot be undone.</p>
                <p className="mt-1 leading-relaxed text-red-900">
                  Are you sure you want to delete <strong>"{selectedProduct.title}"</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className="bg-red-600 hover:bg-red-700 border-transparent text-white"
                onClick={handleDelete} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Deleting...' : 'Yes, Delete Product'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}
