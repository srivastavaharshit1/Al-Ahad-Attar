import React, { useState } from 'react';
import { ThumbsUp, ShieldCheck, Flag, ZoomIn, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { Review } from '../../types';
import { StarRating } from '../common/StarRating';
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

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, productName, onHelpfulClick, onReportClick, onEditClick, onDeleteClick }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  const isOwner = user?.id === review.userId;

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateStr));

  return (
    <>
      <div className="bg-[#FFFDFC] rounded-[12px] border border-[#E8DFCF] p-6 md:p-8 mb-5 transition-shadow hover:shadow-md" style={{ boxShadow: '0 2px 10px rgba(16,36,58,0.03)' }}>
        {/* Header row */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-medium text-[15px] flex-shrink-0"
              style={{ backgroundColor: '#F8F5EE', color: '#10243A' }}
              aria-hidden="true"
            >
              {review.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-[14px] font-medium" style={{ color: '#10243A' }}>{review.userName}</h4>
                {review.isVerifiedPurchase && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#F2F8F4', color: '#2F7A4A' }}
                    title="This reviewer purchased the product"
                  >
                    <ShieldCheck size={12} strokeWidth={2.5} />
                    Verified Buyer
                  </span>
                )}
              </div>
              {productName && (
                <p className="text-[12px] font-medium" style={{ color: '#6E6A62' }}>
                  Purchased {productName}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 mt-1 sm:mt-0 relative">
            <div className="flex items-center gap-2">
              <div className="flex items-center" style={{ color: '#B4860A' }}>
                <StarRating rating={review.rating} size={14} />
              </div>
              <time className="text-[12px] ml-2" style={{ color: '#6E6A62' }} dateTime={review.createdAt}>
                {formatDate(review.createdAt)}
              </time>
              {isOwner && (
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="ml-2 p-1 text-[#6E6A62] hover:text-[#10243A] rounded transition-colors"
                  aria-label="Review options"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical size={16} />
                </button>
              )}
            </div>

            {menuOpen && isOwner && (
              <div className="absolute right-0 top-8 mt-1 w-32 bg-[#FFFFFF] rounded-xl border border-[#E8DFCF] py-1 z-10 shadow-md">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEditClick?.(review);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#F8F5EE] flex items-center gap-2"
                  style={{ color: '#10243A' }}
                >
                  <Edit2 size={13} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteClick?.(review);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] hover:bg-[#FDF7F8] flex items-center gap-2"
                  style={{ color: '#c0392b' }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-5 sm:pl-[60px]">
          {review.title && (
            <h5 className="text-[14px] font-semibold mb-1.5" style={{ color: '#10243A' }}>{review.title}</h5>
          )}
          <p className="text-[13.5px] leading-[1.6] whitespace-pre-wrap" style={{ color: '#4A5568' }}>
            {review.description}
          </p>
        </div>

        {/* Images */}
        {review.imageUrls && review.imageUrls.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 sm:pl-[60px]">
            {review.imageUrls.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                aria-label={`View image ${idx + 1}`}
                className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-[#E8DFCF] group focus-visible:outline-none"
              >
                <img
                  src={getImageUrl(url)}
                  alt={`Review photo ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-[#10243A]/0 group-hover:bg-[#10243A]/20 transition-colors flex items-center justify-center">
                  <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Admin Reply */}
        {review.adminReply && (
          <div className="mt-4 p-4 rounded-xl border border-[#E8DFCF] sm:ml-[60px]" style={{ backgroundColor: '#F8F5EE' }}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-[#B4860A]" />
              <span className="font-semibold text-[13px]" style={{ color: '#10243A' }}>Response from Al Ahad Attars</span>
            </div>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#6E6A62' }}>
              {review.adminReply}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#E8DFCF]/50 sm:pl-[60px]">
          <button
            onClick={() => onHelpfulClick?.(review.id)}
            className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:text-[#10243A]"
            style={{ color: review.currentUserVotedHelpful ? '#10243A' : '#6E6A62' }}
          >
            <ThumbsUp size={13} className={review.currentUserVotedHelpful ? 'fill-current' : ''} />
            {review.helpfulVotesCount} {review.helpfulVotesCount === 1 ? 'person' : 'people'} found this helpful
          </button>

          <div className="flex items-center gap-3">
            {!isOwner && (
              <button onClick={() => onReportClick?.(review.id)} className="text-[12px] hover:text-[#10243A] flex items-center gap-1 transition-colors" style={{ color: '#6E6A62' }}>
                <Flag size={13} /> Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxIndex !== null && review.imageUrls && (
        <ImageLightbox
          images={review.imageUrls.map(url => getImageUrl(url))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
