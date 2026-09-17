import React from 'react';
import type { ReviewSummary } from '../../types';
import { StarRating } from '../common/StarRating';
import { ShieldCheck } from 'lucide-react';

interface ReviewStatsProps {
  summary: ReviewSummary | null;
  loading?: boolean;
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="w-full p-8 animate-pulse flex flex-col md:flex-row gap-8 rounded-[16px] border border-[#E8DFCF]" style={{ backgroundColor: '#FCFAF5' }}>
        <div className="w-48 h-32 bg-[#F8F5EE] rounded-[16px]" />
        <div className="flex-1 space-y-3">
          {[5, 4, 3, 2, 1].map((s) => (
            <div key={s} className="h-2.5 bg-[#F8F5EE] rounded-full w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary || summary.totalReviews === 0) {
    return (
      <div className="w-full p-12 text-center rounded-[16px] border border-[#E8DFCF]" style={{ backgroundColor: '#FCFAF5' }}>
        <div className="text-4xl font-serif text-[#6E6A62] mb-4">—</div>
        <div className="flex justify-center mb-3 text-[#B4860A]">
          <StarRating rating={0} size={24} />
        </div>
        <p className="text-[14px]" style={{ color: '#6E6A62' }}>No reviews yet</p>
      </div>
    );
  }

  const { averageRating, totalReviews, ratingDistribution } = summary;

  // Real calculation for recommendation percentage
  const recommendedPercent = totalReviews > 0 ? Math.round(((ratingDistribution[5] || 0) + (ratingDistribution[4] || 0)) / totalReviews * 100) : 0;

  return (
    <div className="w-full p-8 md:p-10 flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start rounded-[16px] border border-[#E8DFCF]" style={{ backgroundColor: '#FCFAF5', boxShadow: '0 4px 20px rgba(16,36,58,0.02)' }}>

      {/* Left: Overall Rating */}
      <div className="flex flex-col items-center md:items-start min-w-[200px]">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[48px] md:text-[56px] font-serif tracking-tight" style={{ color: '#10243A', lineHeight: 1 }}>
            {averageRating.toFixed(1)}
          </span>
          <span className="text-[18px] md:text-[20px] font-light" style={{ color: '#6E6A62' }}>/ 5.0</span>
        </div>
        <div className="flex justify-center md:justify-start mb-4 text-[#B4860A]">
          <StarRating rating={averageRating} size={18} />
        </div>
        <p className="text-[12px] mb-2 font-medium tracking-wide uppercase" style={{ color: '#6E6A62' }}>
          Based on {totalReviews.toLocaleString()} customer reviews
        </p>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-1" style={{ color: '#B4860A' }}>
          <ShieldCheck size={14} strokeWidth={2.5} />
          {recommendedPercent}% recommended rating
        </div>
      </div>

      {/* Center/Right: Distribution Bars */}
      <div className="flex-1 w-full space-y-3.5 max-w-[500px]" aria-label="Rating distribution">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingDistribution[star] || 0;
          const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

          return (
            <div key={star} className="flex items-center gap-4 group">
              {/* Label */}
              <div className="flex items-center gap-1 w-8 flex-shrink-0 justify-end" style={{ color: '#10243A' }}>
                <span className="text-[13px] font-medium">{star}</span>
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1", color: '#B4860A' }}>star</span>
              </div>

              {/* Progress bar track */}
              <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: '#F0EBE1' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${percentage}%`, backgroundColor: '#B4860A' }}
                />
              </div>

              {/* Count */}
              <span className="text-[12px] w-8 text-right font-medium" style={{ color: '#6E6A62' }}>
                {count > 0 ? count.toLocaleString() : '0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
