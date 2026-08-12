import React, { useEffect, useState } from 'react';
import { reviewService } from '../../services/reviewService';
import type { Review } from '../../types';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Search, EyeOff, Eye, MessageSquare, Trash2, ShieldCheck, Loader2, Star } from 'lucide-react';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';

export const Reviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reply Modal State
  const [replyReviewId, setReplyReviewId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // Delete Confirmation State
  const [reviewToDelete, setReviewToDelete] = useState<number | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await reviewService.getAllReviews({ page, size: 10, search: searchTerm });
      setReviews(res.content);
      setTotalPages(res.totalPages);
    } catch (error) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadReviews();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [page, searchTerm]);

  const handleToggleVisibility = async (id: number, currentHidden: boolean) => {
    try {
      const updated = await reviewService.toggleVisibility(id, !currentHidden);
      setReviews(prev => prev.map(r => r.id === id ? updated : r));
      toast.success(`Review ${!currentHidden ? 'hidden' : 'visible'} successfully`);
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  const handleDelete = async () => {
    if (reviewToDelete !== null) {
      try {
        await reviewService.adminDeleteReview(reviewToDelete);
        toast.success('Review deleted');
        setReviewToDelete(null);
        loadReviews();
      } catch (error) {
        toast.error('Failed to delete review');
      }
    }
  };

  const submitReply = async () => {
    if (!replyReviewId) return;
    try {
      const updated = await reviewService.adminReply(replyReviewId, replyText);
      setReviews(prev => prev.map(r => r.id === replyReviewId ? updated : r));
      toast.success('Reply added');
      setReplyReviewId(null);
      setReplyText('');
    } catch (error) {
      toast.error('Failed to add reply');
    }
  };

  const openReplyModal = (review: Review) => {
    setReplyReviewId(review.id);
    setReplyText(review.adminReply || '');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Reviews Management</h1>
          <p className="text-on-surface-variant mt-1">Moderate customer reviews and respond to feedback.</p>
        </div>
      </div>

      <div className="table-shell shadow-[0_10px_30px_rgba(18,28,42,.04)]">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-DEFAULT text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">No reviews found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product ID</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(review => (
                  <tr key={review.id}>
                    <td className="align-top" data-label="Customer">
                      <div className="font-medium text-on-surface">{review.userName}</div>
                      <div className="text-sm text-on-surface-variant">ID: {review.userId}</div>
                      {review.isVerifiedPurchase && (
                        <span className="badge badge-success mt-1.5">
                          <ShieldCheck size={12} /> Verified
                        </span>
                      )}
                    </td>
                    <td className="align-top text-on-surface" data-label="Product ID">#{review.productId}</td>
                    <td className="align-top" data-label="Rating">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < review.rating ? 'text-accent fill-current' : 'text-outline-variant'}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="align-top max-w-xs" data-label="Review">
                      <div className="font-medium text-on-surface mb-1">{review.title}</div>
                      <div className="text-sm text-on-surface-variant line-clamp-2">{review.description}</div>
                      {review.adminReply && (
                        <div className="mt-2 text-xs bg-primary/10 text-primary p-2 rounded border-l-2 border-primary">
                          Replied: {review.adminReply}
                        </div>
                      )}
                    </td>
                    <td className="align-top" data-label="Status">
                      <span className={`badge ${review.isHidden ? 'badge-error' : 'badge-success'}`}>
                        {review.isHidden ? 'Hidden' : 'Visible'}
                      </span>
                    </td>
                    <td className="align-top text-right space-x-2 whitespace-nowrap" data-label="Actions">
                      <button
                        onClick={() => handleToggleVisibility(review.id, review.isHidden)}
                        className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                        title={review.isHidden ? "Unhide" : "Hide"}
                      >
                        {review.isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button
                        onClick={() => openReplyModal(review)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                        title="Reply"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button
                        onClick={() => setReviewToDelete(review.id)}
                        className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                        title="Delete Permanently"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-outline-variant flex justify-center">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Reply Modal */}
      <Modal
        isOpen={replyReviewId !== null}
        onClose={() => setReplyReviewId(null)}
        title="Reply to Review"
        maxWidth="md"
      >
        <textarea
          className="field-input text-sm mb-4"
          rows={4}
          placeholder="Write your official response..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setReplyReviewId(null)}>Cancel</Button>
          <Button onClick={submitReply}>Save Reply</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={reviewToDelete !== null}
        onClose={() => setReviewToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Review"
        description="Are you sure you want to permanently delete this review? This action cannot be undone."
        confirmText="Delete"
        dangerMode={true}
      />
    </div>
  );
};
