"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  // If no records or totalPages is 0, render gracefully
  if (totalRecords === 0) {
    return null;
  }

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  // Build a smart list of visible page numbers
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      role="navigation"
      aria-label="Catalogue pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-[#E8E5F5] font-ebook"
    >
      {/* Record Summary */}
      <div className="text-xs sm:text-sm font-medium text-[#4D4775]">
        Showing{' '}
        <strong className="text-[#18143F] font-bold">
          {startRecord}–{endRecord}
        </strong>{' '}
        of <strong className="text-[#18143F] font-bold">{totalRecords}</strong> books
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage || isLoading}
          className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#6F42DD] ${
            isFirstPage || isLoading
              ? 'opacity-40 cursor-not-allowed bg-white text-[#756F99] border border-[#E8E5F5]'
              : 'bg-white hover:bg-[#F8F7FF] text-[#18143F] border border-[#E8E5F5] hover:border-[#6F42DD]/40 hover:text-[#6F42DD] shadow-2xs active:scale-[0.98]'
          }`}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs text-[#756F99] select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const pageNum = Number(page);
            const isCurrent = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading || isCurrent}
                aria-current={isCurrent ? 'page' : undefined}
                className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#6F42DD] ${
                  isCurrent
                    ? 'bg-[#6F42DD] text-white shadow-sm shadow-[#6F42DD]/30 cursor-default'
                    : 'bg-white hover:bg-[#F8F7FF] text-[#18143F] border border-[#E8E5F5] hover:border-[#6F42DD]/40 hover:text-[#6F42DD] shadow-2xs'
                }`}
                aria-label={`Page ${pageNum}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage || isLoading}
          className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#6F42DD] ${
            isLastPage || isLoading
              ? 'opacity-40 cursor-not-allowed bg-white text-[#756F99] border border-[#E8E5F5]'
              : 'bg-white hover:bg-[#F8F7FF] text-[#18143F] border border-[#E8E5F5] hover:border-[#6F42DD]/40 hover:text-[#6F42DD] shadow-2xs active:scale-[0.98]'
          }`}
          aria-label="Go to next page"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
