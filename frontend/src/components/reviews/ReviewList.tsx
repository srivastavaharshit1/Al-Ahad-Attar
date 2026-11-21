import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { reviewService } from '../../services/reviewService';
import type { Review, ReviewSummary } from '../../types';
import { ReviewStats } from './ReviewStats';
import { ReviewCard } from './ReviewCard';
import { ReviewModal } from './ReviewModal';
import { ReportReviewDialog } from './ReportReviewDialog';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { Pagination } from '../ui/Pagination';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface ReviewListProps {
  productId: number;
  productName?: string;
}

type SortOption =
  | 'createdAt,desc'
  | 'createdAt,asc'
  | 'helpfulVotesCount,desc'
  | 'rating,desc'
  | 'rating,asc';

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
      // silent
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
      await reviewService.updateReview(reviewToEdit.id, reviewData);
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
      <section id="customer-reviews" className="py-12" aria-label="Customer reviews">
        <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 md:px-8 flex flex-col">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-[#E4DCC8]/70 gap-4">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#121C2A] font-normal tracking-tight">
                Customer Reviews
              </h2>
              <p className="text-[10px] tracking-[0.18em] text-[#8C8270] uppercase font-medium mt-1">
                GENUINE OLFACTORY IMPRESSIONS AND LONGEVITY EXPERIENCES FROM VERIFIED CONNOISSEURS.
              </p>
            </div>

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setReviewToEdit(null);
                  setShowReviewModal(true);
                }}
                className="border border-[#C8A55E] text-[#121C2A] hover:bg-[#FAF7F0] hover:text-[#C8A55E] px-5 py-2.5 rounded-xs text-xs font-semibold tracking-wider uppercase transition-colors shrink-0 shadow-3xs cursor-pointer"
              >
                WRITE A REVIEW
              </button>
            ) : (
              <Link
                to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="border border-[#C8A55E] text-[#C8A55E] hover:bg-[#FAF7F0] px-5 py-2.5 rounded-xs text-xs font-semibold tracking-wider uppercase transition-colors shrink-0 shadow-3xs inline-block text-center"
              >
                PLEASE LOG IN TO WRITE A REVIEW
              </Link>
            )}
          </div>

          {/* Rating Summary (ReviewStats) */}
          <div className="mb-10">
            <ReviewStats
              summary={summary}
              loading={summaryLoading}
              productName={productName}
              onWriteReviewClick={() => {
                setReviewToEdit(null);
                setShowReviewModal(true);
              }}
            />
          </div>

          {/* Sort & Count Bar */}
          {(reviews.length > 0 || loading) && (
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 text-xs text-[#8C8270]">
              <div>
                {totalElements > 0 && !loading ? (
                  <span>
                    Showing <strong className="text-[#121C2A] font-medium">{Math.min((page + 1) * 5, totalElements)}</strong> of {totalElements} connoisseur reviews
                  </span>
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="uppercase tracking-wider text-[11px] font-medium">Sort by:</span>
                <select
                  value={sort}
                  onChange={(e) => handleSort(e.target.value as SortOption)}
                  aria-label="Sort reviews"
                  className="bg-white border border-[#E4DCC8] rounded-xs px-2.5 py-1 text-xs text-[#121C2A] focus:border-[#C8A55E] outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="p-6 rounded-md border border-[#E4DCC8] bg-white h-36" />
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
                <div className="mt-8 flex justify-center">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => {
                      setPage(p);
                      document
                        .getElementById('customer-reviews')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 rounded-md bg-white border border-[#E4DCC8]">
              <div className="text-3xl mb-3 text-[#C8A55E]">✦</div>
              <h3 className="font-serif text-lg text-[#121C2A] font-normal mb-2">
                No Reviews Documented Yet
              </h3>
              <p className="text-xs text-[#8C8270] max-w-sm mx-auto mb-5 leading-relaxed font-light">
                Be the first to share your olfactory impression and guide fellow fragrance connoisseurs.
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setReviewToEdit(null);
                    setShowReviewModal(true);
                  }}
                  className="border border-[#C8A55E] text-[#121C2A] hover:bg-[#FAF7F0] px-5 py-2 rounded-xs text-xs font-semibold tracking-wider uppercase transition-colors"
                >
                  Write a Review
                </button>
              ) : (
                <Link
                  to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                  className="border border-[#C8A55E] text-[#121C2A] hover:bg-[#FAF7F0] px-5 py-2 rounded-xs text-xs font-semibold tracking-wider uppercase transition-colors inline-block"
                >
                  Log In to Write a Review
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <ReportReviewDialog
        isOpen={reportDialogOpen}
        onClose={() => {
          setReportDialogOpen(false);
          setReportTargetId(null);
        }}
        onSubmit={handleReportSubmit}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewToEdit(null);
        }}
        productId={productId}
        initialData={
          reviewToEdit
            ? {
                id: reviewToEdit.id,
                rating: reviewToEdit.rating,
                title: reviewToEdit.title || '',
                description: reviewToEdit.description,
                images: reviewToEdit.imageUrls,
              }
            : undefined
        }
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
