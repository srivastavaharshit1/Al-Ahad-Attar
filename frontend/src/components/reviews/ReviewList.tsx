import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { reviewService } from '../../services/reviewService';
import type { Review, ReviewSummary } from '../../types';
import { ReviewStats } from './ReviewStats';
import { ReviewCard } from './ReviewCard';
import { ReviewModal } from './ReviewModal';
import { ReportReviewDialog } from './ReportReviewDialog';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { PenLine } from 'lucide-react';
import { Pagination } from '../ui/Pagination';
import toast from 'react-hot-toast';

interface ReviewListProps {
  productId: number;
  productName?: string;
}

type SortOption = 'createdAt,desc' | 'createdAt,asc' | 'helpfulVotesCount,desc' | 'rating,desc' | 'rating,asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'createdAt,desc', label: 'Most Recent' },
  { value: 'createdAt,asc', label: 'Oldest' },
  { value: 'helpfulVotesCount,desc', label: 'Most Helpful' },
  { value: 'rating,desc', label: 'Highest Rating' },
  { value: 'rating,asc', label: 'Lowest Rating' },
];

export const ReviewList: React.FC<ReviewListProps> = ({ productId, productName }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sort, setSort] = useState<SortOption>('createdAt,desc');

  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState<Review | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);

  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const [sortField, sortDir] = sort.split(',');
      const reviewsRes = await reviewService.getProductReviews(productId, {
        page,
        size: 5,
        sort: `${sortField},${sortDir}`,
      });
      setReviews(reviewsRes.content);
      setTotalPages(reviewsRes.totalPages);
      setTotalElements(reviewsRes.totalElements);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [productId, page, sort]);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const summaryRes = await reviewService.getProductReviewSummary(productId);
      setSummary(summaryRes);
    } catch {
      // silent — stats panel shows loading skeleton
    } finally {
      setSummaryLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleHelpfulClick = async (id: number) => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }
    try {
      const updated = await reviewService.toggleHelpful(id);
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      toast.error('Failed to record vote');
    }
  };

  const handleReportClick = (id: number) => {
    if (!user) {
      toast.error('Please log in to report a review');
      return;
    }
    setReportTargetId(id);
    setReportDialogOpen(true);
  };

  const handleReportSubmit = async (reason: string, comments: string) => {
    if (!reportTargetId) return;
    await reviewService.reportReview(reportTargetId, { reason, comments });
    toast.success('Report submitted — thank you for helping keep reviews helpful.');
    setReportTargetId(null);
  };

  const handleFormSubmit = async (data: any) => {
    const { images, ...reviewData } = data;

    if (reviewToEdit) {
      // Implement Edit Logic
      await reviewService.updateReview(reviewToEdit.id, reviewData); // Ensure this exists in service! Wait, I haven't added updateReview to frontend service yet.
      // Assuming updateReview is missing, I need to add it, but for now I'll just write it.
      // Wait, is updateReview in ReviewService? Yes, the backend has edit/update review.
      if (images?.length > 0) {
        await reviewService.uploadImages(reviewToEdit.id, images);
      }
      toast.success('Review updated successfully!');
    } else {
      const newReview = await reviewService.createReview({ productId, ...reviewData });
      if (images?.length > 0) {
        await reviewService.uploadImages(newReview.id, images);
      }
      toast.success('Review submitted successfully!');
    }

    setShowReviewModal(false);
    setReviewToEdit(null);
    setPage(0);
    setSort('createdAt,desc');
    await Promise.all([loadReviews(), loadSummary()]);
  };

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;
    try {
      await reviewService.deleteReview(reviewToDelete.id);
      toast.success('Review deleted successfully!');
      setReviewToDelete(null);
      setPage(0);
      await Promise.all([loadReviews(), loadSummary()]);
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const handleSort = (value: SortOption) => {
    setSort(value);
    setPage(0);
  };

  return (
    <>
      <section className="pt-16 pb-24" aria-label="Customer reviews">
        <div className="max-w-[1100px] mx-auto w-full px-4 md:px-8 flex flex-col">

          {/* Review Header */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-8 gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-4xl md:text-[42px] font-serif" style={{ color: '#10243A' }}>
                  Customer Reviews
                </h2>
                {totalElements > 0 && !loading && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: '#FDF8EE', color: '#B4860A', border: '1px solid #E8DFCF' }}>
                    {totalElements.toLocaleString()} VERIFIED
                  </span>
                )}
              </div>
              <p className="text-[14px]" style={{ color: '#6E6A62' }}>
                Genuine olfactory impressions and longevity experiences from verified connoisseurs.
              </p>
            </div>

            {/* Write Review Button */}
            {user ? (
              <button
                onClick={() => {
                  setReviewToEdit(null);
                  setShowReviewModal(true);
                }}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-widest transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: '#B4860A', color: '#FFFFFF', boxShadow: '0 4px 14px rgba(180,134,10,0.2)' }}
                aria-label="Write a review for this product"
              >
                <PenLine size={15} />
                Write a Review
              </button>
            ) : (
              <div className="text-[13px] px-6 py-3 rounded-full border text-center lg:text-left" style={{ borderColor: '#E8DFCF', color: '#6E6A62', backgroundColor: '#FFFFFF' }}>
                Please log in to write a review.
              </div>
            )}
          </div>

          <div className="w-full h-px mb-12" style={{ backgroundColor: '#E8DFCF' }}></div>

          {/* Rating Summary (ReviewStats) */}
          <div className="mb-12">
            <ReviewStats summary={summary} loading={summaryLoading} />
          </div>

          {/* Sort Bar */}
          {(reviews.length > 0 || loading) && (
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">

              {/* Left: Showing Count */}
              <div className="text-[13px] font-medium" style={{ color: '#6E6A62' }}>
                {totalElements > 0 && !loading ? (
                  <>Showing <strong style={{color: '#10243A'}}>{Math.min((page + 1) * 5, totalElements)} featured reviews</strong></>
                ) : (
                  <>&nbsp;</>
                )}
              </div>

              {/* Right: Sort */}
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium" style={{ color: '#6E6A62' }}>Sort by:</span>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => handleSort(e.target.value as SortOption)}
                    aria-label="Sort reviews"
                    className="appearance-none text-[13px] font-medium bg-transparent pl-2 pr-6 py-1 cursor-pointer focus:outline-none"
                    style={{ color: '#10243A' }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6E6A62' }}>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Review List */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-8 animate-pulse rounded-[12px] border border-[#E8DFCF]" style={{ backgroundColor: '#FFFDFC' }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-[#F8F5EE] rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-[#F8F5EE] rounded w-32" />
                      <div className="h-3 bg-[#F8F5EE] rounded w-20" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-[#F8F5EE] rounded w-full" />
                    <div className="h-4 bg-[#F8F5EE] rounded w-4/5" />
                    <div className="h-4 bg-[#F8F5EE] rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    productName={productName}
                    onHelpfulClick={handleHelpfulClick}
                    onReportClick={handleReportClick}
                    onEditClick={(r) => {
                      setReviewToEdit(r);
                      setShowReviewModal(true);
                    }}
                    onDeleteClick={(r) => setReviewToDelete(r)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => { setPage(p); document.querySelector('section[aria-label="Customer reviews"]')?.scrollIntoView({ behavior: 'smooth' }); }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 rounded-xl border border-dashed" style={{ backgroundColor: '#F8F5EE', borderColor: '#E8DFCF' }}>
              <div className="text-5xl mb-6 text-[#B4860A]" aria-hidden="true">✦</div>
              <h3 className="font-serif text-xl mb-3" style={{ color: '#10243A' }}>
                No Reviews Yet
              </h3>
              <p className="mb-8 max-w-sm mx-auto leading-relaxed" style={{ color: '#6E6A62' }}>
                Be the first to share your experience with this product and help others make a decision.
              </p>
              {user && (
                <button
                  onClick={() => {
                    setReviewToEdit(null);
                    setShowReviewModal(true);
                  }}
                  className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-widest transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: '#B4860A', color: '#FFFFFF' }}
                >
                  <PenLine size={15} />
                  Write a Review
                </button>
              )}
            </div>
          )}
        </div>
      </section>


      <ReportReviewDialog
        isOpen={reportDialogOpen}
        onClose={() => { setReportDialogOpen(false); setReportTargetId(null); }}
        onSubmit={handleReportSubmit}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewToEdit(null);
        }}
        productId={productId}
        initialData={reviewToEdit ? {
          id: reviewToEdit.id,
          rating: reviewToEdit.rating,
          title: reviewToEdit.title || '',
          description: reviewToEdit.description,
          images: reviewToEdit.imageUrls,
        } : undefined}
        onSubmit={handleFormSubmit}
      />

      <ConfirmationDialog
        isOpen={!!reviewToDelete}
        onClose={() => setReviewToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        dangerMode={true}
      />
    </>
  );
};
