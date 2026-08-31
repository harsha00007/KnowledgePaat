"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  name?: string;
  value: string; // Stored in YYYY-MM-DD format
  onChange: (e: { target: { name: string; value: string } }) => void;
  error?: string;
  maxDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  disabled?: boolean;
  placeholder?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Converts YYYY-MM-DD to DD-MM-YYYY for user-facing display
 */
export function formatToDisplayDate(isoDate: string): string {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }
  }
  return isoDate;
}

/**
 * Converts DD-MM-YYYY to YYYY-MM-DD for standard ISO database storage
 */
export function formatToIsoDate(displayDate: string): string {
  if (!displayDate || typeof displayDate !== 'string') return '';
  const parts = displayDate.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return displayDate;
}

export function DatePicker({
  label,
  name = 'dob',
  value = '',
  onChange,
  error,
  maxDate = new Date().toISOString().split('T')[0], // Default max is today
  minDate = '1920-01-01',
  disabled = false,
  placeholder = 'DD-MM-YYYY'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse initial selected date or default to a reasonable adult year (e.g. 2002)
  const parseInitialDate = () => {
    if (value && value.includes('-')) {
      const parts = value.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return { year: parts[0], month: parts[1] - 1, day: parts[2] };
      }
    }
    const today = new Date();
    return { year: today.getFullYear() - 20, month: today.getMonth(), day: 1 };
  };

  const initial = parseInitialDate();
  const [viewYear, setViewYear] = useState<number>(initial.year);
  const [viewMonth, setViewMonth] = useState<number>(initial.month);
  const [selectedIso, setSelectedIso] = useState<string>(value);

  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize when external value changes
  useEffect(() => {
    setSelectedIso(value);
    if (value && value.includes('-')) {
      const parts = value.split('-').map(Number);
      if (parts.length === 3) {
        setViewYear(parts[0]);
        setViewMonth(parts[1] - 1);
      }
    }
  }, [value]);

  // Click outside and Escape key handler
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Year choices generation (from 1920 to max year)
  const currentYear = new Date().getFullYear();
  const maxYear = maxDate ? parseInt(maxDate.split('-')[0], 10) : currentYear;
  const minYear = minDate ? parseInt(minDate.split('-')[0], 10) : 1920;
  
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      if (viewYear > minYear) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      }
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      if (viewYear < maxYear) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      }
    } else {
      const nextDate = new Date(viewYear, viewMonth + 1, 1);
      const maxLimit = maxDate ? new Date(maxDate) : new Date();
      if (nextDate <= maxLimit || (viewYear < maxYear)) {
        setViewMonth(viewMonth + 1);
      }
    }
  };

  // Days calculation for current view month
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 for Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Calendar cells
  const calendarCells = [];

  // Prev month padding days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      month: viewMonth - 1,
      year: viewMonth === 0 ? viewYear - 1 : viewYear,
      isCurrentMonth: false,
      disabled: true
    });
  }

  // Current month days
  const todayIso = new Date().toISOString().split('T')[0];
  for (let d = 1; d <= daysInMonth; d++) {
    const cellMonthStr = String(viewMonth + 1).padStart(2, '0');
    const cellDayStr = String(d).padStart(2, '0');
    const cellIso = `${viewYear}-${cellMonthStr}-${cellDayStr}`;

    const isFuture = maxDate ? cellIso > maxDate : cellIso > todayIso;
    const isTooOld = minDate ? cellIso < minDate : false;
    const isCellDisabled = isFuture || isTooOld;
    const isSelected = selectedIso === cellIso;

    calendarCells.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      iso: cellIso,
      isCurrentMonth: true,
      disabled: isCellDisabled,
      isSelected
    });
  }

  // Next month padding days to fill 35 or 42 grid slots
  const remainingSlots = 42 - calendarCells.length;
  if (remainingSlots > 0 && remainingSlots < 7) {
    for (let d = 1; d <= remainingSlots; d++) {
      calendarCells.push({
        day: d,
        month: viewMonth + 1,
        year: viewMonth === 11 ? viewYear + 1 : viewYear,
        isCurrentMonth: false,
        disabled: true
      });
    }
  }

  const handleSelectDate = (cell: any) => {
    if (cell.disabled || !cell.isCurrentMonth) return;
    setSelectedIso(cell.iso);
    onChange({ target: { name, value: cell.iso } });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIso('');
    onChange({ target: { name, value: '' } });
  };

  const handleDone = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5 font-display">
          {label}
        </label>
      )}

      {/* Input Display Box */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-[var(--radius-md)] border bg-white px-3 py-2 text-sm shadow-[var(--shadow-xs)] transition-all cursor-pointer select-none ${
          disabled 
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' 
            : error 
              ? 'border-red-400 ring-1 ring-red-400' 
              : isOpen 
                ? 'border-[var(--color-brand-500)] ring-2 ring-[var(--color-brand-500)]/20' 
                : 'border-[var(--color-border)] hover:border-slate-300'
        }`}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        role="button"
        aria-expanded={isOpen}
        aria-label={label || 'Date of birth'}
      >
        <span className={selectedIso ? 'text-[var(--color-text-primary)] font-medium font-mono text-xs sm:text-sm' : 'text-[var(--color-text-tertiary)] text-xs sm:text-sm'}>
          {selectedIso ? formatToDisplayDate(selectedIso) : placeholder}
        </span>

        <div className="flex items-center gap-1.5 text-slate-400">
          {selectedIso && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              title="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <CalendarIcon className="h-4 w-4 text-[var(--color-brand-600)]" />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-xs text-[var(--color-error)] font-medium">{error}</p>
      )}

      {/* Modern Popover Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Month & Year Selectors with Steppers */}
          <div className="flex items-center justify-between gap-1 mb-3.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5 flex-1">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#0B1D3A] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)] cursor-pointer font-display"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#0B1D3A] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)] cursor-pointer font-display"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Stepper buttons */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[11px] font-bold text-slate-400 font-display">
                {d}
              </span>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-slate-300 select-none"
                  >
                    {cell.day}
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={cell.disabled}
                  onClick={() => handleSelectDate(cell)}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    cell.isSelected
                      ? 'bg-[var(--color-brand-600)] text-white font-bold shadow-xs'
                      : cell.disabled
                        ? 'text-slate-300 cursor-not-allowed opacity-40'
                        : 'text-[#0B1D3A] hover:bg-blue-50 hover:text-[var(--color-brand-600)]'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer Actions: Clear & Done */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors font-display px-2 py-1 rounded-md hover:bg-slate-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleDone}
              className="text-xs font-bold text-white bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] transition-colors font-display px-4 py-1.5 rounded-lg shadow-xs"
            >
              Done
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
