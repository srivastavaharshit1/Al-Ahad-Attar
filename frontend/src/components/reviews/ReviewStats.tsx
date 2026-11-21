import React from 'react';
import type { ReviewSummary } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

interface ReviewStatsProps {
  summary: ReviewSummary | null;
  loading?: boolean;
  productName?: string;
  onWriteReviewClick?: () => void;
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({
  summary,
  loading,
  productName,
  onWriteReviewClick,
}) => {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full animate-pulse">
        <div className="p-8 rounded-md border border-[#E4DCC8] bg-white h-64" />
        <div className="p-8 rounded-md border border-[#E4DCC8] bg-white h-64" />
      </div>
    );
  }

  const averageRating = summary?.averageRating || 0;
  const totalReviews = summary?.totalReviews || 0;
  const ratingDistribution = summary?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const displayedRating = totalReviews > 0 ? averageRating.toFixed(1) : '5.0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
      {/* Left Box: Rating Breakdown */}
      <div className="lg:col-span-5 bg-white border border-[#E4DCC8] rounded-md p-6 sm:p-8 flex flex-col justify-between shadow-3xs">
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-serif text-4xl sm:text-5xl font-semibold text-[#121C2A] tracking-tight leading-none">
              {displayedRating}
            </span>
          </div>

          {/* Gold Rating Stars */}
          <div className="text-[#C8A55E] text-base tracking-widest mb-2 select-none">
            ★★★★★
          </div>

          <p className="text-xs text-[#8C8270] font-light mb-6">
            {totalReviews > 0
              ? `Based on ${totalReviews} verified early connoisseur batches`
              : 'Based on verified early connoisseur batches'}
          </p>

          {/* Star Distribution Progress Bars */}
          <div className="space-y-2.5 w-full">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0;
              const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : (star === 5 ? 100 : 0);

              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-12 text-[#121C2A] font-medium shrink-0">
                    {star} Star
                  </span>
                  <div className="flex-1 h-2 bg-[#F0EBE1] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C8A55E] rounded-full transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[#8C8270] font-mono shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Box: Share Your Olfactory Impression */}
      <div className="lg:col-span-7 bg-white border border-[#E4DCC8] rounded-md p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-3xs">
        {/* Top Gold Ornament */}
        <div className="w-8 h-8 rounded-full bg-[#FAF7F0] border border-[#C8A55E]/40 text-[#C8A55E] flex items-center justify-center text-xs mb-3 shadow-3xs">
          ✦
        </div>

        <h3 className="font-serif text-lg sm:text-xl font-normal text-[#121C2A] mb-2">
          Share Your Olfactory Impression
        </h3>

        <p className="text-xs text-[#8C8270] font-light max-w-md leading-relaxed mb-6">
          Be among the esteemed patrons to document {productName || 'this fragrance'}&apos;s drydown, projection, and wear to guide fellow fragrance connoisseurs.
        </p>

        {user ? (
          <button
            type="button"
            onClick={onWriteReviewClick}
            className="border border-[#C8A55E] text-[#121C2A] hover:bg-[#FAF7F0] hover:text-[#C8A55E] px-6 py-2.5 rounded-xs text-xs font-semibold tracking-[0.15em] uppercase transition-all shadow-3xs cursor-pointer focus:outline-none"
          >
            WRITE A REVIEW
          </button>
        ) : (
          <Link
            to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
            className="border border-[#C8A55E] text-[#121C2A] hover:bg-[#FAF7F0] hover:text-[#C8A55E] px-6 py-2.5 rounded-xs text-xs font-semibold tracking-[0.15em] uppercase transition-all shadow-3xs cursor-pointer inline-block"
          >
            WRITE A REVIEW
          </Link>
        )}
      </div>
    </div>
  );
};
