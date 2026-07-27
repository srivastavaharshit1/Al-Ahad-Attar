import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';

const REPORT_REASONS = [
  'Spam',
  'Offensive Content',
  'Fake Review',
  'Incorrect Information',
  'Other',
];

interface ReportReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, comments: string) => Promise<void>;
}

export const ReportReviewDialog: React.FC<ReportReviewDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const firstFocusRef = useRef<HTMLSelectElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus management & keyboard trap
  useEffect(() => {
    if (!isOpen) return;
    firstFocusRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'select, textarea, button:not([disabled])'
        );
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
  }, [isOpen, loading]);

  const handleClose = () => {
    if (loading) return;
    setReason('');
    setComments('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit(reason, comments);
      handleClose();
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="presentation"
      aria-hidden="false"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-full">
              <AlertTriangle size={18} className="text-orange-500" />
            </div>
            <h2 id="report-dialog-title" className="font-semibold text-gray-900 text-lg">
              Report Review
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg" role="alert">
                {error}
              </div>
            )}

            {/* Reason */}
            <div>
              <label
                htmlFor="report-reason"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Reason <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <select
                id="report-reason"
                ref={firstFocusRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                aria-required="true"
              >
                <option value="" disabled>Select a reason…</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Additional Comments */}
            <div>
              <label
                htmlFor="report-comments"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Additional Comments{' '}
                <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="report-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Provide any additional details…"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{comments.length}/500</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !reason}
              className="flex items-center gap-2 min-w-[130px]"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
