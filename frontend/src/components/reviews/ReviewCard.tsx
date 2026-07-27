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
      <div className="bg-white p-8 rounded-[20px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 group">
        {/* Header row */}
        <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg flex-shrink-0"
              aria-hidden="true"
            >
              {review.userName.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h4 className="font-semibold text-gray-900 font-headline-sm">{review.userName}</h4>
                {review.isVerifiedPurchase && (
                  <span
                    className="inline-flex items-center gap-1.5 text-yellow-600 bg-yellow-50/50 border border-yellow-200/50 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase"
                    title="This reviewer purchased the product"
                  >
                    <ShieldCheck size={12} strokeWidth={2.5} />
                    Verified Purchase
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={review.rating} size={13} />
                <span className="text-xs text-gray-300" aria-hidden="true">•</span>
                <time
                  className="text-xs text-gray-400"
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
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Review options"
              >
                <MoreVertical size={16} />
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEditClick?.(review);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteClick?.(review);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
            <h5 className="font-semibold text-gray-900 font-headline-sm leading-snug">{review.title}</h5>
          )}
          <p className="text-gray-600 text-[15px] font-body-md leading-relaxed whitespace-pre-wrap">
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
                className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group focus:outline-none focus:ring-2 focus:ring-primary/60"
              >
                <img
                  src={getImageUrl(url)}
                  alt={`Review photo ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Admin Reply */}
        {review.adminReply && (
          <div className="bg-primary/5 p-4 rounded-xl border-l-4 border-primary mb-4">
            <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">
              Response from Al Ahad Attars
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{review.adminReply}</p>
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-2 gap-4">
          <button
            onClick={() => onHelpfulClick?.(review.id)}
            aria-pressed={review.currentUserVotedHelpful}
            aria-label={
              review.currentUserVotedHelpful
                ? `Remove helpful vote. ${review.helpfulVotesCount} people found this helpful`
                : `Mark as helpful. ${review.helpfulVotesCount} people found this helpful`
            }
            className={`flex items-center gap-2 text-sm font-medium transition-colors rounded-lg px-3 py-1.5 -ml-3 ${
              review.currentUserVotedHelpful
                ? 'text-primary bg-primary/8 hover:bg-primary/15'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <ThumbsUp
              size={15}
              className={`transition-transform ${review.currentUserVotedHelpful ? 'fill-current scale-110' : ''}`}
            />
            <span>
              {review.currentUserVotedHelpful ? 'Helpful' : 'Helpful'}
              {review.helpfulVotesCount > 0 && (
                <span className="ml-1 text-xs text-gray-400">({review.helpfulVotesCount})</span>
              )}
            </span>
            {review.currentUserVotedHelpful && (
              <span className="text-xs text-primary/70">— click to undo</span>
            )}
          </button>

          <button
            onClick={() => onReportClick?.(review.id)}
            aria-label="Report this review"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors rounded-lg px-2 py-1.5"
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
