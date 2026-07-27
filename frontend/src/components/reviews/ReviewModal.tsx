import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ReviewForm } from './ReviewForm';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  initialData?: {
    id: number;
    rating: number;
    title: string;
    description: string;
    images?: string[];
  };
  onSubmit: (data: { rating: number; title: string; description: string; images: File[] }) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  productId,
  initialData,
  onSubmit,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus management & keyboard trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
        );
        if (focusable.length === 0) return;
        
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 id="review-dialog-title" className="font-bold text-gray-900 text-xl">
            {initialData ? 'Edit Review' : 'Write a Review'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (ReviewForm) */}
        <div className="p-1">
          <ReviewForm
            productId={productId}
            onSubmit={onSubmit}
            onCancel={onClose}
            initialData={initialData}
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
};
