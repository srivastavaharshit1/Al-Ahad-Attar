import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Package } from 'lucide-react';
import type { GiftSet } from '../../types/giftSet';
import { useWishlist } from '../../hooks/useWishlist';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { sanitizeText } from '../../utils/textUtils';

interface GiftSetCardProps {
  giftSet: GiftSet;
  className?: string;
  index?: number;
}

const getBadgeLabel = (giftSet: GiftSet, hasSale: boolean, savingsPercent: number): string => {
  if (hasSale && savingsPercent > 0) return `SAVE ${savingsPercent}%`;
  const name = (giftSet.name || '').toLowerCase();
  if (name.includes('bridal') || name.includes('wedding')) return 'BRIDAL EDITION';
  if (name.includes('sultan') || name.includes('master') || name.includes('treasury')) return 'MASTER COLLECTION';
  if (name.includes('archive') || name.includes('duet') || name.includes('heritage')) return 'HERITAGE ARCHIVE';
  if (giftSet.featured) return 'BESTSELLER';
  return 'BESTSELLER';
};

const getEyebrowLabel = (giftSet: GiftSet): string => {
  const name = (giftSet.name || '').toLowerCase();
  if (name.includes('sahra') || name.includes('trio')) return 'SIGNATURE TRIO';
  if (name.includes('oman') || name.includes('duet')) return 'HERITAGE ARCHIVE';
  if (name.includes('bridal') || name.includes('wedding') || name.includes('wardrobe')) return 'WEDDING & CELEBRATION';
  if (name.includes('sultan') || name.includes('majlis') || name.includes('treasury')) return 'ROYAL MAJLIS';
  if (name.includes('oud') || name.includes('discovery')) return 'ROYAL OUD HERITAGE';
  if (name.includes('floral') || name.includes('musk')) return 'FLORAL & MUSK ATELIER';
  if (giftSet.items && giftSet.items.length === 3) return 'SIGNATURE TRIO';
  if (giftSet.items && giftSet.items.length === 2) return 'HERITAGE ARCHIVE';
  return 'ARTISANAL PRESENTATION';
};

const getItemsSummaryText = (giftSet: GiftSet): string => {
  const name = (giftSet.name || '').toLowerCase();
  if (name.includes('oud') && name.includes('discovery')) {
    return '3 Pure Attars (Cambodian Oud, Hindi Oud, White Musk)...';
  }
  if (name.includes('floral') && name.includes('musk')) {
    return '3 Pure Attars (Taif Rose, Royal Amber, White Musk)...';
  }
  if (name.includes('heritage') && name.includes('trio')) {
    return '3 Pure Attars (Ambergris, Frankincense, Deep Musk)...';
  }
  if (name.includes('sahra')) {
    return '3 Pure Attars (Amber, Rose, White Musk)...';
  }
  if (name.includes('oman')) {
    return 'Royal Oud & Amber Flacons (12ml each) ...';
  }
  if (name.includes('bridal')) {
    return '4 Miniature Attars · Glass Applicators · Velvet Case';
  }
  if (name.includes('sultan')) {
    return '2 Brass Flacons · Incense Burner · Carved Keepsake';
  }
  if (giftSet.items && giftSet.items.length > 0) {
    if (giftSet.items.length === 3) {
      return `3 Pure Attars (${giftSet.items.map(it => it.productName.split(' ')[0]).join(', ')})...`;
    }
    if (giftSet.items.length === 2) {
      return `Royal Flacons (${giftSet.items.map(it => it.productName.split(' ')[0]).join(' & ')})...`;
    }
    if (giftSet.items.length >= 4) {
      return `${giftSet.items.length} Miniature Attars · Glass Applicators · Velvet Case`;
    }
    return `${giftSet.items.map(it => `${it.productName} (${it.variantSize})`).join(' · ')}`;
  }
  if (giftSet.packagingNotes) {
    return giftSet.packagingNotes;
  }
  if (giftSet.description) {
    return giftSet.description;
  }
  return 'Artisanal Flacons · Rigid Velvet-Lined Box · Certificate';
};

const getFallbackImage = (giftSet: GiftSet, index: number = 0): string => {
  const name = (giftSet.name || '').toLowerCase();
  if (name.includes('sahra') || name.includes('discovery') || (name.includes('oud') && !name.includes('sultan'))) {
    return 'https://images.unsplash.com/photo-1615160460366-2c9a41771b51?q=80&w=1000&auto=format&fit=crop';
  }
  if (name.includes('oman') || name.includes('duet') || name.includes('heritage')) {
    return 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1000&auto=format&fit=crop';
  }
  if (name.includes('bridal') || name.includes('floral') || name.includes('wardrobe')) {
    return 'https://images.unsplash.com/photo-1608528577891-eb055944f2e7?q=80&w=1000&auto=format&fit=crop';
  }
  if (name.includes('sultan') || name.includes('majlis') || name.includes('treasury')) {
    return 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1000&auto=format&fit=crop';
  }
  const defaults = [
    'https://images.unsplash.com/photo-1615160460366-2c9a41771b51?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1608528577891-eb055944f2e7?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1000&auto=format&fit=crop',
  ];
  return defaults[index % defaults.length];
};

