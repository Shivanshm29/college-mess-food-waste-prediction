import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${title.toLowerCase().replace(/\s+/g, '-')}`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthClass} bg-white rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden my-8`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h2 id={titleId} className="text-lg font-semibold text-[#1E293B]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-md hover:bg-[#E2E8F0] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
