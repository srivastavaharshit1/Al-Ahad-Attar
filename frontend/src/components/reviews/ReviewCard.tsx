import React, { useState } from 'react';
import { ThumbsUp, Flag, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { Review } from '../../types';
import { getImageUrl } from '../../utils/getImageUrl';
import { ImageLightbox } from './ImageLightbox';
import { useAuth } from '../../hooks/useAuth';

interface ReviewCardProps {
  review: Review;
  productName?: string;
  onHelpfulClick?: (id: number) => void;
  onReportClick?: (id: number) => void;
  onEditClick?: (review: Review) => void;
  onDeleteClick?: (review: Review) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  productName: _productName,
  onHelpfulClick,
  onReportClick,
  onEditClick,
  onDeleteClick,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  const isOwner = user?.id === review.userId;

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'AA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.min(5, Math.max(1, Math.round(rating)));
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  };

  return (
    <>
      <div className="bg-white rounded-md border border-[#E4DCC8] p-6 mb-4 shadow-3xs transition-all hover:border-[#C8A55E]/60">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
          <div className="flex items-center gap-3">
            {/* Initials Avatar */}
            <div
              className="w-9 h-9 rounded-full border border-[#E4DCC8] bg-[#FAF7F0] flex items-center justify-center font-serif text-xs font-semibold text-[#121C2A] shrink-0"
              aria-hidden="true"
            >
              {getInitials(review.userName)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-medium text-[#121C2A]">
                  {review.userName}
                </h4>
                {review.isVerifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                    ✓ Verified Connoisseur
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8C8270] mt-0.5">
                Ordered {(review as any).variantSize || 'Artisanal Flacon'} · {formatDate(review.createdAt)}
              </p>
            </div>
          </div>

          {/* Stars & Owner Menu */}
          <div className="flex items-center gap-2 self-start sm:self-auto relative">
            <span className="text-[#C8A55E] text-xs tracking-widest font-mono select-none">
              {renderStars(review.rating)}
            </span>

            {isOwner && (
              <div className="relative ml-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 text-[#8C8270] hover:text-[#121C2A] rounded transition-colors"
                  aria-label="Review options"
                >
                  <MoreVertical size={15} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-6 w-28 bg-white rounded-md border border-[#E4DCC8] py-1 z-10 shadow-md">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEditClick?.(review);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#FAF7F0] flex items-center gap-2 text-[#121C2A]"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDeleteClick?.(review);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Review Title */}
        {review.title && (
          <h4 className="font-serif text-sm sm:text-base font-semibold text-[#121C2A] mt-2 mb-1.5">
            &ldquo;{review.title}&rdquo;
          </h4>
        )}

        {/* Review Body */}
        <p className="text-xs sm:text-sm text-[#5A6578] font-light leading-relaxed whitespace-pre-wrap mb-4">
          {review.description}
        </p>

        {/* Optional Review Images */}
        {review.imageUrls && review.imageUrls.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto pb-2 mb-3">
            {review.imageUrls.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className="w-14 h-14 rounded-xs overflow-hidden border border-[#E4DCC8] hover:border-[#C8A55E] shrink-0"
              >
                <img
                  src={getImageUrl(imgUrl)}
                  alt="Customer review photo"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Bottom Actions: Helpful & Report */}
        <div className="flex items-center gap-4 pt-3 border-t border-[#E4DCC8]/50 text-xs text-[#8C8270]">
          <button
            type="button"
            onClick={() => onHelpfulClick?.(review.id)}
            className="inline-flex items-center gap-1.5 hover:text-[#121C2A] transition-colors focus:outline-none"
          >
            <ThumbsUp size={13} />
            <span>Helpful ({review.helpfulVotesCount || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => onReportClick?.(review.id)}
            className="inline-flex items-center gap-1.5 hover:text-red-600 transition-colors ml-auto focus:outline-none"
          >
            <Flag size={13} />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxIndex !== null && review.imageUrls && (
        <ImageLightbox
          images={review.imageUrls.map(getImageUrl)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
