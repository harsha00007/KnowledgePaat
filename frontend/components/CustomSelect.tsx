"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  disabled = false,
  size = 'sm'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Normalize options to { value, label } format
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        const currentIdx = normalizedOptions.findIndex((opt) => opt.value === value);
        setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < normalizedOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : normalizedOptions.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
          onChange(normalizedOptions[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const sizeClasses = size === 'sm' 
    ? 'px-3 py-1.5 text-xs' 
    : 'px-3.5 py-2 text-sm';

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1 font-display">
          {label}
        </label>
      )}

      {/* Select Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 rounded-[var(--radius-md)] border bg-white ${sizeClasses} font-medium text-[var(--color-text-primary)] shadow-xs transition-all text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] cursor-pointer ${
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
              ? 'border-[var(--color-brand-500)] ring-2 ring-[var(--color-brand-500)]/20'
              : 'border-[var(--color-border)] hover:border-slate-300'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${!selectedOption?.value && !value ? 'text-slate-600 font-medium' : 'font-semibold text-[#0B1D3A]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[var(--color-brand-600)]' : ''
          }`}
        />
      </button>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100 focus:outline-none no-scrollbar"
        >
          {normalizedOptions.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightedIndex;

            return (
              <li
                key={opt.value || `opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-[var(--color-brand-700)] font-bold'
                    : isHighlighted
                      ? 'bg-slate-100 text-[#0B1D3A]'
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[var(--color-brand-600)] shrink-0 ml-1.5" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
