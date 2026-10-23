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
      className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-5 pb-3 sm:pt-8 sm:pb-4 border-t border-[#E8E5F5] font-ebook"
    >
      {/* Record Summary */}
      <div className="text-xs sm:text-sm font-medium text-[#4D4775] text-center sm:text-left">
        Showing{' '}
        <strong className="text-[#18143F] font-bold">
          {startRecord}–{endRecord}
        </strong>{' '}
        of <strong className="text-[#18143F] font-bold">{totalRecords}</strong> publications
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage || isLoading}
          className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#6F42DD] touch-manipulation ${
            isFirstPage || isLoading
              ? 'opacity-40 cursor-not-allowed bg-white text-[#756F99] border border-[#E8E5F5]'
              : 'bg-white hover:bg-[#F8F7FF] text-[#18143F] border border-[#E8E5F5] hover:border-[#6F42DD]/40 hover:text-[#6F42DD] shadow-2xs active:scale-[0.98]'
          }`}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Compact Mobile Indicator (Phones & Narrow Tablets) */}
        <div className="flex sm:hidden items-center">
          <span className="px-3.5 py-2.5 bg-white border border-[#E8E5F5] rounded-xl text-xs font-bold text-[#18143F] shadow-2xs whitespace-nowrap min-h-[44px] flex items-center justify-center">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Full Page Number Buttons (Desktop & Larger Tablets) */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-11 h-11 flex items-center justify-center text-xs text-[#756F99] select-none"
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
                className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[#6F42DD] touch-manipulation ${
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
          className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#6F42DD] touch-manipulation ${
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
