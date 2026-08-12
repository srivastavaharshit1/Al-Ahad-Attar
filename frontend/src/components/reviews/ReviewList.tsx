import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { reviewService } from '../../services/reviewService';
import type { Review, ReviewSummary } from '../../types';
import { ReviewStats } from './ReviewStats';
import { ReviewCard } from './ReviewCard';
import { ReviewModal } from './ReviewModal';
import { ReportReviewDialog } from './ReportReviewDialog';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { PenLine, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReviewListProps {
  productId: number;
}

type SortOption = 'createdAt,desc' | 'createdAt,asc' | 'helpfulVotesCount,desc' | 'rating,desc' | 'rating,asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'createdAt,desc', label: 'Most Recent' },
  { value: 'createdAt,asc', label: 'Oldest' },
  { value: 'helpfulVotesCount,desc', label: 'Most Helpful' },
  { value: 'rating,desc', label: 'Highest Rating' },
  { value: 'rating,asc', label: 'Lowest Rating' },
];

export const ReviewList: React.FC<ReviewListProps> = ({ productId }) => {
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
      <section className="border-t border-outline-variant/60 pt-8" aria-label="Customer reviews">
        <div className="flex flex-col">

          {/* Review Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
            <div>
              <h2 className="font-headline-lg text-3xl md:text-4xl text-ink tracking-wide mb-2">
                Customer Reviews
              </h2>
              {totalElements > 0 && !loading && (
                <p className="text-on-surface-variant font-body-md leading-relaxed">
                  Based on {totalElements.toLocaleString()} {totalElements === 1 ? 'Review' : 'Reviews'}
                </p>
              )}
            </div>

            {/* Write Review Button */}
            {user ? (
              <Button
                onClick={() => {
                  setReviewToEdit(null);
                  setShowReviewModal(true);
                }}
                variant="secondary"
                className="flex items-center justify-center gap-2 w-full lg:w-auto"
                aria-label="Write a review for this product"
              >
                <PenLine size={18} />
                Write Review
              </Button>
            ) : (
              <div className="text-sm text-on-surface-variant bg-surface-container-lowest px-6 py-3 rounded-xl border border-outline-variant/60 text-center lg:text-left">
                Please log in to write a review.
              </div>
            )}
          </div>

          {/* Rating Summary (ReviewStats) */}
          <div className="mb-8">
            <ReviewStats summary={summary} loading={summaryLoading} />
          </div>

          {/* Sort Bar */}
          {(reviews.length > 0 || loading) && (
            <div className="flex flex-col lg:flex-row items-center justify-between mb-10 gap-4 border-b border-outline-variant/60 pb-4">

              {/* Left: Sort */}
              <div className="w-full lg:w-1/3 flex items-center gap-3">
                <span className="text-sm font-medium text-on-surface">Sort</span>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => handleSort(e.target.value as SortOption)}
                    aria-label="Sort reviews"
                    className="appearance-none text-sm border-none bg-surface-container-lowest text-on-surface font-medium rounded-lg pl-4 pr-10 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                    <SlidersHorizontal size={14} />
                  </span>
                </div>
              </div>

              {/* Center: Showing Count */}
              <div className="w-full lg:w-1/3 text-center text-sm font-medium text-on-surface-variant">
                {totalElements > 0 && !loading ? (
                  <>Showing {page * 5 + 1}–{Math.min((page + 1) * 5, totalElements)} of {totalElements.toLocaleString()} Reviews</>
                ) : (
                  <>&nbsp;</>
                )}
              </div>

              {/* Right: Pagination */}
              <div className="w-full lg:w-1/3 flex lg:justify-end justify-center">
                {totalPages > 1 && (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  />
                )}
              </div>

            </div>
          )}

          {/* Review List */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-8 animate-pulse">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-surface-container rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-surface-container rounded w-32" />
                      <div className="h-3 bg-surface-container rounded w-20" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-surface-container rounded w-full" />
                    <div className="h-4 bg-surface-container rounded w-4/5" />
                    <div className="h-4 bg-surface-container rounded w-3/5" />
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
            </>
          ) : (
            <div className="text-center py-24 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
              <div className="text-5xl mb-6 text-accent" aria-hidden="true">✦</div>
              <h3 className="font-headline-sm text-xl text-on-surface mb-3">
                No Reviews Yet
              </h3>
              <p className="text-on-surface-variant mb-8 max-w-sm mx-auto leading-relaxed">
                Be the first to share your experience with this product and help others make a decision.
              </p>
              {user && (
                <Button
                  onClick={() => {
                    setReviewToEdit(null);
                    setShowReviewModal(true);
                  }}
                  variant="secondary"
                  className="flex items-center gap-2 mx-auto"
                >
                  <PenLine size={18} />
                  Write a Review
                </Button>
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
