import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Plus, Sparkles } from 'lucide-react';
import type { Product } from '../../types';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { usePromotions } from '../../context/PromotionContext';
import { getPromoBadge } from '../../utils/promotionHelpers';
import { StarRating } from '../common/StarRating';
import { BottleSelectionModal } from './BottleSelectionModal';
import { resolveProductImage } from '../../utils/productUtils';
import { sanitizeText } from '../../utils/textUtils';

interface ProductCardProps {
  product: Product;
  defaultType?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, defaultType }) => {
  const navigate = useNavigate();
  const [showBottleModal, setShowBottleModal] = useState(false);
  // For Product details (ProductResponse)
  const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
  
  // The backend summary image (thumbnail) is the primary source of truth.
  let selectedImage = (product as any).thumbnail;
  
  // Local fallback (only triggers if we are passed a detailed Product without a thumbnail)
  if (!selectedImage && product.images && product.images.length > 0) {
    selectedImage = resolveProductImage(product.images, defaultType);
  }

  const image = selectedImage || '';

  // ── Preferred-size resolution ─────────────────────────────────────────────
  // For Attar products: prefer the 6ml variant.  For Perfume products: prefer 60ml.
  // Falls back safely to the existing defaultVariant / defaultVariantSize when
  // the preferred size does not exist for this particular product.
  const categoryType: string | undefined =
    (product as any).categoryType ?? product.category?.type;
  const isAttar = defaultType === 'attar' || categoryType === 'ATTAR' || categoryType === 'ATTARS';
  const isPerfume = defaultType === 'perfume' || categoryType === 'PERFUME' || categoryType === 'PERFUMES';
  const preferredSize = isAttar ? '6ml' : isPerfume ? '60ml' : null;

  // Determine which price and size to show on the card.
  // When using a ProductSummary (gallery), availableSizes + availablePrices are parallel arrays.
  const summaryAvailableSizes: string[] = (product as any).availableSizes ?? [];
  const summaryAvailablePrices: number[] = (product as any).availablePrices ?? [];

  let cardPrice: number;
  let cardSize: string;
  let cardVariantId: number | undefined;

  if (
    preferredSize &&
    summaryAvailableSizes.length > 0 &&
    summaryAvailablePrices.length === summaryAvailableSizes.length
  ) {
    const preferredIdx = summaryAvailableSizes.findIndex(s => s.toLowerCase() === preferredSize);
    if (preferredIdx !== -1) {
      // Preferred size exists — use its price and size label.
      cardPrice = summaryAvailablePrices[preferredIdx];
      cardSize = summaryAvailableSizes[preferredIdx];
      // The defaultVariantId refers to the cheapest; if the preferred size is different we
      // can only use what the summary exposes.  Cart will be added with the existing
      // defaultVariantId (unchanged), which means the card quick-add cart item still uses
      // the backend-selected default.  The size label and price are purely display changes.
      cardVariantId = defaultVariant?.id ?? (product as any).defaultVariantId;
    } else {
      // Preferred size not found — fall back to existing behavior.
      cardPrice = defaultVariant?.price ?? (product as any).minimumPrice ?? 0;
      cardSize = defaultVariant?.size ?? (product as any).defaultVariantSize ?? '';
      cardVariantId = defaultVariant?.id ?? (product as any).defaultVariantId;
    }
  } else if (defaultVariant) {
    // Detailed Product passed (has full variant list) — use firstVariant.
    cardPrice = defaultVariant.price;
    cardSize = defaultVariant.size;
    cardVariantId = defaultVariant.id;
  } else {
    cardPrice = (product as any).minimumPrice ?? 0;
    cardSize = (product as any).defaultVariantSize ?? '';
    cardVariantId = (product as any).defaultVariantId;
  }

  const price = cardPrice;
  const variantId = cardVariantId;
  const size = cardSize;
  const stock = defaultVariant?.stock !== undefined ? defaultVariant.stock : (product as any).totalStock;

  // Assuming `oldPrice` might be available if there's a discount
  const oldPrice = (product as any).oldPrice || null;

  const { addItem } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { activePromotions } = usePromotions();

  const inWishlist = variantId ? isInWishlist(variantId.toString()) : false;

  const applicablePromo = activePromotions.find(promo => {
    if (promo.promotionType === 'PRODUCT_DISCOUNT' && promo.configuration?.applicableProductIds?.includes(product.id)) return true;
    if (promo.promotionType === 'CATEGORY_DISCOUNT' && product.category?.id && promo.configuration?.applicableCategoryIds?.includes(product.category.id)) return true;
    if (promo.promotionType === 'FREE_PRODUCT') {
      const scope = promo.configuration?.buyScope;
      if (scope === 'SPECIFIC_PRODUCT' && promo.configuration?.buyVariantIds?.length) {
        return variantId && promo.configuration.buyVariantIds.includes(variantId);
      }
      if (scope === 'CATEGORY' && product.category?.id && promo.configuration?.buyCategoryId === product.category.id) return true;
      if (scope === 'ANY_PRODUCT' || (!scope && !promo.configuration?.buyVariantIds?.length && !promo.configuration?.buyCategoryId)) return true;
    }
    return false;
  });

  const badgeText = applicablePromo ? getPromoBadge(applicablePromo) : '';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!variantId) return;

    const isBakhoorCategory = product.category?.type === 'BAKHOOR' || (product as any).categoryType === 'BAKHOOR' || product.category?.name?.toLowerCase() === 'bakhoor';
    const isFragranceVariant = (isAttar || isPerfume) && !isBakhoorCategory;
    
    if (isFragranceVariant) {
      setShowBottleModal(true);
    } else {
      addToCartWithBottle(null);
    }
  };

  const addToCartWithBottle = (bottle: any | null) => {
    if (!variantId) return;
    
    const bottlePrice = bottle?.price || 0;
    const basePrice = price + bottlePrice;
    
    addItem({
      id: '',
      productId: product.id.toString(),
      variantId: variantId,
      quantity: 1,
      name: product.name,
      image: image,
      size: (defaultVariant?.colorName) || size,
      originalPrice: basePrice,
      finalPrice: basePrice,
      bottle: bottle ? { id: bottle.id, name: bottle.name, price: bottle.price } : undefined
    });
    setShowBottleModal(false);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    // For this phase, link Quick View to the product detail page, but in a real implementation this would open a modal.
    navigate(`/product/${product.id}${defaultType ? `?type=${defaultType}` : ''}`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!variantId) return;
    if (inWishlist) {
      removeFromWishlist(variantId.toString());
    } else {
      addToWishlist(variantId.toString());
    }
  };

  return (
    <>
      <BottleSelectionModal
        isOpen={showBottleModal}
        onClose={() => setShowBottleModal(false)}
        onConfirm={addToCartWithBottle}
        selectedSize={size}
        productType={isPerfume ? 'PERFUME' : isAttar ? 'ATTAR' : ''}
      />
      <div className="group flex flex-col bg-white rounded-[2px] border border-[#e4dcc8]/70 hover:border-accent/50 transition-all duration-500 shadow-[0_4px_20px_rgba(18,28,42,0.03)] hover:shadow-[0_16px_36px_rgba(18,28,42,0.08)] overflow-hidden h-full">
        {/* 1:1 Image Container */}
        <div className="product-media relative aspect-square bg-[#f5f1e8] overflow-hidden">
          {/* Promo / Featured Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            {badgeText && (
              <span className="bg-accent text-ink text-[9px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-[1px] shadow-sm">
                {badgeText}
              </span>
            )}
            {product.featured && !badgeText && (
              <span className="bg-ink text-accent text-[9px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-[1px] shadow-sm">
                Featured
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className="wishlist-btn-pop absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 w-7 h-7 sm:w-8.5 sm:h-8.5 bg-white/90 backdrop-blur-md rounded-full border border-[#e4dcc8]/70 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-white hover:border-accent shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
            aria-pressed={inWishlist}
            title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                inWishlist ? 'text-accent fill-accent' : 'text-ink/80 hover:text-accent'
              }`}
            />
          </button>

          {/* Out of stock overlay */}
          {stock === 0 && (
            <div className="absolute inset-0 z-[5] bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-ink/90 text-white text-[10px] font-label-md uppercase tracking-[0.22em] px-4 py-1.5 rounded-[1px]">
                Sold Out
              </span>
            </div>
          )}

          {/* Product Image */}
          <Link
            to={`/product/${product.id}${defaultType ? `?type=${defaultType}` : ''}`}
            className="block w-full h-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            {image ? (
              <img
                src={getImageUrl(image)}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-[1200ms] cubic-bezier(0.16,1,0.3,1) group-hover:scale-106"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0';
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#f8f5ec]">
                <Sparkles className="w-8 h-8 text-accent/70 mb-2 stroke-[1.5]" />
                <span className="text-[9.5px] tracking-[0.25em] uppercase text-ink/50 font-medium">Al Ahad</span>
              </div>
            )}
          </Link>

          {/* Desktop Floating Action Bar on Hover */}
          <div className="absolute bottom-0 left-0 w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-out hidden md:flex gap-2 z-10 bg-gradient-to-t from-black/25 via-transparent to-transparent">
            <button
              onClick={handleQuickView}
              className="flex-1 bg-white/95 backdrop-blur-sm py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink hover:bg-ink hover:text-accent transition-colors border border-ink/10 rounded-[1px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              Quick View
            </button>
            <button
              onClick={handleAddToCart}
              disabled={!variantId || stock === 0}
              className="flex-1 bg-ink py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-accent hover:text-ink transition-colors disabled:opacity-50 disabled:hover:bg-ink disabled:hover:text-white rounded-[1px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              Add to Cart
            </button>
          </div>

          {/* Mobile Quick Add Floating Button (accessible on touch devices) */}
          <div className="md:hidden absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-10">
            <button
              onClick={handleAddToCart}
              disabled={!variantId || stock === 0}
              className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full bg-ink text-white shadow-md flex items-center justify-center active:scale-95 disabled:opacity-40 hover:bg-accent hover:text-ink transition-colors cursor-pointer"
              aria-label="Add to cart"
              title="Add to cart"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Product Details */}
        <div className="p-3 sm:p-5 flex flex-col items-center text-center bg-white flex-1 justify-between">
          <div className="w-full">
            {/* Category Eyebrow */}
            <span className="text-[8px] sm:text-[9px] text-[#8a8171] uppercase tracking-[0.18em] sm:tracking-[0.22em] font-medium mb-1 sm:mb-1.5 block truncate">
              {(product.category?.type === 'BAKHOOR' || (product as any).categoryType === 'BAKHOOR' || product.category?.name?.toLowerCase() === 'bakhoor')
                ? 'Bakhoor'
                : defaultType === 'perfume' ? 'Perfumes' : defaultType === 'attar' ? 'Attars' : (product.category?.name || (product as any).categoryName || 'Fragrance')}
            </span>

            {/* Product Title */}
            <Link
              to={`/product/${product.id}${defaultType ? `?type=${defaultType}` : ''}`}
              className="rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent block"
            >
              <h3 className="font-headline-md text-[13px] xs:text-[13.5px] sm:text-base md:text-lg text-ink group-hover:text-accent transition-colors duration-300 line-clamp-2 font-normal tracking-wide leading-snug min-h-[2.25rem] sm:min-h-[2.6rem] flex items-center justify-center">
                {sanitizeText(product.name)}
              </h3>
            </Link>

            {/* Star Rating */}
            <div className="flex items-center justify-center gap-1 my-1 sm:my-2 min-h-[16px] sm:min-h-[18px]">
              {(() => {
                const rating = (product as any).averageRating ?? product.averageRating ?? 0;
                const count = (product as any).reviewCount ?? product.reviewCount ?? 0;
                if (count > 0) {
                  return (
                    <div className="flex items-center gap-1">
                      <StarRating rating={rating} size={11} />
                      <span className="text-[9.5px] sm:text-[10px] text-[#8a8171] font-mono">({count})</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Pricing & Size Tag */}
          <div className="pt-2 mt-auto border-t border-[#e4dcc8]/40 w-full flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              {oldPrice && (
                <span className="text-[11px] sm:text-xs text-[#8a8171] line-through font-light">
                  {formatPrice(Number(oldPrice))}
                </span>
              )}
              <span className="font-semibold text-ink text-xs xs:text-sm sm:text-base tracking-wide">
                {formatPrice(Number(price))}
              </span>
            </div>

            {((product as any).colorCount > 1) ? (
              <span className="text-[8px] sm:text-[9px] text-accent tracking-[0.14em] uppercase font-semibold bg-accent/10 px-1.5 py-0.5 rounded-[1px] border border-accent/25">
                +{(product as any).colorCount} Colours
              </span>
            ) : size ? (
              <span className="text-[8px] sm:text-[9px] text-[#8a8171] tracking-[0.16em] uppercase font-medium bg-[#f5f1e8] px-1.5 py-0.5 rounded-[1px] border border-[#e4dcc8]/60">
                {size}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
