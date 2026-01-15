'use client';

import { AlertTriangle, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onClose?: () => void;
}

export function UnsavedChangesModal({
  isOpen,
  onSaveDraft,
  onDiscard,
  onClose,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-blue-500 relative">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={32} className="text-white" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
          You have unsaved<br />changes
        </h2>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSaveDraft}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 transition-colors"
          >
            Save draft
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 py-3 rounded-2xl bg-reach-navy text-white font-semibold hover:bg-reach-navy/90 transition-colors"
          >
            Discard
          </button>
        </div>

        {/* Close Button (optional) */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={18} className="text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}

