import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className = 'max-w-lg' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`
          relative z-[101] w-full
          rounded-[var(--radius-xl)] bg-[var(--color-surface)]
          border border-[var(--color-border)]
          shadow-[var(--shadow-xl)]
          overflow-y-auto max-h-[90vh]
          animate-in fade-in slide-in-from-bottom-4 duration-200
          ${className}
        `}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <h2
              id="modal-title"
              className="text-base font-semibold text-[var(--color-text-primary)]"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)] transition-colors focus-ring"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}