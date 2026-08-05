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
  UserCircle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Student = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  mobile_number: string | null;
  college_name: string | null;
  degree: string | null;
  branch: string | null;
  passing_year: string | null;
  skills: string[] | null;
  preferred_job_role: string | null;
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

  // Pagination (Simple client-side for MVP)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsFetching(true);
    try {
      // Query profiles and their subscriptions
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
    const roleMatch = (student.preferred_job_role || '').toLowerCase().includes(query);
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
      
      // Update local state
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
      
      // Update local state
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
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage registered students, view details, and control access.</p>
        </div>

        {/* SEARCH & FILTERS */}
        <Card className="p-4 border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4">
          <div className="relative w-full lg:flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Name, Email, College, or Role..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select 
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            
            <select 
              value={subFilter} onChange={e => { setSubFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Plan</option>
              <option value="Free">Free</option>
              <option value="Premium">Premium</option>
            </select>

            <select 
              value={yearFilter} onChange={e => { setYearFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Year</option>
              {uniqueYears.map(y => <option key={y as string} value={y as string}>{y}</option>)}
            </select>

            <Button variant="outline" onClick={resetFilters} className="text-sm h-full w-full">
              <Filter className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        {/* DATA TABLE */}
        <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
          {isFetching ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No students found."
                description="Try adjusting your search or filter criteria."
                action={<Button onClick={resetFilters}>Clear Filters</Button>}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">College & Year</th>
                      <th className="px-6 py-4">Plan</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Joined Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                              {student.full_name ? student.full_name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{student.full_name || 'N/A'}</p>
                              <p className="text-xs text-slate-500">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-900">{student.college_name || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{student.passing_year ? `Batch of ${student.passing_year}` : '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            getSubPlan(student) === 'Premium' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {getSubPlan(student)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            student.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(student.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => { setSelectedStudent(student); setIsViewModalOpen(true); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setSelectedStudent(student); setIsStatusModalOpen(true); }}
                            className={`p-1.5 rounded ${student.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} 
                            title={student.is_active ? "Deactivate" : "Activate"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setSelectedStudent(student); setIsDeleteModalOpen(true); }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedStudents.map(student => (
                  <div key={student.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {student.full_name ? student.full_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{student.full_name || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                      <div>
                        <p className="text-xs text-slate-400">College</p>
                        <p className="truncate">{student.college_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Plan</p>
                        <p>{getSubPlan(student)}</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                      <Button variant="outline" className="text-xs py-1 px-3" onClick={() => { setSelectedStudent(student); setIsViewModalOpen(true); }}>
                        View
                      </Button>
                      <Button variant="outline" className="text-xs py-1 px-3" onClick={() => { setSelectedStudent(student); setIsStatusModalOpen(true); }}>
                        {student.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="outline" className="text-xs py-1 px-3 border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setSelectedStudent(student); setIsDeleteModalOpen(true); }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="p-2" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="p-2" 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

      </div>

      {/* VIEW STUDENT MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Student Details" className="max-w-2xl">
        {selectedStudent && (
          <div className="space-y-6">
            
            {/* Header Area */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl border-2 border-white shadow-sm shrink-0">
                {selectedStudent.full_name ? selectedStudent.full_name.charAt(0).toUpperCase() : <UserCircle />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedStudent.full_name || 'N/A'}</h3>
                <p className="text-sm text-slate-500">{selectedStudent.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedStudent.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedStudent.is_active ? 'Active Account' : 'Inactive Account'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSubPlan(selectedStudent) === 'Premium' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                    {getSubPlan(selectedStudent)} Plan
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-slate-400 text-xs mb-1">Mobile Number</p>
                <p className="font-medium text-slate-900">{selectedStudent.mobile_number || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Registration Date</p>
                <p className="font-medium text-slate-900">{new Date(selectedStudent.created_at).toLocaleDateString()}</p>
              </div>
              
              <div className="sm:col-span-2 mt-2">
                <h4 className="font-semibold text-slate-900 mb-2 border-b border-slate-100 pb-1">Education</h4>
              </div>
              
              <div className="sm:col-span-2">
                <p className="text-slate-400 text-xs mb-1">College / University</p>
                <p className="font-medium text-slate-900">{selectedStudent.college_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Degree</p>
                <p className="font-medium text-slate-900">{selectedStudent.degree || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Branch / Major</p>
                <p className="font-medium text-slate-900">{selectedStudent.branch || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Passing Year</p>
                <p className="font-medium text-slate-900">{selectedStudent.passing_year || '-'}</p>
              </div>

              <div className="sm:col-span-2 mt-2">
                <h4 className="font-semibold text-slate-900 mb-2 border-b border-slate-100 pb-1">Career Preferences</h4>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1">Preferred Job Role</p>
                <p className="font-medium text-slate-900">{selectedStudent.preferred_job_role || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Preferred Location</p>
                <p className="font-medium text-slate-900">{selectedStudent.preferred_location || '-'}</p>
              </div>

              <div className="sm:col-span-2 mt-2">
                <p className="text-slate-400 text-xs mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {selectedStudent.skills && selectedStudent.skills.length > 0 ? (
                    selectedStudent.skills.map(skill => (
                      <span key={skill} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">No skills listed.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ACTIVATE / DEACTIVATE MODAL */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isProcessing && setIsStatusModalOpen(false)} title="Confirm Status Change">
        {selectedStudent && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to <strong>{selectedStudent.is_active ? 'deactivate' : 'activate'}</strong> the account for <span className="font-semibold text-slate-900">{selectedStudent.full_name || selectedStudent.email}</span>?
            </p>
            {selectedStudent.is_active && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-800">
                Deactivating this account will prevent the student from logging in and accessing platform features.
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
                className={selectedStudent.is_active ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
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
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isProcessing && setIsDeleteModalOpen(false)} title="Delete Student Account">
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-lg border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Warning: This action is permanent.</p>
                <p className="text-sm mt-1">
                  Are you sure you want to completely delete the account for <span className="font-semibold">{selectedStudent.full_name || selectedStudent.email}</span>? This will wipe their profile and all associated data.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button 
                variant="primary" 
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
