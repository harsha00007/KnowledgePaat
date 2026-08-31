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
  Layers,
  FileText,
  Upload,
  CheckCircle2,
  X,
  ExternalLink,
  BookOpen,
  Check,
  Sparkles,
  RefreshCw,
  Info,
  Clock
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { StoreProduct, ProductType, PRODUCT_TYPE_LABELS } from '@/lib/store';

type NoteOption = {
  id: string;
  title: string;
  category: string;
  file_url: string;
  file_size?: string;
  technology?: string | null;
  status: string;
  description?: string;
  minimum_plan?: string;
  access_type?: string;
};

const NOTE_CATEGORIES = [
  'Technical Interview',
  'Aptitude',
  'HR Interview',
  'Programming',
  'Career Guidance'
];

const RESUME_TEMPLATE_CATEGORIES = [
  'Software Development',
  'Data & Analytics',
  'Product & Operations',
  'Human Resources',
  'Core Engineering'
];

const initialForm: Partial<StoreProduct> = {
  title: '',
  description: '',
  product_type: 'note',
  price: 29.00,
  original_price: 49.00,
  status: 'active'
};

export default function AdminStorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [availableNotes, setAvailableNotes] = useState<NoteOption[]>([]);
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
  
  // Study Note (PDF) State
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [noteCategory, setNoteCategory] = useState<string>('Technical Interview');
  const [noteMinimumPlan, setNoteMinimumPlan] = useState<string>('free');
  const [attachedNoteForEdit, setAttachedNoteForEdit] = useState<NoteOption | null>(null);
  const [editSignedUrl, setEditSignedUrl] = useState<string | null>(null);
  const [isReplacingPdf, setIsReplacingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Resume Template State
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(null);
  const [resumeCategory, setResumeCategory] = useState<string>('Software Development');
  const [resumeMinimumPlan, setResumeMinimumPlan] = useState<string>('starter');
  const [attachedResumeTemplateForEdit, setAttachedResumeTemplateForEdit] = useState<any | null>(null);
  const [isReplacingResumeFile, setIsReplacingResumeFile] = useState(false);
  const [resumeFileSignedUrl, setResumeFileSignedUrl] = useState<string | null>(null);
  const [viewAttachedResumeTemplate, setViewAttachedResumeTemplate] = useState<any | null>(null);

  // Notes Bundle State
  const [selectedBundleNoteIds, setSelectedBundleNoteIds] = useState<Set<string>>(new Set());
  const [bundleSearchTerm, setBundleSearchTerm] = useState('');
  const [bundleCategoryFilter, setBundleCategoryFilter] = useState('all');
  const [bundleNewPdfFiles, setBundleNewPdfFiles] = useState<File[]>([]);
  const [bundleSignedUrls, setBundleSignedUrls] = useState<Record<string, string>>({});
  const [isAddingExistingNoteOpen, setIsAddingExistingNoteOpen] = useState(false);

  // Attached Notes Details for View Modal
  const [viewAttachedNotes, setViewAttachedNotes] = useState<NoteOption[]>([]);
  const [viewSignedUrls, setViewSignedUrls] = useState<Record<string, string>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
    fetchAvailableNotes();
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

  const fetchAvailableNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, category, description, file_url, file_size, technology, status, minimum_plan, access_type')
        .order('title', { ascending: true });

      if (error) throw error;
      if (data) setAvailableNotes(data as NoteOption[]);
    } catch (err) {
      console.error("Error fetching available notes for store:", err);
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
    setUploadedPdf(null);
    setNoteCategory('Technical Interview');
    setNoteMinimumPlan('free');
    setAttachedNoteForEdit(null);
    setEditSignedUrl(null);
    setIsReplacingPdf(false);
    setSelectedBundleNoteIds(new Set());
    setBundleNewPdfFiles([]);
    setBundleSignedUrls({});
    setIsAddingExistingNoteOpen(false);

    // Reset Resume Template state
    setUploadedResumeFile(null);
    setResumeCategory('Software Development');
    setResumeMinimumPlan('starter');
    setAttachedResumeTemplateForEdit(null);
    setIsReplacingResumeFile(false);
    setResumeFileSignedUrl(null);

    setUploadProgress(0);
    setIsFormModalOpen(true);
  };

  const openEditForm = async (p: StoreProduct) => {
    setFormData(p);
    setFormErrors({});
    setSelectedProduct(p);
    setUploadedPdf(null);
    setIsReplacingPdf(false);
    setBundleNewPdfFiles([]);
    setUploadProgress(0);
    setIsAddingExistingNoteOpen(false);

    // Reset Resume Template state
    setUploadedResumeFile(null);
    setAttachedResumeTemplateForEdit(null);
    setIsReplacingResumeFile(false);
    setResumeFileSignedUrl(null);
    setResumeCategory('Software Development');
    setResumeMinimumPlan('starter');

    // 1. If Resume Template, fetch attached resume_templates row
    if (p.product_type === 'resume_template') {
      let matchedTemplate: any = null;
      if (p.item_reference_id) {
        try {
          const { data: tmplData } = await supabase
            .from('resume_templates')
            .select('*')
            .eq('id', p.item_reference_id)
            .maybeSingle();
          if (tmplData) matchedTemplate = tmplData;
        } catch (tErr) {
          console.warn("Could not query resume_templates:", tErr);
        }
      }

      if (!matchedTemplate) {
        try {
          const { data: tmplData } = await supabase
            .from('resume_templates')
            .select('*')
            .eq('title', p.title)
            .maybeSingle();
          if (tmplData) matchedTemplate = tmplData;
        } catch {}
      }

      if (matchedTemplate) {
        setAttachedResumeTemplateForEdit(matchedTemplate);
        setResumeCategory(matchedTemplate.category || 'Software Development');
        setResumeMinimumPlan(matchedTemplate.minimum_plan || 'starter');

        if (matchedTemplate.file_url) {
          if (matchedTemplate.file_url.startsWith('http') || matchedTemplate.file_url.startsWith('/')) {
            setResumeFileSignedUrl(matchedTemplate.file_url);
          } else {
            try {
              const bucket = matchedTemplate.file_url.startsWith('notes/') ? 'notes' : 'resumes';
              const cleanPath = matchedTemplate.file_url.replace(/^(resumes\/|notes\/)/, '');
              const { data: sData } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, 300);
              if (sData?.signedUrl) {
                setResumeFileSignedUrl(sData.signedUrl);
              }
            } catch {
              setResumeFileSignedUrl(null);
            }
          }
        }
      }
    }

    // 2. Fetch attached notes for this product
    const attachedIds = new Set<string>();
    let primaryNote: NoteOption | null = null;

    if (p.item_reference_id && p.product_type !== 'resume_template') {
      attachedIds.add(p.item_reference_id);
      primaryNote = availableNotes.find(n => n.id === p.item_reference_id) || null;
    }

    try {
      const { data: junctionData } = await supabase
        .from('store_product_notes')
        .select('note_id, notes (*)')
        .eq('product_id', p.id);

      if (junctionData && junctionData.length > 0) {
        junctionData.forEach((row: any) => {
          if (row.note_id) attachedIds.add(row.note_id);
          if (!primaryNote && row.notes) {
            primaryNote = row.notes;
          }
        });
      }
    } catch (err) {
      console.warn("Could not query store_product_notes:", err);
    }

    setSelectedBundleNoteIds(attachedIds);
    setAttachedNoteForEdit(primaryNote);
    if (primaryNote) {
      setNoteCategory(primaryNote.category || 'Technical Interview');
      setNoteMinimumPlan(primaryNote.minimum_plan || 'free');

      // Generate signed URL for instant viewing
      if (primaryNote.file_url) {
        const { data: urlData } = await supabase.storage.from('notes').createSignedUrl(primaryNote.file_url, 300);
        if (urlData?.signedUrl) {
          setEditSignedUrl(urlData.signedUrl);
        }
      }
    } else {
      setEditSignedUrl(null);
    }

    // Generate signed URLs for all bundle notes
    const bUrls: Record<string, string> = {};
    for (const noteId of Array.from(attachedIds)) {
      const match = availableNotes.find(n => n.id === noteId);
      if (match?.file_url) {
        const { data: urlData } = await supabase.storage.from('notes').createSignedUrl(match.file_url, 300);
        if (urlData?.signedUrl) {
          bUrls[noteId] = urlData.signedUrl;
        }
      }
    }
    setBundleSignedUrls(bUrls);

    setIsFormModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  // PDF File Selection for Single Note
  const handlePdfSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFormErrors(prev => ({ ...prev, pdf: "Only PDF (.pdf) files are supported." }));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, pdf: "File size exceeds maximum allowed 50 MB." }));
      return;
    }
    setUploadedPdf(file);
    setFormErrors(prev => { const next = { ...prev }; delete next.pdf; return next; });
  };

  // Multiple PDF Selection for Bundle
  const handleBundlePdfsSelected = (files: FileList | null) => {
    if (!files) return;
    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith('.pdf') && file.size <= 50 * 1024 * 1024) {
        valid.push(file);
      }
    }
    setBundleNewPdfFiles(prev => [...prev, ...valid]);
  };

  const removeBundlePdf = (index: number) => {
    setBundleNewPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachedBundleNote = (noteId: string) => {
    setSelectedBundleNoteIds(prev => {
      const next = new Set(prev);
      next.delete(noteId);
      return next;
    });
  };

  const toggleBundleNoteSelection = (noteId: string) => {
    setSelectedBundleNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = "Product Title is required.";
    if (!formData.product_type) errors.product_type = "Product Type is required.";
    if (formData.price === undefined || formData.price === null || Number(formData.price) < 0) {
      errors.price = "Valid price is required.";
    }

    if (formData.product_type === 'note') {
      // Must have PDF file if new product OR if replacing
      if (!selectedProduct && !uploadedPdf) {
        errors.pdf = "Please upload a Note PDF file.";
      }
      if (selectedProduct && isReplacingPdf && !uploadedPdf) {
        errors.pdf = "Please choose a replacement Note PDF file.";
      }
    }

    if (formData.product_type === 'note_bundle') {
      const totalNotes = selectedBundleNoteIds.size + bundleNewPdfFiles.length;
      if (totalNotes === 0) {
        errors.bundle = "Add at least one note to create a Notes Bundle.";
      }
    }

    if (formData.product_type === 'resume_template') {
      if (!selectedProduct && !uploadedResumeFile) {
        errors.resumeFile = "Please upload a Resume Template file (.pdf, .doc, .docx).";
      }
      if (selectedProduct && isReplacingResumeFile && !uploadedResumeFile) {
        errors.resumeFile = "Please choose a replacement Resume Template file.";
      }
      if (uploadedResumeFile) {
        const validExts = ['.pdf', '.doc', '.docx'];
        const lowerName = uploadedResumeFile.name.toLowerCase();
        const hasValidExt = validExts.some(ext => lowerName.endsWith(ext));
        if (!hasValidExt) {
          errors.resumeFile = "Only PDF, DOC, and DOCX files are supported.";
        }
        if (uploadedResumeFile.size > 50 * 1024 * 1024) {
          errors.resumeFile = "The template file must be 50 MB or smaller.";
        }
      }
      if (!resumeCategory?.trim()) {
        errors.resumeCategory = "Please select a template category.";
      }
      if (!resumeMinimumPlan?.trim()) {
        errors.resumeMinimumPlan = "Please select the minimum subscription plan.";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    setUploadProgress(10);
    
    let createdNoteId: string | null = null;
    let uploadedStoragePath: string | null = null;
    let oldStoragePathToDelete: string | null = null;

    try {
      const pType = formData.product_type || 'note';
      let primaryItemRefId = formData.item_reference_id || null;
      const allLinkedNoteIds = new Set<string>(selectedBundleNoteIds);

      // --- 1. SINGLE STUDY NOTE PDF HANDLING ---
      if (pType === 'note') {
        if (uploadedPdf) {
          setUploadProgress(35);
          const cleanName = `${Date.now()}_${uploadedPdf.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `notes/store_${cleanName}`;

          // Step 1: Upload new file first
          const { error: uploadError } = await supabase.storage
            .from('notes')
            .upload(filePath, uploadedPdf, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            throw new Error(`Unable to upload the note PDF. ${uploadError.message}`);
          }

          uploadedStoragePath = filePath;
          setUploadProgress(60);

          const formattedSize = `${(uploadedPdf.size / (1024 * 1024)).toFixed(1)} MB`;

          const notePayload = {
            title: formData.title,
            category: noteCategory,
            description: formData.description || `Study Note for ${formData.title}`,
            file_url: filePath,
            file_size: formattedSize,
            status: formData.status === 'inactive' ? 'Inactive' : 'Active',
            minimum_plan: noteMinimumPlan,
            access_type: noteMinimumPlan === 'free' ? 'Free' : 'Premium',
            updated_at: new Date().toISOString()
          };

          if (selectedProduct && attachedNoteForEdit) {
            // Safe Replace: keep same Note ID to preserve student purchases
            oldStoragePathToDelete = attachedNoteForEdit.file_url || null;

            const { error: updateNoteErr } = await supabase
              .from('notes')
              .update(notePayload)
              .eq('id', attachedNoteForEdit.id);
            if (updateNoteErr) throw updateNoteErr;
            createdNoteId = attachedNoteForEdit.id;
          } else {
            // New Note
            const { data: newNote, error: createNoteErr } = await supabase
              .from('notes')
              .insert(notePayload)
              .select('id')
              .single();

            if (createNoteErr || !newNote) throw createNoteErr || new Error("Failed to create note record.");
            createdNoteId = newNote.id;
          }

          primaryItemRefId = createdNoteId;
          if (createdNoteId) {
            allLinkedNoteIds.add(createdNoteId);
          }
        } else if (selectedProduct && attachedNoteForEdit) {
          // Admin updated metadata without replacing PDF
          const notePayload = {
            title: formData.title,
            category: noteCategory,
            description: formData.description || `Study Note for ${formData.title}`,
            status: formData.status === 'inactive' ? 'Inactive' : 'Active',
            minimum_plan: noteMinimumPlan,
            access_type: noteMinimumPlan === 'free' ? 'Free' : 'Premium',
            updated_at: new Date().toISOString()
          };

          const { error: updateNoteErr } = await supabase
            .from('notes')
            .update(notePayload)
            .eq('id', attachedNoteForEdit.id);
          if (updateNoteErr) throw updateNoteErr;

          primaryItemRefId = attachedNoteForEdit.id;
          allLinkedNoteIds.add(attachedNoteForEdit.id);
        }
      }

      // --- 2. NOTES BUNDLE MULTI-PDF UPLOAD HANDLING ---
      if (pType === 'note_bundle' && bundleNewPdfFiles.length > 0) {
        setUploadProgress(30);
        for (let i = 0; i < bundleNewPdfFiles.length; i++) {
          const file = bundleNewPdfFiles[i];
          const cleanName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `notes/store_bundle_${cleanName}`;

          const { error: uploadError } = await supabase.storage
            .from('notes')
            .upload(filePath, file, { contentType: 'application/pdf', upsert: true });

          if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);

          const formattedSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
          const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_]/g, ' ');

          const { data: newNote, error: createNoteErr } = await supabase
            .from('notes')
            .insert({
              title: cleanTitle,
              category: 'Technical Interview',
              description: `Included in ${formData.title}`,
              file_url: filePath,
              file_size: formattedSize,
              status: 'Active',
              minimum_plan: 'pro',
              access_type: 'Premium'
            })
            .select('id')
            .single();

          if (createNoteErr || !newNote) throw createNoteErr;
          allLinkedNoteIds.add(newNote.id);
        }
        setUploadProgress(70);
      }

      // --- 3. RESUME TEMPLATE FILE UPLOAD & DUAL-TABLE SYNCHRONIZATION ---
      if (pType === 'resume_template') {
        const isFreePlan = resumeMinimumPlan === 'free' || Number(formData.price) === 0;

        if (uploadedResumeFile) {
          setUploadProgress(35);
          const cleanName = `${Date.now()}_${uploadedResumeFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `templates/resume_${cleanName}`;

          // Upload to 'resumes' storage bucket (with graceful fallback to 'notes')
          let uploadBucket = 'resumes';
          let { error: uploadError } = await supabase.storage
            .from(uploadBucket)
            .upload(filePath, uploadedResumeFile, {
              contentType: uploadedResumeFile.type || 'application/octet-stream',
              upsert: true
            });

          if (uploadError) {
            uploadBucket = 'notes';
            const fallbackPath = `templates/resume_${cleanName}`;
            const { error: fallbackErr } = await supabase.storage
              .from(uploadBucket)
              .upload(fallbackPath, uploadedResumeFile, {
                contentType: uploadedResumeFile.type || 'application/octet-stream',
                upsert: true
              });
            if (fallbackErr) {
              throw new Error(`Unable to upload the resume template file: ${uploadError.message}`);
            }
            uploadedStoragePath = `notes/${fallbackPath}`;
          } else {
            uploadedStoragePath = `resumes/${filePath}`;
          }

          setUploadProgress(60);

          const templatePayload = {
            title: formData.title,
            description: formData.description || `Resume Template for ${formData.title}`,
            category: resumeCategory,
            file_url: uploadedStoragePath,
            minimum_plan: resumeMinimumPlan,
            price: Number(formData.price),
            is_free: isFreePlan,
            is_active: formData.status !== 'inactive',
            updated_at: new Date().toISOString()
          };

          if (selectedProduct && attachedResumeTemplateForEdit) {
            const { error: updateTmplErr } = await supabase
              .from('resume_templates')
              .update(templatePayload)
              .eq('id', attachedResumeTemplateForEdit.id);
            if (updateTmplErr) throw updateTmplErr;
            primaryItemRefId = attachedResumeTemplateForEdit.id;
          } else {
            const { data: newTmpl, error: createTmplErr } = await supabase
              .from('resume_templates')
              .insert(templatePayload)
              .select('id')
              .single();
            if (createTmplErr || !newTmpl) throw createTmplErr || new Error("Failed to create resume template record.");
            primaryItemRefId = newTmpl.id;
          }
        } else if (selectedProduct && attachedResumeTemplateForEdit) {
          // Admin edited metadata without replacing file
          const templatePayload = {
            title: formData.title,
            description: formData.description || `Resume Template for ${formData.title}`,
            category: resumeCategory,
            minimum_plan: resumeMinimumPlan,
            price: Number(formData.price),
            is_free: isFreePlan,
            is_active: formData.status !== 'inactive',
            updated_at: new Date().toISOString()
          };

          const { error: updateTmplErr } = await supabase
            .from('resume_templates')
            .update(templatePayload)
            .eq('id', attachedResumeTemplateForEdit.id);
          if (updateTmplErr) throw updateTmplErr;
          primaryItemRefId = attachedResumeTemplateForEdit.id;
        }
      }

      // --- 4. SAVE STORE PRODUCT RECORD ---
      const productPayload = {
        title: formData.title,
        description: formData.description || '',
        product_type: formData.product_type,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : null,
        item_reference_id: primaryItemRefId,
        status: formData.status || 'active',
        updated_at: new Date().toISOString()
      };

      let finalProductId = selectedProduct?.id;

      if (selectedProduct) {
        // Update product
        let res = await supabase
          .from('store_products')
          .update(productPayload)
          .eq('id', selectedProduct.id);

        if (res.error && (res.error.message?.includes('item_reference_id') || res.error.code === 'PGRST204')) {
          const { item_reference_id, ...fallbackPayload } = productPayload;
          const retryRes = await supabase
            .from('store_products')
            .update(fallbackPayload)
            .eq('id', selectedProduct.id);
          if (retryRes.error) throw retryRes.error;
        } else if (res.error) {
          throw res.error;
        }
      } else {
        // Insert product
        let res = await supabase
          .from('store_products')
          .insert(productPayload)
          .select('id')
          .single();

        if (res.error && (res.error.message?.includes('item_reference_id') || res.error.code === 'PGRST204')) {
          const { item_reference_id, ...fallbackPayload } = productPayload;
          res = await supabase
            .from('store_products')
            .insert(fallbackPayload)
            .select('id')
            .single();
        }

        if (res.error || !res.data) throw res.error || new Error("Failed to insert store product.");
        finalProductId = res.data.id;
      }

      setUploadProgress(85);

      // --- 4. LINK NOTES IN JUNCTION TABLE (store_product_notes) ---
      if (finalProductId && allLinkedNoteIds.size > 0) {
        try {
          if (selectedProduct) {
            await supabase
              .from('store_product_notes')
              .delete()
              .eq('product_id', finalProductId);
          }

          const junctionRows = Array.from(allLinkedNoteIds).map(noteId => ({
            product_id: finalProductId,
            note_id: noteId
          }));

          await supabase
            .from('store_product_notes')
            .upsert(junctionRows, { onConflict: 'product_id,note_id' });
        } catch (juncErr) {
          console.warn("Could not insert junction rows into store_product_notes:", juncErr);
        }
      }

      // --- 5. SAFE CLEANUP OF OLD REPLACED PDF ---
      // Only delete old file after all database writes succeed!
      if (oldStoragePathToDelete && uploadedStoragePath && oldStoragePathToDelete !== uploadedStoragePath) {
        supabase.storage.from('notes').remove([oldStoragePathToDelete]).catch(cleanupErr => {
          console.warn("Non-fatal: could not delete old replaced PDF:", cleanupErr);
        });
      }

      setUploadProgress(100);
      await fetchProducts();
      await fetchAvailableNotes();
      setIsFormModalOpen(false);
    } catch (err: any) {
      console.error("Error saving store product:", err);
      // Safe cleanup of newly uploaded orphan file if product save failed
      if (uploadedStoragePath && !selectedProduct) {
        await supabase.storage.from('notes').remove([uploadedStoragePath]).catch(() => {});
      }
      alert(err.message || "Failed to save product. Please check your inputs.");
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  // ---------------- VIEW MODAL HANDLING ---------------- //
  const openViewModal = async (p: StoreProduct) => {
    setSelectedProduct(p);
    setViewAttachedNotes([]);
    setViewSignedUrls({});
    setViewAttachedResumeTemplate(null);
    setResumeFileSignedUrl(null);
    setIsViewModalOpen(true);

    // 1. If resume_template, fetch attached template details
    if (p.product_type === 'resume_template') {
      let matchTmpl: any = null;
      if (p.item_reference_id) {
        try {
          const { data: tmplData } = await supabase
            .from('resume_templates')
            .select('*')
            .eq('id', p.item_reference_id)
            .maybeSingle();
          if (tmplData) matchTmpl = tmplData;
        } catch (tErr) {
          console.warn("Could not query resume_templates:", tErr);
        }
      }

      if (!matchTmpl) {
        try {
          const { data: tmplData } = await supabase
            .from('resume_templates')
            .select('*')
            .eq('title', p.title)
            .maybeSingle();
          if (tmplData) matchTmpl = tmplData;
        } catch {}
      }

      setViewAttachedResumeTemplate(matchTmpl);

      if (matchTmpl?.file_url) {
        if (matchTmpl.file_url.startsWith('http') || matchTmpl.file_url.startsWith('/')) {
          setResumeFileSignedUrl(matchTmpl.file_url);
        } else {
          try {
            const bucket = matchTmpl.file_url.startsWith('notes/') ? 'notes' : 'resumes';
            const cleanPath = matchTmpl.file_url.replace(/^(resumes\/|notes\/)/, '');
            const { data: sData } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, 180);
            if (sData?.signedUrl) {
              setResumeFileSignedUrl(sData.signedUrl);
            }
          } catch {
            setResumeFileSignedUrl(null);
          }
        }
      }
      return;
    }

    const notesList: NoteOption[] = [];

    // Check item_reference_id
    if (p.item_reference_id) {
      const match = availableNotes.find(n => n.id === p.item_reference_id);
      if (match) notesList.push(match);
    }

    // Check store_product_notes
    try {
      const { data: junctionData } = await supabase
        .from('store_product_notes')
        .select('note_id, notes (*)')
        .eq('product_id', p.id);

      if (junctionData) {
        junctionData.forEach((row: any) => {
          if (row.notes && !notesList.some(n => n.id === row.notes.id)) {
            notesList.push(row.notes);
          }
        });
      }
    } catch (err) {
      console.warn("Could not load view notes:", err);
    }

    setViewAttachedNotes(notesList);

    // Create signed URLs for previewing notes
    const urls: Record<string, string> = {};
    for (const n of notesList) {
      if (n.file_url) {
        const { data } = await supabase.storage.from('notes').createSignedUrl(n.file_url, 180);
        if (data?.signedUrl) {
          urls[n.id] = data.signedUrl;
        }
      }
    }
    setViewSignedUrls(urls);
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

      // If this is a resume template with item_reference_id, sync is_active
      if (selectedProduct.product_type === 'resume_template' && selectedProduct.item_reference_id) {
        try {
          await supabase
            .from('resume_templates')
            .update({ is_active: newStatus === 'active' })
            .eq('id', selectedProduct.item_reference_id);
        } catch {
          // Graceful fallback
        }
      }
      
      await fetchProducts();
      setIsStatusModalOpen(false);
    } catch (err: any) {
      console.error("Error toggling product status:", err);
      alert(err.message || "Failed to toggle status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setIsProcessing(true);
    try {
      // 1. Delete junction links if any
      try {
        await supabase.from('store_product_notes').delete().eq('product_id', selectedProduct.id);
      } catch {
        // Table or row may not exist
      }

      // 2. If this is a resume template with item_reference_id, soft-deactivate the template row to preserve buyer access
      if (selectedProduct.product_type === 'resume_template' && selectedProduct.item_reference_id) {
        try {
          await supabase
            .from('resume_templates')
            .update({ is_active: false })
            .eq('id', selectedProduct.item_reference_id);
        } catch {
          // Graceful fallback
        }
      }

      // 3. Delete product (cascades to store_product_notes, leaves public.notes intact)
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', selectedProduct.id);
      if (error) throw error;
      
      await fetchProducts();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error("Error deleting product:", err);
      alert(err.message || "Failed to delete product.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered notes in bundle selector modal
  const filteredAvailableNotes = availableNotes.filter(n => {
    const matchesSearch = bundleSearchTerm === '' || 
      n.title.toLowerCase().includes(bundleSearchTerm.toLowerCase()) ||
      n.category.toLowerCase().includes(bundleSearchTerm.toLowerCase());
    const matchesCat = bundleCategoryFilter === 'all' || n.category === bundleCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Selected bundle notes list resolved with full metadata
  const includedBundleNotes = Array.from(selectedBundleNoteIds)
    .map(id => availableNotes.find(n => n.id === id))
    .filter(Boolean) as NoteOption[];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Store Products</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
              Create and manage digital products, study note downloads, PDF bundles, and question packs.
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

          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
            <div className="w-1/2 sm:w-44">
              <select
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="w-full border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] shadow-xs"
              >
                <option value="">All Types</option>
                <option value="note">Study Note (PDF)</option>
                <option value="question_pack">Question Pack</option>
                <option value="timed_assessment">Timed Assessment</option>
                <option value="ai_mock_interview">AI Mock Interview</option>
                <option value="resume_template">Resume Template</option>
                <option value="note_bundle">Notes Bundle</option>
                <option value="interview_bundle">Interview Master Bundle</option>
              </select>
            </div>

            <div className="w-1/2 sm:w-36">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] shadow-xs"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {(searchQuery || typeFilter || statusFilter) && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs shrink-0">
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-xs)] overflow-hidden">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-brand-500)] border-t-transparent"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState 
              title="No store products found" 
              description={searchQuery || typeFilter || statusFilter ? "No products matched your search or filters." : "Create your first store product to start selling learning content."}
              action={
                <Button size="sm" onClick={openAddForm}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Store Product
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-b border-[var(--color-border)] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Product Title</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Original Price</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {paginatedProducts.map((p) => {
                      const typeMeta = PRODUCT_TYPE_LABELS[p.product_type] || {
                        label: p.product_type,
                        color: 'bg-slate-50',
                        textColor: 'text-slate-700',
                        border: 'border-slate-200'
                      };

                      return (
                        <tr key={p.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                          <td className="py-3 px-4 font-bold text-[var(--color-text-primary)] max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              {p.product_type === 'note' && <FileText className="w-4 h-4 text-emerald-600 shrink-0" />}
                              {p.product_type === 'note_bundle' && <Layers className="w-4 h-4 text-blue-600 shrink-0" />}
                              {p.product_type === 'question_pack' && <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />}
                              {p.product_type === 'interview_bundle' && <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />}
                              {p.product_type === 'timed_assessment' && <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
                              {p.product_type === 'ai_mock_interview' && <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />}
                              {p.product_type === 'resume_template' && <FileText className="w-4 h-4 text-teal-600 shrink-0" />}
                              <span className="truncate">{p.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.color} ${typeMeta.textColor} ${typeMeta.border}`}>
                              {typeMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-[var(--color-text-primary)]">
                            ₹{p.price}
                          </td>
                          <td className="py-3 px-4 text-[var(--color-text-tertiary)]">
                            {p.original_price ? `₹${p.original_price}` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {p.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button onClick={() => openViewModal(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View Overview & Content">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditForm(p)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit Product & Content">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedProduct(p); setIsStatusModalOpen(true); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Toggle Status">
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
      <Modal 
        isOpen={isFormModalOpen} 
        onClose={() => !isProcessing && setIsFormModalOpen(false)} 
        title={selectedProduct ? "Edit Store Product & Content" : "Add Store Product & Content"} 
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
          
          {/* 1. Basic Product Information */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Product Title *</label>
              <input 
                type="text" 
                name="title" 
                value={formData.title || ''} 
                onChange={handleFormChange} 
                placeholder="e.g. Python Full Stack Interview Guide (PDF)" 
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" 
              />
              {formErrors.title && <p className="text-red-500 mt-1">{formErrors.title}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[var(--color-text-primary)] mb-1">Product Type *</label>
                <select 
                  name="product_type" 
                  value={formData.product_type} 
                  onChange={handleFormChange} 
                  disabled={Boolean(selectedProduct && (attachedNoteForEdit || selectedBundleNoteIds.size > 0))}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white font-medium disabled:bg-[var(--color-bg-muted)] disabled:opacity-75"
                >
                  <option value="note">Study Note (PDF)</option>
                  <option value="question_pack">Question Pack</option>
                  <option value="timed_assessment">Timed Assessment</option>
                  <option value="ai_mock_interview">AI Mock Interview</option>
                  <option value="resume_template">Resume Template</option>
                  <option value="note_bundle">Notes Bundle</option>
                  <option value="interview_bundle">Interview Master Bundle</option>
                </select>
                {selectedProduct && (attachedNoteForEdit || selectedBundleNoteIds.size > 0) && (
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 flex items-center gap-1">
                    <Info className="w-3 h-3 text-amber-600" /> Type locked (content attached)
                  </p>
                )}
              </div>
              <div>
                <label className="block font-bold text-[var(--color-text-primary)] mb-1">Selling Price (₹) *</label>
                <input 
                  type="number" 
                  name="price" 
                  value={formData.price} 
                  onChange={handleFormChange} 
                  placeholder="29" 
                  min="0" 
                  step="1" 
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" 
                />
                {formErrors.price && <p className="text-red-500 mt-1">{formErrors.price}</p>}
              </div>
              <div>
                <label className="block font-bold text-[var(--color-text-primary)] mb-1">Original Price (₹)</label>
                <input 
                  type="number" 
                  name="original_price" 
                  value={formData.original_price || ''} 
                  onChange={handleFormChange} 
                  placeholder="49" 
                  min="0" 
                  step="1" 
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" 
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">Description *</label>
              <textarea 
                name="description" 
                value={formData.description || ''} 
                onChange={handleFormChange} 
                rows={2} 
                placeholder="Detailed summary of what the student gets upon purchasing this item..." 
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white" 
              />
            </div>
          </div>

          {/* 2. DYNAMIC CONTENT ATTACHMENT SECTION */}

          {/* --- CASE A: STUDY NOTE (PDF) --- */}
          {formData.product_type === 'note' && (
            <div className="rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Study Note Content</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium">Supported: PDF only (Max 50 MB)</span>
              </div>

              {/* Current Attached PDF Display in Edit Mode */}
              {selectedProduct && attachedNoteForEdit && !isReplacingPdf && (
                <div className="bg-white border border-emerald-200 rounded-[var(--radius-md)] p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Current Attached PDF
                          </span>
                        </div>
                        <p className="font-bold text-sm text-[var(--color-text-primary)] mt-1">{attachedNoteForEdit.title}</p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                          Category: <strong>{attachedNoteForEdit.category}</strong> • Size: <strong>{attachedNoteForEdit.file_size || 'PDF'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                    {editSignedUrl && (
                      <a 
                        href={editSignedUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)] bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View PDF
                      </a>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsReplacingPdf(true)} 
                      className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Replace PDF
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload or Replacement Dropzone */}
              {(!selectedProduct || !attachedNoteForEdit || isReplacingPdf) && (
                <div className="space-y-2">
                  {isReplacingPdf && (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2.5 rounded-[var(--radius-md)] text-amber-900 text-xs">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Select a new PDF file to replace <strong>{attachedNoteForEdit?.title}</strong></span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setIsReplacingPdf(false); setUploadedPdf(null); }} 
                        className="font-bold text-amber-800 hover:underline shrink-0 ml-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {!uploadedPdf ? (
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-emerald-300 rounded-[var(--radius-lg)] bg-white hover:bg-emerald-50/50 cursor-pointer transition-colors text-center">
                      <Upload className="w-6 h-6 text-emerald-600 mb-1.5" />
                      <span className="font-bold text-emerald-950">Click to choose PDF or drag & drop</span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Maximum size: 50 MB • PDF Document</span>
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handlePdfSelected(e.target.files[0]);
                          }
                        }} 
                      />
                    </label>
                  ) : (
                    <div className="bg-white border border-emerald-300 rounded-[var(--radius-md)] p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--color-text-primary)]">{uploadedPdf.name}</p>
                          <p className="text-[10px] text-[var(--color-text-tertiary)]">{(uploadedPdf.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setUploadedPdf(null)} 
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Remove selected file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {formErrors.pdf && <p className="text-red-500 text-xs font-semibold">{formErrors.pdf}</p>}

              {/* Note Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-[var(--color-text-primary)] mb-1">Note Category *</label>
                  <select 
                    value={noteCategory} 
                    onChange={e => setNoteCategory(e.target.value)} 
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white"
                  >
                    {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[var(--color-text-primary)] mb-1">Subscription Tier Default</label>
                  <select 
                    value={noteMinimumPlan} 
                    onChange={e => setNoteMinimumPlan(e.target.value)} 
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white"
                  >
                    <option value="free">Free Access</option>
                    <option value="starter">Starter Plan</option>
                    <option value="pro">Pro Plan</option>
                    <option value="premium">Premium Plan</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* --- CASE B: NOTES BUNDLE --- */}
          {formData.product_type === 'note_bundle' && (
            <div className="rounded-[var(--radius-lg)] border border-blue-200 bg-blue-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                <div className="flex items-center gap-2 text-blue-950 font-bold text-xs uppercase tracking-wide">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Bundle Contents</span>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  Included Notes: {includedBundleNotes.length + bundleNewPdfFiles.length}
                </span>
              </div>

              {formErrors.bundle && <p className="text-red-500 text-xs font-semibold">{formErrors.bundle}</p>}

              {/* 1. Included Notes List with View and Remove Buttons */}
              <div className="bg-white border border-blue-200 rounded-[var(--radius-md)] p-3 space-y-2">
                <span className="font-bold text-xs text-[var(--color-text-primary)] block">
                  Currently Attached Notes ({includedBundleNotes.length + bundleNewPdfFiles.length})
                </span>

                {includedBundleNotes.length === 0 && bundleNewPdfFiles.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-text-tertiary)] italic py-2 text-center">
                    No notes currently included. Use the options below to add notes.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {includedBundleNotes.map((note, index) => (
                      <div key={note.id} className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">{index + 1}.</span>
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-[var(--color-text-primary)] truncate">{note.title}</span>
                            <span className="text-[10px] text-[var(--color-text-tertiary)] ml-1.5">({note.category} • {note.file_size || 'PDF'})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {bundleSignedUrls[note.id] && (
                            <a 
                              href={bundleSignedUrls[note.id]} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> View
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachedBundleNote(note.id)}
                            className="px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-bold"
                            title="Remove from bundle"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* New Uploaded PDFs not yet saved */}
                    {bundleNewPdfFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-emerald-50/60 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-950 truncate">{file.name}</span>
                          <span className="text-[10px] text-emerald-700">({(file.size / (1024 * 1024)).toFixed(1)} MB • New)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBundlePdf(idx)}
                          className="text-red-500 hover:text-red-700 text-[10px] font-bold px-2 py-0.5"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Add Existing Note Toggle / Searchable Selector */}
              <div className="bg-white border border-blue-200 rounded-[var(--radius-md)] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--color-text-primary)]">Add Existing Notes from Library</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAddingExistingNoteOpen(!isAddingExistingNoteOpen)} 
                    className="text-[11px] h-7"
                  >
                    {isAddingExistingNoteOpen ? 'Hide Library' : '+ Browse Notes Library'}
                  </Button>
                </div>

                {isAddingExistingNoteOpen && (
                  <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                    <div className="flex items-center justify-between gap-2">
                      <input 
                        type="text" 
                        placeholder="Search notes by title..." 
                        value={bundleSearchTerm} 
                        onChange={e => setBundleSearchTerm(e.target.value)} 
                        className="px-2.5 py-1 border border-[var(--color-border)] rounded text-xs flex-1 outline-none" 
                      />
                      <select 
                        value={bundleCategoryFilter} 
                        onChange={e => setBundleCategoryFilter(e.target.value)}
                        className="px-2 py-1 border border-[var(--color-border)] rounded text-xs bg-white outline-none"
                      >
                        <option value="all">All Categories</option>
                        {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-[var(--color-border)] pr-1">
                      {filteredAvailableNotes.length === 0 ? (
                        <p className="text-[11px] text-[var(--color-text-tertiary)] py-2 text-center">No matching notes found.</p>
                      ) : (
                        filteredAvailableNotes.map(n => {
                          const isSelected = selectedBundleNoteIds.has(n.id);
                          return (
                            <label 
                              key={n.id} 
                              className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/80 font-semibold' : 'hover:bg-[var(--color-bg-subtle)]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected} 
                                  onChange={() => toggleBundleNoteSelection(n.id)} 
                                  className="h-3.5 w-3.5 rounded border-[var(--color-border)] text-blue-600 focus:ring-blue-500" 
                                />
                                <span className="text-xs text-[var(--color-text-primary)]">{n.title}</span>
                              </div>
                              <span className="text-[10px] text-[var(--color-text-tertiary)]">{n.category}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Upload Additional PDF Notes into Bundle */}
              <div className="bg-white border border-blue-200 rounded-[var(--radius-md)] p-3 space-y-2">
                <span className="font-bold text-[var(--color-text-primary)] block">Upload New Note PDFs to Bundle</span>
                <label className="flex items-center justify-center p-3 border border-dashed border-blue-300 rounded bg-blue-50/20 hover:bg-blue-50/50 cursor-pointer text-center">
                  <Upload className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-900 text-xs">Choose PDF files to add to bundle</span>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    multiple 
                    className="hidden" 
                    onChange={e => handleBundlePdfsSelected(e.target.files)} 
                  />
                </label>
              </div>

            </div>
          )}

          {/* --- CASE C: RESUME TEMPLATE --- */}
          {formData.product_type === 'resume_template' && (
            <div className="rounded-[var(--radius-lg)] border border-teal-200 bg-teal-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
                <div className="flex items-center gap-2 text-teal-950 font-bold text-xs uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Resume Template Content</span>
                </div>
                <span className="text-[10px] text-teal-700 font-medium">Supported: PDF, DOC, DOCX (Max 50 MB)</span>
              </div>

              {/* Current Attached Template Display in Edit Mode */}
              {selectedProduct && attachedResumeTemplateForEdit && !isReplacingResumeFile && (
                <div className="bg-white border border-teal-200 rounded-[var(--radius-md)] p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            Current Attached Template
                          </span>
                        </div>
                        <p className="font-bold text-sm text-[var(--color-text-primary)] mt-1">{attachedResumeTemplateForEdit.title}</p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                          Category: <strong>{attachedResumeTemplateForEdit.category}</strong> • Plan: <strong className="capitalize">{attachedResumeTemplateForEdit.minimum_plan || 'starter'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                    {resumeFileSignedUrl && (
                      <a 
                        href={resumeFileSignedUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)] bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Template
                      </a>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsReplacingResumeFile(true)} 
                      className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Replace File
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload or Replacement Dropzone */}
              {(!selectedProduct || !attachedResumeTemplateForEdit || isReplacingResumeFile) && (
                <div className="space-y-2">
                  {isReplacingResumeFile && (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2.5 rounded-[var(--radius-md)] text-amber-900 text-xs">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Select a new file to replace <strong>{attachedResumeTemplateForEdit?.title}</strong></span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setIsReplacingResumeFile(false); setUploadedResumeFile(null); }} 
                        className="font-bold text-amber-800 hover:underline shrink-0 ml-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {!uploadedResumeFile ? (
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-teal-300 rounded-[var(--radius-lg)] bg-white hover:bg-teal-50/50 cursor-pointer transition-colors text-center">
                      <Upload className="w-6 h-6 text-teal-600 mb-1.5" />
                      <span className="font-bold text-teal-950">Click to choose Resume Template or drag & drop</span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Maximum size: 50 MB • PDF, DOC, DOCX</span>
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const validExts = ['.pdf', '.doc', '.docx'];
                            const lowerName = file.name.toLowerCase();
                            const hasValidExt = validExts.some(ext => lowerName.endsWith(ext));
                            if (!hasValidExt) {
                              setFormErrors(prev => ({ ...prev, resumeFile: "Only PDF, DOC, and DOCX files are supported." }));
                              return;
                            }
                            if (file.size > 50 * 1024 * 1024) {
                              setFormErrors(prev => ({ ...prev, resumeFile: "File size exceeds 50 MB." }));
                              return;
                            }
                            setUploadedResumeFile(file);
                            setFormErrors(prev => { const next = { ...prev }; delete next.resumeFile; return next; });
                          }
                        }} 
                      />
                    </label>
                  ) : (
                    <div className="bg-white border border-teal-300 rounded-[var(--radius-md)] p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--color-text-primary)]">{uploadedResumeFile.name}</p>
                          <p className="text-[10px] text-[var(--color-text-tertiary)]">{(uploadedResumeFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setUploadedResumeFile(null)} 
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Remove selected file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {formErrors.resumeFile && <p className="text-red-500 text-xs font-semibold">{formErrors.resumeFile}</p>}

              {/* Template Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-[var(--color-text-primary)] mb-1">Role Category *</label>
                  <select 
                    value={resumeCategory} 
                    onChange={e => setResumeCategory(e.target.value)} 
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white"
                  >
                    {RESUME_TEMPLATE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {formErrors.resumeCategory && <p className="text-red-500 text-xs mt-1">{formErrors.resumeCategory}</p>}
                </div>
                <div>
                  <label className="block font-bold text-[var(--color-text-primary)] mb-1">Subscription Tier Default *</label>
                  <select 
                    value={resumeMinimumPlan} 
                    onChange={e => setResumeMinimumPlan(e.target.value)} 
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs focus:ring-2 focus:ring-[var(--color-brand-500)] outline-none bg-white"
                  >
                    <option value="free">Free Access</option>
                    <option value="starter">Starter Plan</option>
                    <option value="pro">Pro Plan</option>
                    <option value="premium">Premium Plan</option>
                  </select>
                  {formErrors.resumeMinimumPlan && <p className="text-red-500 text-xs mt-1">{formErrors.resumeMinimumPlan}</p>}
                </div>
              </div>
            </div>
          )}

          {/* 3. Publishing Status */}
          <div>
            <label className="block font-bold text-[var(--color-text-primary)] mb-1">Publishing Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="active" checked={formData.status === 'active'} onChange={handleFormChange} />
                <span>Active (Listed in Store)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value="inactive" checked={formData.status === 'inactive'} onChange={handleFormChange} />
                <span>Inactive (Hidden from Students)</span>
              </label>
            </div>
          </div>

          {/* 4. Upload Progress Bar */}
          {isProcessing && uploadProgress > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] font-bold text-emerald-800">
                <span>Saving & Securing Content...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 5. Live Admin Preview Box */}
          <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3 bg-[var(--color-bg-subtle)] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] block">
              Store Card Preview
            </span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--color-text-primary)] truncate">
                {formData.title || 'Untitled Product'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-emerald-700">₹{formData.price || 0}</span>
                {formData.original_price && <span className="line-through text-[10px] text-[var(--color-text-tertiary)]">₹{formData.original_price}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)]">
              <span className="capitalize">{formData.product_type?.replace('_', ' ')}</span>
              <span>•</span>
              <span>Status: <strong className="capitalize">{formData.status}</strong></span>
              {formData.product_type === 'note' && (uploadedPdf || attachedNoteForEdit) && (
                <>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">{uploadedPdf ? uploadedPdf.name : attachedNoteForEdit?.title}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? 'Saving Content...' : selectedProduct ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW MODAL WITH CONTENT PREVIEW */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Product & Content Overview" className="max-w-lg">
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

            {/* Case A: Attached Resume Template */}
            {selectedProduct.product_type === 'resume_template' && (
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  Attached Resume Template
                </h4>

                {viewAttachedResumeTemplate ? (
                  <div className="p-3 rounded-[var(--radius-md)] border border-teal-200 bg-teal-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[var(--color-text-primary)]">{viewAttachedResumeTemplate.title}</p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)]">
                          Category: <strong>{viewAttachedResumeTemplate.category}</strong> • Plan: <strong className="capitalize">{viewAttachedResumeTemplate.minimum_plan || 'starter'}</strong>
                        </p>
                      </div>
                      {resumeFileSignedUrl ? (
                        <a 
                          href={resumeFileSignedUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold hover:bg-teal-100 transition-colors"
                        >
                          Preview Template <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">Attached</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--color-text-tertiary)] italic">No resume template linked to this product.</p>
                )}
              </div>
            )}

            {/* Case B: Attached Notes List */}
            {selectedProduct.product_type !== 'resume_template' && (
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  Attached Learning Resources ({viewAttachedNotes.length})
                </h4>

                {viewAttachedNotes.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-text-tertiary)] italic">No note files linked to this product.</p>
                ) : (
                  <div className="space-y-2">
                    {viewAttachedNotes.map((note) => (
                      <div key={note.id} className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                        <div>
                          <p className="font-bold text-[var(--color-text-primary)]">{note.title}</p>
                          <p className="text-[10px] text-[var(--color-text-tertiary)]">{note.category} • {note.file_size || 'PDF'}</p>
                        </div>
                        {viewSignedUrls[note.id] ? (
                          <a 
                            href={viewSignedUrls[note.id]} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                          >
                            View PDF <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-[var(--color-text-tertiary)]">Attached</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                <p className="font-bold text-red-950">Warning: This action will remove this listing from the digital store.</p>
                <p className="mt-1 leading-relaxed text-red-900">
                  Are you sure you want to delete <strong>"{selectedProduct.title}"</strong>?
                  Attached study notes will remain safely in the notes library for students with existing access.
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
