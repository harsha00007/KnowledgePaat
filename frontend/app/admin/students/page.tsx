"use client";

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { 
  Search, 
  Filter, 
  Eye, 
  Power, 
  Trash2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  GraduationCap,
  Calendar,
  Phone,
  MapPin,
  Briefcase
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Student = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  phone: string | null;
  college_name: string | null;
  degree: string | null;
  branch: string | null;
  passing_year: string | null;
  skills: string[] | null;
  preferred_role: string | null;
  preferred_location: string | null;
  created_at: string;
  subscriptions?: { plan: string, status: string }[];
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Modals
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          subscriptions(plan, status)
        `)
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setStudents(data as Student[]);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const getSubPlan = (student: Student) => {
    const subs = student.subscriptions || [];
    const activePremium = subs.find(s => s.plan === 'Premium' && s.status === 'Active');
    return activePremium ? 'Premium' : 'Free';
  };

  // Filtering Logic
  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (student.full_name || '').toLowerCase().includes(query);
    const emailMatch = (student.email || '').toLowerCase().includes(query);
    const collegeMatch = (student.college_name || '').toLowerCase().includes(query);
    const roleMatch = (student.preferred_role || '').toLowerCase().includes(query);
    const matchesSearch = query === '' || nameMatch || emailMatch || collegeMatch || roleMatch;

    const matchesStatus = statusFilter === '' || 
      (statusFilter === 'Active' ? student.is_active : !student.is_active);
      
    const matchesSub = subFilter === '' || getSubPlan(student) === subFilter;
    
    const matchesYear = yearFilter === '' || student.passing_year === yearFilter;

    return matchesSearch && matchesStatus && matchesSub && matchesYear;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setSubFilter('');
    setYearFilter('');
    setCurrentPage(1);
  };

  // Actions
  const handleToggleStatus = async () => {
    if (!selectedStudent) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !selectedStudent.is_active })
        .eq('id', selectedStudent.id);
        
      if (error) throw error;
      
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, is_active: !s.is_active } : s));
      setIsStatusModalOpen(false);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update student status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedStudent.id);
        
      if (error) throw error;
      
      setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting student:", err);
      alert("Failed to delete student.");
    } finally {
      setIsProcessing(false);
    }
  };

  const uniqueYears = Array.from(new Set(students.map(s => s.passing_year).filter(Boolean)));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Student Management</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            View student profiles, monitor subscription status, and manage platform access.
          </p>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Name, Email, College, or Preferred Role..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] bg-white rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-xs transition-colors"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            
            <select 
              value={subFilter} onChange={e => { setSubFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Plans</option>
              <option value="Free">Free</option>
              <option value="Premium">Premium</option>
            </select>

            <select 
              value={yearFilter} onChange={e => { setYearFilter(e.target.value); setCurrentPage(1); }}
              className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] bg-white text-[var(--color-text-primary)] shadow-xs"
            >
              <option value="">All Batches</option>
              {uniqueYears.map(y => <option key={y as string} value={y as string}>{y}</option>)}
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
          ) : filteredStudents.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No students found."
                description="Try adjusting your search query or clearing active filters."
                action={<Button variant="outline" size="sm" onClick={resetFilters}>Clear Filters</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">College & Batch</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Account Status</th>
                      <th className="px-5 py-3.5">Registered</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {paginatedStudents.map(student => {
                      const plan = getSubPlan(student);
                      return (
                        <tr key={student.id} className="hover:bg-[var(--color-bg-subtle)]/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] flex items-center justify-center font-bold text-xs shrink-0">
                                {student.full_name ? student.full_name.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-[var(--color-text-primary)] truncate">{student.full_name || 'Anonymous'}</p>
                                <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-[var(--color-text-primary)] truncate max-w-[200px]">{student.college_name || '-'}</p>
                            <p className="text-[11px] text-[var(--color-text-tertiary)]">{student.passing_year ? `Class of ${student.passing_year}` : '-'}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              plan === 'Premium' 
                                ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-200)]' 
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                              {plan}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              student.is_active 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {student.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[var(--color-text-tertiary)] font-medium">
                            {new Date(student.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                            <button 
                              onClick={() => { setSelectedStudent(student); setIsViewModalOpen(true); }}
                              className="p-1.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] rounded transition-colors" 
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setSelectedStudent(student); setIsStatusModalOpen(true); }}
                              className={`p-1.5 rounded transition-colors ${student.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} 
                              title={student.is_active ? "Deactivate" : "Activate"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setSelectedStudent(student); setIsDeleteModalOpen(true); }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-[var(--color-border)]">
                {paginatedStudents.map(student => (
                  <div key={student.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] flex items-center justify-center font-bold text-xs">
                          {student.full_name ? student.full_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-primary)]">{student.full_name || 'Anonymous'}</p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">{student.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${student.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-secondary)]">
                      <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">College</p>
                        <p className="truncate font-medium">{student.college_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase">Plan</p>
                        <p className="font-medium">{getSubPlan(student)}</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedStudent(student); setIsViewModalOpen(true); }}>
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5" onClick={() => { setSelectedStudent(student); setIsStatusModalOpen(true); }}>
                        {student.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 text-red-600 hover:bg-red-50" onClick={() => { setSelectedStudent(student); setIsDeleteModalOpen(true); }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              <div className="p-3.5 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-subtle)] text-xs">
                <span className="font-medium text-[var(--color-text-tertiary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                </span>
                <div className="flex gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="p-1.5 h-8 w-8 justify-center" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="p-1.5 h-8 w-8 justify-center" 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* VIEW STUDENT DETAILS MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Student Profile Details" className="max-w-2xl">
        {selectedStudent && (
          <div className="space-y-5">
            
            {/* Top User Snippet */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--color-border)]">
              <div className="h-12 w-12 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] flex items-center justify-center font-bold text-lg shrink-0">
                {selectedStudent.full_name ? selectedStudent.full_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">{selectedStudent.full_name || 'Anonymous Student'}</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">{selectedStudent.email}</p>
                <div className="flex gap-2 mt-1.5">
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${selectedStudent.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {selectedStudent.is_active ? 'Active Account' : 'Inactive Account'}
                  </span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${getSubPlan(selectedStudent) === 'Premium' ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-200)]' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {getSubPlan(selectedStudent)} Plan
                  </span>
                </div>
              </div>
            </div>

            {/* Grid Information */}
            <div className="space-y-4 text-xs">
              
              {/* Personal Info */}
              <div>
                <h4 className="text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Personal Information</h4>
                <div className="grid grid-cols-2 gap-3 bg-[var(--color-bg-subtle)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                  <div>
                    <span className="text-[var(--color-text-tertiary)]">Phone:</span>
                    <p className="font-semibold text-[var(--color-text-primary)]">{selectedStudent.phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)]">Joined Date:</span>
                    <p className="font-semibold text-[var(--color-text-primary)]">{new Date(selectedStudent.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div>
                <h4 className="text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Education Background</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--color-bg-subtle)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                  <div className="col-span-2">
                    <span className="text-[var(--color-text-tertiary)]">College / University:</span>
                    <p className="font-semibold text-[var(--color-text-primary)] truncate">{selectedStudent.college_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)]">Degree / Branch:</span>
                    <p className="font-semibold text-[var(--color-text-primary)]">{selectedStudent.degree ? `${selectedStudent.degree} ${selectedStudent.branch ? `(${selectedStudent.branch})` : ''}` : '-'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)]">Batch Year:</span>
                    <p className="font-semibold text-[var(--color-text-primary)]">{selectedStudent.passing_year || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Career Preferences */}
              <div>
                <h4 className="text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Career Preferences</h4>
                <div className="grid grid-cols-2 gap-3 bg-[var(--color-bg-subtle)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                  <div>
                    <span className="text-[var(--color-text-tertiary)]">Preferred Role:</span>
                    <p className="font-semibold text-[var(--color-text-primary)]">{selectedStudent.preferred_role || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)]">Preferred Location:</span>
                    <p className="font-semibold text-[var(--color-text-primary)]">{selectedStudent.preferred_location || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h4 className="text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudent.skills && selectedStudent.skills.length > 0 ? (
                    selectedStudent.skills.map(skill => (
                      <span key={skill} className="bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] text-[var(--color-brand-700)] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-[var(--color-text-tertiary)] italic">No skills added yet.</span>
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedStudent && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Are you sure you want to <strong>{selectedStudent.is_active ? 'deactivate' : 'activate'}</strong> the account for <span className="font-bold text-[var(--color-text-primary)]">{selectedStudent.full_name || selectedStudent.email}</span>?
            </p>
            {selectedStudent.is_active && (
              <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] p-3 text-amber-900 font-medium leading-relaxed">
                Deactivating this account will prevent the student from logging in and accessing platform features until reactivated.
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                size="sm"
                className={selectedStudent.is_active ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                onClick={handleToggleStatus} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : selectedStudent.is_active ? 'Yes, Deactivate' : 'Yes, Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isProcessing && setIsDeleteModalOpen(false)} title="Delete Student Record">
        {selectedStudent && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-red-50 text-red-900 p-4 rounded-[var(--radius-lg)] border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">Warning: This action cannot be undone.</p>
                <p className="mt-1 leading-relaxed text-red-900">
                  Are you sure you want to delete the student profile for <span className="font-bold">{selectedStudent.full_name || selectedStudent.email}</span>?
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
                {isProcessing ? 'Deleting...' : 'Yes, Delete Student'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}
