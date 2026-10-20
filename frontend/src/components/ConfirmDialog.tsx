import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-full ${
              isDestructive ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#EFF6FF] text-[#2563EB]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-sm text-[#475569] leading-relaxed pt-1">
            {message}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[#475569] bg-white border border-[#CBD5E1] rounded-md hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isDestructive
                ? 'bg-[#B91C1C] hover:bg-[#991B1B] focus-visible:ring-[#B91C1C]'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] focus-visible:ring-[#2563EB]'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
