import React, { useState } from 'react';
import { ThumbsUp, ShieldCheck, Flag, ZoomIn, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { Review } from '../../types';
import { StarRating } from '../common/StarRating';
import { getImageUrl } from '../../utils/getImageUrl';
import { ImageLightbox } from './ImageLightbox';
import { useAuth } from '../../hooks/useAuth';

interface ReviewCardProps {
  review: Review;
  onHelpfulClick?: (id: number) => void;
  onReportClick?: (id: number) => void;
  onEditClick?: (review: Review) => void;
  onDeleteClick?: (review: Review) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onHelpfulClick, onReportClick, onEditClick, onDeleteClick }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  
  const isOwner = user?.id === review.userId;

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateStr));

  return (
    <>
      <div className="card p-8">
        {/* Header row */}
        <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-11 h-11 bg-accent-soft rounded-full flex items-center justify-center text-accent-hover font-headline-md text-lg flex-shrink-0"
              aria-hidden="true"
            >
              {review.userName.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h4 className="font-headline-sm text-on-surface">{review.userName}</h4>
                {review.isVerifiedPurchase && (
                  <span
                    className="badge badge-gold"
                    title="This reviewer purchased the product"
                  >
                    <ShieldCheck size={12} strokeWidth={2.5} />
                    Verified Purchase
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={review.rating} size={13} />
                <span className="text-xs text-outline-variant" aria-hidden="true">•</span>
                <time
                  className="text-xs text-on-surface-variant"
                  dateTime={review.createdAt}
                >
                  {formatDate(review.createdAt)}
                </time>
              </div>
            </div>
          </div>
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Review options"
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-surface rounded-xl shadow-lg border border-outline-variant/50 py-1 z-10 animate-fade-up">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEditClick?.(review);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteClick?.(review);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-inset"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-5 space-y-2.5">
          {review.title && (
            <h5 className="font-headline-sm text-on-surface leading-snug">{review.title}</h5>
          )}
          <p className="text-on-surface-variant text-[15px] font-body-md leading-relaxed whitespace-pre-wrap">
            {review.description}
          </p>
        </div>

        {/* Images */}
        {review.imageUrls && review.imageUrls.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {review.imageUrls.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                aria-label={`View image ${idx + 1}`}
                className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-outline-variant group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <img
                  src={getImageUrl(url)}
                  alt={`Review photo ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors flex items-center justify-center">
                  <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Admin Reply */}
        {review.adminReply && (
          <div className="bg-accent-soft/40 p-4 rounded-xl border-l-4 border-accent mb-4">
            <p className="text-xs font-label-md text-accent-hover mb-1 uppercase tracking-[0.12em]">
              Response from Al Ahad Attars
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed">{review.adminReply}</p>
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between border-t border-outline-variant/60 pt-4 mt-2 gap-4">
          <button
            onClick={() => onHelpfulClick?.(review.id)}
            aria-pressed={review.currentUserVotedHelpful}
            aria-label={
              review.currentUserVotedHelpful
                ? `Remove helpful vote. ${review.helpfulVotesCount} people found this helpful`
                : `Mark as helpful. ${review.helpfulVotesCount} people found this helpful`
            }
            className={`flex items-center gap-2 text-sm font-medium transition-colors rounded-lg px-3 py-1.5 -ml-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              review.currentUserVotedHelpful
                ? 'text-accent-hover bg-accent-soft/60 hover:bg-accent-soft'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <ThumbsUp
              size={15}
              className={`transition-transform ${review.currentUserVotedHelpful ? 'fill-current scale-110' : ''}`}
            />
            <span>
              Helpful
              {review.helpfulVotesCount > 0 && (
                <span className="ml-1 text-xs text-on-surface-variant/80">({review.helpfulVotesCount})</span>
              )}
            </span>
            {review.currentUserVotedHelpful && (
              <span className="text-xs text-accent-hover/80">— click to undo</span>
            )}
          </button>

          <button
            onClick={() => onReportClick?.(review.id)}
            aria-label="Report this review"
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-error transition-colors rounded-lg px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
          >
            <Flag size={13} />
            Report
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={review.imageUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
