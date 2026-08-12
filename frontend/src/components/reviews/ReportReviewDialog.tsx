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
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      aria-hidden="false"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="modal-panel w-full max-w-md overflow-hidden border border-outline-variant/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full" style={{ background: 'var(--warning-bg)' }}>
              <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            </div>
            <h2 id="report-dialog-title" className="font-headline-md text-lg text-on-surface">
              Report Review
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {error && (
              <div className="bg-error/5 border border-error/20 text-error text-sm px-4 py-3 rounded-lg leading-relaxed" role="alert">
                {error}
              </div>
            )}

            {/* Reason */}
            <div>
              <label htmlFor="report-reason" className="field-label">
                Reason <span style={{ color: 'var(--error)' }} aria-hidden="true">*</span>
              </label>
              <select
                id="report-reason"
                ref={firstFocusRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="field-input"
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
              <label htmlFor="report-comments" className="field-label">
                Additional Comments{' '}
                <span className="text-on-surface-variant/70 normal-case tracking-normal font-normal">(Optional)</span>
              </label>
              <textarea
                id="report-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Provide any additional details…"
                className="field-input resize-none"
              />
              <p className="text-xs text-on-surface-variant/70 mt-1 text-right">{comments.length}/500</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/40 flex justify-end gap-3">
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
