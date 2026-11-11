import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, Eye, Package } from 'lucide-react';
import type { GiftSet } from '../../types/giftSet';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { sanitizeText } from '../../utils/textUtils';

interface GiftSetCardProps {
  giftSet: GiftSet;
  className?: string;
}

export const GiftSetCard: React.FC<GiftSetCardProps> = ({ giftSet, className = '' }) => {
  const navigate = useNavigate();
  const { addItem } = useCart();

  // Resolve best display image
  const primaryImg =
    giftSet.primaryImageUrl ||
    giftSet.images?.find(i => i.isPrimary)?.imageUrl ||
    giftSet.images?.[0]?.imageUrl ||
    giftSet.items?.[0]?.productImage ||
    '';

  // Backend authoritative price & availability
  const hasSale = giftSet.salePrice !== null && giftSet.salePrice !== undefined && Number(giftSet.salePrice) < Number(giftSet.price);
  const currentPrice = hasSale ? Number(giftSet.salePrice) : Number(giftSet.price);
  const originalPrice = hasSale ? Number(giftSet.price) : null;
  const isOutOfStock = !giftSet.inStock || giftSet.availableStock <= 0;
  const isLowStock = !isOutOfStock && giftSet.availableStock > 0 && giftSet.availableStock <= 5;

  const componentCount = giftSet.items?.length || 0;
  const detailUrl = `/gift-sets/${giftSet.slug}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    addItem({
      id: '',
      name: giftSet.name,
      originalPrice: Number(giftSet.price),
      finalPrice: currentPrice,
      quantity: 1,
      image: primaryImg,
      isGiftSet: true,
      giftSetId: giftSet.id,
      giftSetName: giftSet.name,
      includedItems: giftSet.items?.map(it => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        variantId: it.variantId,
        variantSize: it.variantSize,
        sku: it.sku,
        quantity: it.quantity,
      })),
    });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(detailUrl);
  };

  return (
    <div
      className={`group flex flex-col bg-white rounded-[2px] border border-[#e4dcc8]/70 hover:border-accent/50 transition-all duration-500 shadow-[0_4px_20px_rgba(18,28,42,0.03)] hover:shadow-[0_16px_36px_rgba(18,28,42,0.08)] overflow-hidden h-full ${className}`}
    >
      {/* 1:1 Image Container */}
      <div className="product-media relative aspect-square bg-[#f5f1e8] overflow-hidden">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
          <span className="bg-accent text-ink text-[9px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-[1px] shadow-sm">
            Curated Set
          </span>
          {hasSale && (
            <span className="bg-ink text-accent text-[9px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-[1px] shadow-sm">
              Special Price
            </span>
          )}
          {giftSet.featured && !hasSale && (
            <span className="bg-ink text-accent text-[9px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-[1px] shadow-sm">
              Featured
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-[5] bg-white/75 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-ink/90 text-white text-[10px] font-label-md uppercase tracking-[0.22em] px-4 py-1.5 rounded-[1px]">
              Sold Out
            </span>
          </div>
        )}

        {/* Set Image Link */}
        <Link
          to={detailUrl}
          className="block w-full h-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {primaryImg ? (
            <img
              src={getImageUrl(primaryImg)}
              alt={giftSet.name}
              className="w-full h-full object-cover transition-transform duration-[1200ms] cubic-bezier(0.16,1,0.3,1) group-hover:scale-106"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#f8f5ec]">
              <Package className="w-9 h-9 text-accent/70 mb-2 stroke-[1.5]" />
              <span className="text-[9.5px] tracking-[0.25em] uppercase text-ink/50 font-medium">Curated Gift Set</span>
            </div>
          )}
        </Link>

        {/* Desktop Floating Action Bar on Hover */}
        <div className="absolute bottom-0 left-0 w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-out hidden md:flex gap-2 z-10 bg-gradient-to-t from-black/25 via-transparent to-transparent">
          <button
            onClick={handleQuickView}
            className="flex-1 bg-white/95 backdrop-blur-sm py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink hover:bg-ink hover:text-accent transition-colors border border-ink/10 rounded-[1px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-accent" />
            <span>View Set</span>
          </button>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="flex-1 bg-ink py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-accent hover:text-ink transition-colors disabled:opacity-50 disabled:hover:bg-ink disabled:hover:text-white rounded-[1px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add to Bag</span>
          </button>
        </div>

        {/* Mobile Quick Add Floating Button */}
        <div className="md:hidden absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-10">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-ink text-white shadow-md flex items-center justify-center active:scale-95 disabled:opacity-40 hover:bg-accent hover:text-ink transition-colors cursor-pointer"
            aria-label="Add gift set to cart"
            title="Add gift set to cart"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Gift Set Details */}
      <div className="p-3 sm:p-5 flex flex-col items-center text-center bg-white flex-1 justify-between">
        <div className="w-full">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-1.5 text-[8.5px] sm:text-[9.5px] text-[#8a8171] uppercase tracking-[0.18em] sm:tracking-[0.22em] font-medium mb-1 sm:mb-1.5">
            <Sparkles className="w-3 h-3 text-accent" />
            <span>{componentCount > 0 ? `${componentCount} Included Fragrance${componentCount > 1 ? 's' : ''}` : 'Luxury Presentation'}</span>
          </div>

          {/* Title */}
          <Link
            to={detailUrl}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent block"
          >
            <h3 className="font-headline-md text-[13.5px] xs:text-[14px] sm:text-base md:text-lg text-ink group-hover:text-accent transition-colors duration-300 line-clamp-2 font-normal tracking-wide leading-snug min-h-[2.25rem] sm:min-h-[2.6rem] flex items-center justify-center">
              {sanitizeText(giftSet.name)}
            </h3>
          </Link>

          {/* Components summary preview */}
          {giftSet.items && giftSet.items.length > 0 && (
            <p className="text-[11px] text-[#8a8171] line-clamp-1 italic font-light mt-1 px-1">
              {giftSet.items.map(it => `${it.productName} (${it.variantSize})`).join(' • ')}
            </p>
          )}

          {/* Stock indicator badge if low stock */}
          {isLowStock && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-[1px] bg-amber-50 text-amber-800 border border-amber-200/60 text-[9px] uppercase tracking-wider font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Only {giftSet.availableStock} sets left
            </div>
          )}
        </div>

        {/* Pricing & Packaging pill */}
        <div className="pt-2.5 mt-auto border-t border-[#e4dcc8]/40 w-full flex items-center justify-center gap-2 flex-wrap">
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            {originalPrice && (
              <span className="text-[11px] sm:text-xs text-[#8a8171] line-through font-light">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="font-semibold text-ink text-xs xs:text-sm sm:text-base tracking-wide">
              {formatPrice(currentPrice)}
            </span>
          </div>

          <span className="text-[8px] sm:text-[9px] text-accent tracking-[0.14em] uppercase font-semibold bg-accent/10 px-2 py-0.5 rounded-[1px] border border-accent/25">
            Luxury Box
          </span>
        </div>
      </div>
    </div>
  );
};

