import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../../types';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { usePromotions } from '../../context/PromotionContext';
import { getPromoBadge } from '../../utils/promotionHelpers';
import { StarRating } from '../common/StarRating';
import { BottleSelectionModal } from './BottleSelectionModal';

interface ProductCardProps {
  product: Product;
  defaultType?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, defaultType }) => {
  const navigate = useNavigate();
  const [showBottleModal, setShowBottleModal] = useState(false);
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

    const isAttar = defaultVariant?.productType === 'ATTAR' || (product as any).productType === 'ATTAR' || defaultType === 'ATTAR';
    
    if (isAttar) {
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
      size: size,
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
      />
      <div className="card group flex flex-col overflow-hidden">
      {/* 1:1 Image Container */}
      <div className="product-media relative aspect-square bg-surface-container">
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {badgeText && (
            <span className="bg-accent text-ink text-[9px] font-label-md uppercase tracking-[0.2em] px-3 py-1.5 shadow-sm">
              {badgeText}
            </span>
          )}
          {product.featured && !badgeText && (
            <span className="bg-ink text-accent text-[9px] font-label-md uppercase tracking-[0.2em] px-3 py-1.5 shadow-sm">
              Featured
            </span>
          )}
        </div>

        {/* Wishlist Icon */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center transition-all duration-300 hover:bg-accent hover:text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-pressed={inWishlist}
          title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{
              fontVariationSettings: inWishlist ? "'FILL' 1" : "'FILL' 0",
              color: inWishlist ? 'var(--accent)' : 'inherit'
            }}
          >
            favorite
          </span>
        </button>

        {/* Out of stock overlay */}
        {stock === 0 && (
          <div className="absolute inset-0 z-[5] bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-ink/90 text-white text-[10px] font-label-md uppercase tracking-[0.2em] px-5 py-2">
              Sold Out
            </span>
          </div>
        )}

        <Link
          to={`/product/${product.id}${defaultType ? `?type=${defaultType}` : ''}`}
          className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          {image ? (
            <img
              src={getImageUrl(image)}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </Link>

        {/* Floating Actions on Hover */}
        <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex gap-2 z-10">
          <button
            onClick={handleQuickView}
            className="flex-1 bg-white/95 backdrop-blur py-3 text-[10px] font-label-md uppercase tracking-[0.15em] text-ink hover:bg-ink hover:text-accent transition-colors border border-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Quick View
          </button>
          <button
            onClick={handleAddToCart}
            disabled={!variantId || stock === 0}
            className="flex-1 bg-ink py-3 text-[10px] font-label-md uppercase tracking-[0.15em] text-white hover:bg-accent hover:text-ink transition-colors disabled:opacity-50 disabled:hover:bg-ink disabled:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Add to Cart
          </button>
        </div>
      </div>

      {/* Elegant Details */}
      <div className="p-6 flex flex-col items-center text-center bg-surface">
        <span className="text-[9px] font-body-md text-on-surface-variant uppercase tracking-[0.25em] mb-2">
          {product.category?.name || 'Fragrance'}
        </span>

        <Link
          to={`/product/${product.id}${defaultType ? `?type=${defaultType}` : ''}`}
          className="mb-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <h3 className="font-headline-md text-lg text-ink group-hover:text-accent transition-colors line-clamp-1 font-normal tracking-wide">
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
          <span className="font-body-md text-ink tracking-wider">
            {formatPrice(Number(price))}
          </span>
        </div>
      </div>
      </div>
    </>
  );
};
