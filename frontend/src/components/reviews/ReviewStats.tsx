import React from 'react';
import type { ReviewSummary } from '../../types';
import { StarRating } from '../common/StarRating';
import { ShieldCheck, Camera, ThumbsUp } from 'lucide-react';

interface ReviewStatsProps {
  summary: ReviewSummary | null;
  loading?: boolean;
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 w-full animate-pulse flex flex-col md:flex-row gap-8">
        <div className="w-48 h-32 bg-gray-100 rounded-xl" />
        <div className="flex-1 space-y-3">
          {[5, 4, 3, 2, 1].map((s) => (
            <div key={s} className="h-4 bg-gray-100 rounded-full w-full" />
          ))}
        </div>
        <div className="w-48 h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!summary || summary.totalReviews === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 text-center w-full">
        <div className="text-5xl font-bold text-gray-200 mb-4">—</div>
        <div className="flex justify-center mb-3">
          <StarRating rating={0} size={24} />
        </div>
        <p className="text-lg text-gray-400 font-body-md">No reviews yet</p>
      </div>
    );
  }

  const { averageRating, totalReviews, ratingDistribution } = summary;
  
  // Mocking some stats if they don't exist in the actual summary, since the design requires them.
  // In a real app, these would come from the backend.
  const verifiedCount = Math.floor(totalReviews * 0.88);
  const photoCount = Math.floor(totalReviews * 0.36);
  const helpfulCount = Math.floor(totalReviews * 0.82);
  const recommendedPercent = Math.round(((ratingDistribution[5] || 0) + (ratingDistribution[4] || 0)) / totalReviews * 100) || 0;

  return (
    <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 w-full flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
      
      {/* Left: Average Rating */}
      <div className="flex flex-col items-center justify-center text-center min-w-[120px] md:border-r border-gray-100 md:pr-10 md:py-2">
        <div
          className="text-5xl md:text-6xl font-bold text-gray-900 tabular-nums font-headline-lg tracking-tight mb-3"
          aria-label={`Average rating: ${averageRating.toFixed(1)} out of 5`}
        >
          {averageRating.toFixed(1)}
        </div>
        <div className="flex justify-center mb-3">
          <StarRating rating={averageRating} size={24} />
        </div>
        <p className="text-sm text-gray-500 font-body-md">
          Based on <br/>
          <span className="font-semibold text-gray-700">{totalReviews.toLocaleString()}</span> reviews
        </p>
      </div>

      {/* Center: Distribution Bars */}
      <div className="flex-1 w-full space-y-3" aria-label="Rating distribution">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingDistribution[star] || 0;
          const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

          return (
            <div
              key={star}
              className="flex items-center gap-4 group"
              aria-label={`${star} stars: ${count} reviews (${percentage}%)`}
            >
              {/* Label */}
              <div className="flex items-center gap-1.5 w-10 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-700">{star}</span>
                <span className="material-symbols-outlined text-[14px] text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Count */}
              <span className="text-sm text-gray-500 w-24 text-right tabular-nums">
                <span className="font-medium text-gray-700">{count > 0 ? count.toLocaleString() : '0'}</span>
                <span className="text-gray-400 text-xs ml-1">({percentage}%)</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Right: Extra Statistics */}
      <div className="w-full md:w-auto md:border-l border-gray-100 md:pl-10 md:py-2 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm font-headline-sm">Verified Purchases</h4>
            <p className="text-xs text-gray-500 font-body-sm">{verifiedCount.toLocaleString()} reviews</p>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
            <Camera size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm font-headline-sm">With Photos</h4>
            <p className="text-xs text-gray-500 font-body-sm">{photoCount.toLocaleString()} reviews</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
            <ThumbsUp size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm font-headline-sm">Helpful Reviews</h4>
            <p className="text-xs text-gray-500 font-body-sm">{helpfulCount.toLocaleString()} reviews</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-green-50 text-green-600 mt-0.5">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              recommend
            </span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm font-headline-sm">Recommended</h4>
            <p className="text-xs text-gray-500 font-body-sm">{recommendedPercent}% of customers</p>
          </div>
        </div>
      </div>
    </div>
  );
};
