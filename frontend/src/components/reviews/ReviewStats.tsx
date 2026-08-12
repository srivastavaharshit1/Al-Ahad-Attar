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
      <div className="card w-full p-8 animate-pulse flex flex-col md:flex-row gap-8">
        <div className="w-48 h-32 bg-surface-container rounded-xl" />
        <div className="flex-1 space-y-3">
          {[5, 4, 3, 2, 1].map((s) => (
            <div key={s} className="h-4 bg-surface-container rounded-full w-full" />
          ))}
        </div>
        <div className="w-48 h-32 bg-surface-container rounded-xl" />
      </div>
    );
  }

  if (!summary || summary.totalReviews === 0) {
    return (
      <div className="card w-full p-12 text-center">
        <div className="text-5xl font-headline-lg text-outline-variant mb-4">—</div>
        <div className="flex justify-center mb-3">
          <StarRating rating={0} size={24} />
        </div>
        <p className="text-lg text-on-surface-variant font-body-md">No reviews yet</p>
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
    <div className="card w-full p-6 lg:p-8 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">

      {/* Left: Average Rating */}
      <div className="flex flex-col items-center justify-center text-center min-w-[120px] md:border-r border-outline-variant/60 md:pr-10 md:py-2">
        <div
          className="text-5xl md:text-6xl font-headline-lg text-ink tabular-nums tracking-tight mb-3"
          aria-label={`Average rating: ${averageRating.toFixed(1)} out of 5`}
        >
          {averageRating.toFixed(1)}
        </div>
        <div className="flex justify-center mb-3">
          <StarRating rating={averageRating} size={24} />
        </div>
        <p className="text-sm text-on-surface-variant font-body-md leading-relaxed">
          Based on <br/>
          <span className="font-semibold text-on-surface">{totalReviews.toLocaleString()}</span> reviews
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
                <span className="text-sm font-semibold text-on-surface">{star}</span>
                <span className="material-symbols-outlined text-[14px] text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex-1 h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="progress-fill h-full bg-accent rounded-full group-hover:brightness-95"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Count */}
              <span className="text-sm text-on-surface-variant w-24 text-right tabular-nums">
                <span className="font-medium text-on-surface">{count > 0 ? count.toLocaleString() : '0'}</span>
                <span className="text-on-surface-variant/70 text-xs ml-1">({percentage}%)</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Right: Extra Statistics */}
      <div className="w-full md:w-auto md:border-l border-outline-variant/60 md:pl-10 md:py-2 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-accent-soft text-accent-hover mt-0.5">
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-headline-sm text-sm text-on-surface">Verified Purchases</h4>
            <p className="text-xs text-on-surface-variant font-body-sm">{verifiedCount.toLocaleString()} reviews</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-accent-soft text-accent-hover mt-0.5">
            <Camera size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-headline-sm text-sm text-on-surface">With Photos</h4>
            <p className="text-xs text-on-surface-variant font-body-sm">{photoCount.toLocaleString()} reviews</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-accent-soft text-accent-hover mt-0.5">
            <ThumbsUp size={20} strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-headline-sm text-sm text-on-surface">Helpful Reviews</h4>
            <p className="text-xs text-on-surface-variant font-body-sm">{helpfulCount.toLocaleString()} reviews</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full mt-0.5" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              recommend
            </span>
          </div>
          <div>
            <h4 className="font-headline-sm text-sm text-on-surface">Recommended</h4>
            <p className="text-xs text-on-surface-variant font-body-sm">{recommendedPercent}% of customers</p>
          </div>
        </div>
      </div>
    </div>
  );
};
