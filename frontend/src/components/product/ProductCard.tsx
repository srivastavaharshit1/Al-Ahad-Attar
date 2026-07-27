import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../../types';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { usePromotions } from '../../context/PromotionContext';
import { getPromoBadge } from '../../utils/promotionHelpers';
import { StarRating } from '../common/StarRating';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  // For Product details (ProductResponse)
  const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
  
  // For Collection view (ProductSummaryResponse)
  const primaryImage = product.images?.find(img => img.isPrimary)?.imageUrl || product.images?.[0]?.imageUrl;
  const image = primaryImage || (product as any).thumbnail || '';
  const price = defaultVariant?.price || (product as any).minimumPrice || 0;
  const variantId = defaultVariant?.id || (product as any).defaultVariantId;
  const size = defaultVariant?.size || (product as any).defaultVariantSize || '';
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
      if (promo.configuration?.buyProductId && promo.configuration.buyProductId === product.id) return true;
      if (product.category?.id && promo.configuration?.buyCategoryId === product.category.id) return true;
      if (!promo.configuration?.buyProductId && !promo.configuration?.buyCategoryId) return true;
    }
    return false;
  });

  const badgeText = applicablePromo ? getPromoBadge(applicablePromo) : '';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!variantId) return;
    addItem({
      id: '',
      productId: product.id.toString(),
      variantId: variantId,
      quantity: 1,
      name: product.name,
      image: image,
      size: size,
    });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    // For this phase, link Quick View to the product detail page, but in a real implementation this would open a modal.
    navigate(`/product/${product.id}`);
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
    <div className="group flex flex-col bg-white overflow-hidden transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)]">
      {/* 1:1 Image Container */}
      <div className="relative aspect-square overflow-hidden bg-[#faf9f8]">
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {badgeText && (
            <span className="bg-[#d4af37] text-white text-[9px] font-label-md uppercase tracking-[0.2em] px-3 py-1.5 shadow-sm">
              {badgeText}
            </span>
          )}
          {product.featured && !badgeText && (
            <span className="bg-[#121c2a] text-[#d4af37] text-[9px] font-label-md uppercase tracking-[0.2em] px-3 py-1.5 shadow-sm">
              Featured
            </span>
          )}
        </div>

        {/* Wishlist Icon */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center transition-all duration-300 hover:bg-[#d4af37] hover:text-white shadow-sm"
          title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ 
              fontVariationSettings: inWishlist ? "'FILL' 1" : "'FILL' 0",
              color: inWishlist ? (inWishlist ? '#d4af37' : 'inherit') : 'inherit'
            }}
          >
            favorite
          </span>
        </button>

        {/* Out of stock overlay */}
        {stock === 0 && (
          <div className="absolute inset-0 z-[5] bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-black/90 text-white text-[10px] font-label-md uppercase tracking-[0.2em] px-5 py-2">
              Sold Out
            </span>
          </div>
        )}

        <Link to={`/product/${product.id}`} className="block w-full h-full">
          {image ? (
            <img
              src={getImageUrl(image)}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant bg-[#faf9f8]">
              <span className="material-symbols-outlined text-4xl opacity-20">inventory_2</span>
            </div>
          )}
        </Link>

        {/* Floating Actions on Hover */}
        <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex gap-2 z-10">
          <button
            onClick={handleQuickView}
            className="flex-1 bg-white/95 backdrop-blur py-3 text-[10px] font-label-md uppercase tracking-[0.15em] text-[#121c2a] hover:bg-[#121c2a] hover:text-[#d4af37] transition-colors border border-[#121c2a]/10"
          >
            Quick View
          </button>
          <button
            onClick={handleAddToCart}
            disabled={!variantId || stock === 0}
            className="flex-1 bg-[#121c2a] py-3 text-[10px] font-label-md uppercase tracking-[0.15em] text-white hover:bg-[#d4af37] transition-colors disabled:opacity-50 disabled:hover:bg-[#121c2a]"
          >
            Add to Cart
          </button>
        </div>
      </div>

      {/* Elegant Details */}
      <div className="p-6 flex flex-col items-center text-center bg-white">
        <span className="text-[9px] font-body-md text-on-surface-variant uppercase tracking-[0.25em] mb-2">
          {product.category?.name || 'Fragrance'}
        </span>
        
        <Link to={`/product/${product.id}`} className="mb-2">
          <h3 className="font-headline-md text-lg text-[#121c2a] group-hover:text-[#d4af37] transition-colors line-clamp-1 font-normal tracking-wide">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 mb-4">
          {(() => {
            const rating = (product as any).averageRating ?? product.averageRating ?? 0;
            const count = (product as any).reviewCount ?? product.reviewCount ?? 0;
            if (count > 0) {
              return (
                <div className="flex items-center gap-1">
                  <StarRating rating={rating} size={12} />
                  <span className="text-[10px] text-on-surface-variant ml-1">({count})</span>
                </div>
              );
            }
            return <div className="h-4"></div>; // Placeholder to maintain spacing
          })()}
        </div>

        <div className="flex items-center gap-3">
          {oldPrice && (
            <span className="text-xs text-on-surface-variant/60 line-through">
              {formatPrice(Number(oldPrice))}
            </span>
          )}
          <span className="font-body-md text-[#121c2a] tracking-wider">
            {formatPrice(Number(price))}
          </span>
        </div>
      </div>
    </div>
  );
};
