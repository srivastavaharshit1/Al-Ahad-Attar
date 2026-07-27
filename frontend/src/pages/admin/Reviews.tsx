import React, { useEffect, useState } from 'react';
import { reviewService } from '../../services/reviewService';
import type { Review } from '../../types';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Search, EyeOff, Eye, MessageSquare, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
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
          <h1 className="text-3xl font-bold text-gray-900">Reviews Management</h1>
          <p className="text-gray-500 mt-1">Moderate customer reviews and respond to feedback.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search reviews..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No reviews found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Product ID</th>
                  <th className="p-4 font-medium">Rating</th>
                  <th className="p-4 font-medium">Review</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map(review => (
                  <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 align-top">
                      <div className="font-medium text-gray-900">{review.userName}</div>
                      <div className="text-sm text-gray-500">ID: {review.userId}</div>
                      {review.isVerifiedPurchase && (
                        <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
                          <ShieldCheck size={12} /> Verified
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top text-gray-900">#{review.productId}</td>
                    <td className="p-4 align-top">
                      <div className="flex text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`material-symbols-outlined text-[16px] ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 align-top max-w-xs">
                      <div className="font-medium text-gray-900 mb-1">{review.title}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{review.description}</div>
                      {review.adminReply && (
                        <div className="mt-2 text-xs bg-primary/10 text-primary p-2 rounded border-l-2 border-primary">
                          Replied: {review.adminReply}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        review.isHidden ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {review.isHidden ? 'Hidden' : 'Visible'}
                      </span>
                    </td>
                    <td className="p-4 align-top text-right space-x-2 whitespace-nowrap">
                      <button 
                        onClick={() => handleToggleVisibility(review.id, review.isHidden)}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title={review.isHidden ? "Unhide" : "Hide"}
                      >
                        {review.isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button 
                        onClick={() => openReplyModal(review)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Reply"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button 
                        onClick={() => setReviewToDelete(review.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="p-4 border-t border-gray-100 flex justify-center">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyReviewId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reply to Review</h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-primary focus:border-primary mb-4"
              rows={4}
              placeholder="Write your official response..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setReplyReviewId(null)}>Cancel</Button>
              <Button onClick={submitReply}>Save Reply</Button>
            </div>
          </div>
        </div>
      )}

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