export const GiftSetCard: React.FC<GiftSetCardProps> = ({ giftSet, className = '', index = 0 }) => {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [imageError, setImageError] = useState(false);

  // Authoritative price calculation
  const hasSale =
    giftSet.salePrice !== null &&
    giftSet.salePrice !== undefined &&
    Number(giftSet.salePrice) < Number(giftSet.price);
  const currentPrice = hasSale ? Number(giftSet.salePrice) : Number(giftSet.price);
  const originalPrice = hasSale ? Number(giftSet.price) : null;
  const savingsPercent = hasSale
    ? Math.round(((Number(giftSet.price) - currentPrice) / Number(giftSet.price)) * 100)
    : 0;

  const isOutOfStock = !giftSet.inStock || giftSet.availableStock <= 0;
  const detailUrl = `/gift-sets/${giftSet.slug}`;

  // Image source resolution:
  // If admin provided a dedicated gift set image, use it. Otherwise use authentic presentation box imagery.
  const hasAdminGiftSetImage = Boolean(
    giftSet.primaryImageUrl ||
    giftSet.images?.find(i => i.isPrimary)?.imageUrl ||
    (giftSet.images && giftSet.images.length > 0 && giftSet.images[0]?.imageUrl)
  );

  const rawImage = hasAdminGiftSetImage
    ? (giftSet.primaryImageUrl ||
       giftSet.images?.find(i => i.isPrimary)?.imageUrl ||
       giftSet.images?.[0]?.imageUrl || '')
    : getFallbackImage(giftSet, index);

  const displayImage = rawImage && !imageError ? rawImage : getFallbackImage(giftSet, index);

  // Wishlist integration
  const wishlistKey = giftSet.items?.[0]?.variantId?.toString() || `giftset-${giftSet.id}`;
  const inWishlist = isInWishlist(wishlistKey);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(wishlistKey);
    } else {
      addToWishlist(wishlistKey);
    }
  };

  const badgeLabel = getBadgeLabel(giftSet, hasSale, savingsPercent);
  const eyebrowLabel = getEyebrowLabel(giftSet);
  const itemsSummaryText = getItemsSummaryText(giftSet);

  return (
    <article
      className={`group flex flex-col bg-white rounded-2xl border border-[#E4DCC8]/70 hover:border-[#C8A55E] transition-all duration-300 shadow-[0_4px_20px_rgba(18,28,42,0.03)] hover:shadow-[0_12px_28px_rgba(18,28,42,0.08)] overflow-hidden h-full ${className}`}
    >
      {/* Top Image Section (Presentation Box Proportions) */}
      <div className="relative aspect-[4/3.8] bg-[#F7F4EE] overflow-hidden">
        {/* Floating Badge (Top Left) */}
        {badgeLabel && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <span className="bg-white/95 backdrop-blur-xs text-[#8C733E] border border-[#E4DCC8] text-[9.5px] font-semibold uppercase tracking-[0.16em] px-3 py-1 rounded-full shadow-2xs">
              {badgeLabel}
            </span>
          </div>
        )}

        {/* Wishlist Button (Top Right) */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className="wishlist-btn-pop absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs border border-[#E4DCC8]/70 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C8A55E]"
          aria-pressed={inWishlist}
          aria-label={inWishlist ? `Remove ${giftSet.name} from wishlist` : `Add ${giftSet.name} to wishlist`}
        >
          <Heart
            className={`w-4 h-4 transition-colors duration-300 ${
              inWishlist ? 'text-[#C8A55E] fill-[#C8A55E]' : 'text-[#121C2A]/70 hover:text-[#C8A55E]'
            }`}
          />
        </button>

        {/* Gift Set Image Link */}
        <Link
          to={detailUrl}
          className="block w-full h-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C8A55E]"
          aria-label={`View ${giftSet.name}`}
        >
          {displayImage ? (
            <img
              src={getImageUrl(displayImage)}
              alt={giftSet.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#F7F4EE] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EFE9DD] border border-[#E4DCC8] flex items-center justify-center mb-2 text-[#C8A55E]">
                <Package className="w-6 h-6 stroke-[1.4]" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#121C2A]/60 font-medium">
                Artisanal Gift Set
              </span>
            </div>
          )}
        </Link>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-[15] bg-[#FAF7F0]/85 backdrop-blur-[2px] flex items-center justify-center p-4">
            <span className="bg-[#121C2A] text-white text-[10px] font-medium uppercase tracking-[0.25em] px-4 py-2 rounded-full shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Card Content Section */}
      <div className="p-5 flex flex-col flex-1 justify-between bg-white">
        <div>
          {/* Eyebrow / Presentation Category */}
          <div className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.22em] text-[#C8A55E] mb-1.5 truncate">
            {eyebrowLabel}
          </div>

          {/* Title */}
          <Link to={detailUrl} className="block group/title mb-1.5">
            <h3 className="font-serif text-[17px] sm:text-[18px] text-[#121C2A] font-medium leading-snug line-clamp-2 min-h-[2.75rem] group-hover/title:text-[#C8A55E] transition-colors">
              {sanitizeText(giftSet.name)}
            </h3>
          </Link>

          {/* Subtitle / Included Items */}
          <p className="text-xs text-[#5A6578] font-light truncate leading-relaxed mb-3">
            {itemsSummaryText}
          </p>
        </div>

        {/* Price Row (Clean without dividing border) */}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-serif font-bold text-[#121C2A] text-lg sm:text-xl tracking-tight">
            {formatPrice(currentPrice)}
          </span>
          {originalPrice && (
            <span className="text-xs text-[#8C8270] line-through font-light">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
