import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Loader } from '../components/ui/Loader';
import { productService } from '../services/productService';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { formatPrice } from '../utils/formatPrice';
import type { Product as ProductType, Variant, ProductImage } from '../types';
import { getImageUrl } from '../utils/getImageUrl';
import { usePromotions } from '../context/PromotionContext';
import { getPromoIcon, getDaysRemaining } from '../utils/promotionHelpers';
import { ReviewList } from '../components/reviews/ReviewList';
import { RelatedProducts } from '../components/reviews/RelatedProducts';
import { StarRating } from '../components/common/StarRating';
import { useInView } from '../hooks/useInView';
import { SEO } from '../components/seo/SEO';
import { BottleSelectionModal } from '../components/product/BottleSelectionModal';
import { resolveProductImage } from '../utils/productUtils';

function getAllProductImages(images: ProductImage[]): ProductImage[] {
  const unique = new Map<string | number, ProductImage>();
  for (const img of images) {
    if (!unique.has(img.id)) {
      unique.set(img.id, img);
    }
  }
  return Array.from(unique.values());
}

export const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { activePromotions } = usePromotions();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [mainImage, setMainImage] = useState<string>('');

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [activeType, setActiveType] = useState<string>('ATTAR');
  const [showBottleModal, setShowBottleModal] = useState(false);

  // Scroll-reveal refs for below-the-fold sections (must be called unconditionally, before any early returns)
  const { ref: reviewsRef, inView: reviewsInView } = useInView<HTMLElement>();
  const { ref: relatedRef, inView: relatedInView } = useInView<HTMLElement>();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        if (id) {
          const res = await productService.getProduct(id);
          setProduct(res.data);

          const imgs: ProductImage[] = res.data.images || [];

          if (res.data.variants && res.data.variants.length > 0) {
            const requestedType = searchParams.get('type')?.toUpperCase();
            let initialType = 'ATTAR';
            if (requestedType === 'PERFUME' && res.data.variants.some((v: Variant) => v.productType === 'PERFUME')) {
              initialType = 'PERFUME';
            } else if (requestedType === 'ATTAR' && res.data.variants.some((v: Variant) => v.productType === 'ATTAR')) {
              initialType = 'ATTAR';
            } else if (!res.data.variants.some((v: Variant) => v.productType === 'ATTAR') && res.data.variants.some((v: Variant) => v.productType === 'PERFUME')) {
              initialType = 'PERFUME';
            }

            setActiveType(initialType);
            const initialVariants = (res.data.variants.filter((v: Variant) => v.productType === initialType) as Variant[])
              .sort((a, b) => a.price - b.price);

            // ── Preferred default size ─────────────────────────────────────────
            // Attar → prefer 6ml.  Perfume → prefer 60ml.
            // Falls back to the cheapest active variant when preferred size is absent.
            const preferredDefaultSize = initialType === 'ATTAR' ? '6ml' : initialType === 'PERFUME' ? '60ml' : null;
            let initialVariant: Variant | null = null;
            if (preferredDefaultSize) {
              initialVariant = initialVariants.find((v: Variant) => v.size?.toLowerCase() === preferredDefaultSize) ?? null;
            }
            if (!initialVariant) {
              initialVariant = initialVariants.length > 0 ? initialVariants[0] : (res.data.variants[0] ?? null);
            }
            setSelectedVariant(initialVariant);

            // Set initial image to primary of the correct type bucket
            const resolvedImage = resolveProductImage(imgs, initialType);
            setMainImage(resolvedImage || '');
          } else if (imgs.length > 0) {
            // No variants — just show first image
            const primary = imgs.find((img: any) => img.isPrimary) || imgs[0];
            setMainImage(primary.imageUrl);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-accent text-2xl">search_off</span>
        </div>
        <h2 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase">Product Not Found</h2>
        <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed max-w-sm">
          {error || 'The product you are looking for does not exist or an error occurred.'}
        </p>
        <button onClick={() => navigate('/collection')} className="btn btn-primary">
          Back to Collection
        </button>
      </div>
    );
  }

  const hasAttar = product.variants?.some(v => v.productType === 'ATTAR');
  const hasPerfume = product.variants?.some(v => v.productType === 'PERFUME');

  const allProductImageObjects = getAllProductImages(product.images || []);
  const allImages = allProductImageObjects.map(img => img.imageUrl);

  const handleNextImage = () => {
    if (allImages.length <= 1) return;
    const currentIndex = allImages.indexOf(mainImage);
    const nextIndex = (currentIndex + 1) % allImages.length;
    setMainImage(allImages[nextIndex]);
  };

  const handlePrevImage = () => {
    if (allImages.length <= 1) return;
    const currentIndex = allImages.indexOf(mainImage);
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    setMainImage(allImages[prevIndex]);
  };

  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd(null);
    setTouchStart('touches' in e ? (e as React.TouchEvent).targetTouches[0].clientX : (e as React.MouseEvent).clientX);
  };

  const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd('touches' in e ? (e as React.TouchEvent).targetTouches[0].clientX : (e as React.MouseEvent).clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) handleNextImage();
    if (isRightSwipe) handlePrevImage();
  };

  const showTypeToggle = hasAttar && hasPerfume;
  const filteredVariants = (product.variants?.filter(v => v.productType === activeType) || [])
    .sort((a, b) => a.price - b.price);

  const handleVariantChange = (variant: Variant) => {
    setSelectedVariant(variant);
    if (variant.imageUrl) {
      setMainImage(variant.imageUrl);
    }
  };

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    const newVariants = (product?.variants?.filter(v => v.productType === type) || [])
      .sort((a, b) => a.price - b.price);
    if (newVariants.length > 0) {
      // Apply the same preferred-size logic as the initial load.
      const preferredSize = type === 'ATTAR' ? '6ml' : type === 'PERFUME' ? '60ml' : null;
      const preferred = preferredSize ? newVariants.find(v => v.size?.toLowerCase() === preferredSize) ?? null : null;
      setSelectedVariant(preferred ?? newVariants[0]);
    }

    if (product?.images) {
      const resolvedImage = resolveProductImage(product.images, type);
      setMainImage(resolvedImage || '');
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    const isBakhoorCategory = product?.category?.type === 'BAKHOOR' || (product as any)?.categoryType === 'BAKHOOR' || product?.category?.name?.toLowerCase() === 'bakhoor';
    const categoryType = product?.category?.type || (product as any)?.categoryType;
    const isAttar = activeType === 'ATTAR' || categoryType === 'ATTAR' || categoryType === 'ATTARS';
    const isPerfume = activeType === 'PERFUME' || categoryType === 'PERFUME' || categoryType === 'PERFUMES';
    const isFragranceVariant = (isAttar || isPerfume) && !isBakhoorCategory;

    if (isFragranceVariant) {
      setShowBottleModal(true);
    } else {
      addToCartWithBottle(null);
    }
  };

  const addToCartWithBottle = (bottle: any | null) => {
    if (!selectedVariant) return;

    const bottlePrice = bottle?.price || 0;
    const basePrice = selectedVariant.price + bottlePrice;

    addItem({
      id: '', // Will be generated
      productId: product!.id.toString(),
      variantId: selectedVariant.id,
      quantity: 1,
      name: product!.name,
      image: mainImage,
      size: selectedVariant.colorName || selectedVariant.size,
      originalPrice: basePrice,
      finalPrice: basePrice,
      bottle: bottle ? { id: bottle.id, name: bottle.name, price: bottle.price } : undefined
    });
    setShowBottleModal(false);
  };

  const handleToggleWishlist = () => {
    if (!selectedVariant) return;
    if (isInWishlist(selectedVariant.id.toString())) {
      removeFromWishlist(selectedVariant.id.toString());
    } else {
      addToWishlist(selectedVariant.id.toString());
    }
  };

  const applicablePromos = activePromotions.filter(promo => {
    if (promo.promotionType === 'PRODUCT_DISCOUNT' && promo.configuration?.applicableProductIds?.includes(product.id)) return true;
    if (promo.promotionType === 'CATEGORY_DISCOUNT' && product.category?.id && promo.configuration?.applicableCategoryIds?.includes(product.category.id)) {
        const categoryName = product.category.name?.toLowerCase() || '';
        if (categoryName.includes('attar') && activeType !== 'ATTAR') return false;
        if (categoryName.includes('perfume') && activeType !== 'PERFUME') return false;
        return true;
    }
    if (promo.promotionType === 'FREE_PRODUCT') {
      const scope = promo.configuration?.buyScope;
      if (scope === 'SPECIFIC_PRODUCT' && promo.configuration?.buyVariantIds?.length) {
        return product.variants?.some(v => promo.configuration!.buyVariantIds!.includes(v.id));
      }
      if (scope === 'CATEGORY' && product.category?.id && promo.configuration?.buyCategoryId === product.category.id) return true;
      if (scope === 'ANY_PRODUCT' || (!scope && !promo.configuration?.buyVariantIds?.length && !promo.configuration?.buyCategoryId)) return true;
    }
    return false;
  });

  const renderPromoBanner = () => {
    if (applicablePromos.length === 0) return null;

    return (
      <div className="space-y-3 mt-6">
        {applicablePromos.map(promo => {
          const icon = getPromoIcon(promo);
          const daysLeft = getDaysRemaining(promo.endDate);

          let title = '';
          let subtitle = '';

          if (promo.promotionType === 'FREE_PRODUCT') {
            title = `Free Gift Included`;
            subtitle = promo.generatedDescription || `Buy this product to unlock a free gift in your cart`;
          } else if (promo.discountType === 'PERCENTAGE') {
            title = `${promo.discountValue}% Off This Product`;
            subtitle = promo.description || 'Discount applied automatically at checkout';
          } else if (promo.discountType === 'FIXED_AMOUNT') {
            title = `₹${promo.discountValue} Off This Product`;
            subtitle = promo.description || 'Discount applied automatically at checkout';
          }

          return (
            <div
              key={promo.id}
              className="relative overflow-hidden rounded-lg border border-primary/15 bg-gradient-to-r from-primary/[0.04] to-transparent"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-primary/20 to-transparent"></div>

              <div className="px-4 py-3 flex items-start gap-3">
                <span className="text-xl mt-0.5 flex-shrink-0" aria-hidden="true">{icon}</span>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-label-md text-primary tracking-wide">{title}</h4>
                    {promo.code && (
                      <span className="bg-primary/10 text-primary text-[10px] font-mono font-semibold px-2 py-0.5 rounded tracking-wider border border-primary/10">
                        {promo.code}
                      </span>
                    )}
                  </div>
                  <p className="font-body-sm text-on-surface-variant leading-relaxed">{subtitle}</p>
                  {daysLeft !== null && (
                    <p className="font-body-sm text-on-surface-variant mt-1.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {daysLeft === 1 ? 'Ends tomorrow' : `Offer ends in ${daysLeft} days`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.shortDescription || "",
    "image": allImages.length > 0 ? getImageUrl(allImages[0]) : "https://alahadattars.com/og-image.jpg",
    "brand": {
      "@type": "Brand",
      "name": "Al Ahad Attars"
    },
    "offers": {
      "@type": "AggregateOffer",
      "offerCount": product.variants?.length || 1,
      "lowPrice": filteredVariants.length > 0 ? filteredVariants[0].price : (selectedVariant?.price || 0),
      "highPrice": filteredVariants.length > 0 ? filteredVariants[filteredVariants.length - 1].price : (selectedVariant?.price || 0),
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock",
      "url": `https://alahadattars.com/product/${product.slug}`
    }
  };

  return (
    <main className="w-full py-12 flex flex-col gap-16">
      <SEO
        title={product.name}
        description={product.shortDescription || product.description?.substring(0, 150) || "Experience the premium attar collection."}
        canonicalUrl={`/product/${product.slug}`}
        type="product"
        imageUrl={allImages.length > 0 ? getImageUrl(allImages[0]) : undefined}
        schema={productSchema}
      />

      <BottleSelectionModal
        isOpen={showBottleModal}
        onClose={() => setShowBottleModal(false)}
        onConfirm={addToCartWithBottle}
        selectedSize={selectedVariant?.size}
        productType={activeType === 'PERFUME' ? 'PERFUME' : activeType === 'ATTAR' ? 'ATTAR' : ''}
      />

      {/* SECTION 1: Product Hero (1400px) */}
      <section className="max-w-[1400px] mx-auto w-full px-4 md:px-8">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Collection', href: '/collection' },
        ...(product.category ? [{
          label: product.category.name,
          href: `/collection?category=${product.category.name?.toLowerCase() || ''}`
        }] : []),
        ...(product.subCategory ? [{
          label: product.subCategory.name,
          href: `/collection?category=${product.category?.name?.toLowerCase() || ''}&subcategory=${product.subCategory.id}`
        }] : []),
        { label: product.name }
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 pt-2">
        {/* Left Column: Image Gallery */}
        <div className="flex flex-col md:flex-row gap-4 lg:col-span-6 w-full max-w-[560px] mx-auto lg:mx-0">

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="order-2 md:order-1 flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 md:pr-1 hide-scrollbar w-full md:w-[72px] flex-shrink-0">
              {allProductImageObjects.map((imgObj, idx) => (
                <button
                  key={imgObj.id}
                  className={`flex-shrink-0 w-[64px] h-[64px] md:w-[68px] md:h-[68px] rounded-sm overflow-hidden border bg-white transition-all duration-200 hover:-translate-y-[1px] md:hover:-translate-y-0 md:hover:-translate-x-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${mainImage === imgObj.imageUrl ? 'border-accent shadow-xs' : 'border-[#e4dcc8] hover:border-accent/60'}`}
                  onClick={() => setMainImage(imgObj.imageUrl)}
                  aria-label={`View image ${idx + 1}`}
                  aria-current={mainImage === imgObj.imageUrl}
                >
                  <img
                    src={getImageUrl(imgObj.imageUrl)}
                    alt={`Thumbnail ${idx+1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Image Frame */}
          <div
            className="order-1 md:order-2 w-full h-auto aspect-[4/5] max-h-[580px] rounded-sm overflow-hidden bg-white border border-[#e4dcc8] shadow-xs relative group cursor-zoom-in flex items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onTouchStart}
            onMouseMove={touchStart !== null ? onTouchMove : undefined}
            onMouseUp={onTouchEnd}
            onMouseLeave={() => {
              if (touchStart !== null) onTouchEnd();
              setTouchStart(null);
            }}
          >
            {mainImage ? (
              <>
                <img
                  src={getImageUrl(mainImage)}
                  alt={product.name}
                  className="w-full h-full object-contain p-6 md:p-8 transition-transform duration-700 group-hover:scale-105 select-none"
                  draggable={false}
                />

                {/* Carousel Controls */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs border border-[#e4dcc8] shadow-xs flex items-center justify-center text-ink hover:text-accent hover:border-accent transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                      aria-label="Previous image"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs border border-[#e4dcc8] shadow-xs flex items-center justify-center text-ink hover:text-accent hover:border-accent transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                      aria-label="Next image"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-ink/40 p-6 h-full w-full bg-[#faf8f5] select-none">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">image_not_supported</span>
                <p className="text-xs uppercase tracking-wider text-center">No image available for {activeType === 'ATTAR' ? 'Attar' : (activeType === 'PERFUME' ? 'Perfume' : 'this item')}.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Product Details */}
        <div className="flex flex-col lg:col-span-6">
          <div className="mb-6">
            <span className="text-accent text-[11px] font-semibold uppercase tracking-[0.25em] mb-2 block">
              {product.category?.name || 'Exclusive Fragrance'}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-ink font-normal tracking-tight mb-3">
              {product.name}
            </h1>

            <div className="flex items-center space-x-3 mb-5">
              <div className="flex text-accent">
                <StarRating rating={product.averageRating || 0} size={18} showText={false} />
              </div>
              <span className="text-xs text-ink/60 font-medium">({product.reviewCount || 0} Reviews)</span>
            </div>

            <div className="flex items-baseline space-x-3 mb-6 pb-6 border-b border-[#e4dcc8]">
              <span className="font-serif text-2xl sm:text-3xl text-ink font-semibold">
                {selectedVariant ? formatPrice(selectedVariant.price) : 'N/A'}
              </span>
              <span className="text-[11px] text-ink/50 uppercase tracking-wider">Taxes included</span>
            </div>

            {product.description && (
              <p className="text-sm sm:text-base text-ink/75 mb-7 max-w-xl leading-relaxed font-light">
                {product.description}
              </p>
            )}

            <div className="space-y-6">
              {showTypeToggle && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">
                    Select Formulation
                  </h3>
                  <div className="inline-flex flex-wrap bg-surface-container-lowest border border-[#e4dcc8] rounded-full p-1 max-w-full shadow-xs">
                    <button
                      onClick={() => handleTypeChange('ATTAR')}
                      className={`px-5 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                        activeType === 'ATTAR'
                          ? 'bg-ink text-surface shadow-xs'
                          : 'text-ink/70 hover:text-ink'
                      }`}
                    >
                      Pure Attar
                    </button>
                    <button
                      onClick={() => handleTypeChange('PERFUME')}
                      className={`px-5 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                        activeType === 'PERFUME'
                          ? 'bg-ink text-surface shadow-xs'
                          : 'text-ink/70 hover:text-ink'
                      }`}
                    >
                      Eau De Parfum
                    </button>
                  </div>
                </div>
              )}

              {product.category?.name === 'Bakhoor' || filteredVariants.length === 1 ? (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">
                    {filteredVariants[0]?.colorName ? 'Colour' : (product.category?.name?.toLowerCase() === 'car perfume' || filteredVariants[0]?.size?.toLowerCase()?.includes('pc') ? 'Quantity' : 'Size / Weight')}
                  </h3>
                  <div className="px-5 py-2.5 border border-[#e4dcc8] rounded-sm text-xs uppercase tracking-wider font-medium text-ink inline-block bg-surface-container-lowest">
                    {filteredVariants[0]?.colorName || `${filteredVariants[0]?.size} Pack`}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">
                    {filteredVariants.some(v => v.colorName) ? 'Select Colour' : 'Select Volume'}
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {filteredVariants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      return (
                        <label key={variant.id} className="cursor-pointer">
                          <input
                            type="radio"
                            name="variant-selection"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => handleVariantChange(variant)}
                          />
                          <div className={`px-5 py-2.5 border rounded-sm text-xs uppercase tracking-wider font-medium transition-all duration-200 shadow-xs ${
                            isSelected
                              ? 'bg-ink text-surface border-ink'
                              : 'bg-surface-container-lowest text-ink/75 border-[#e4dcc8] hover:border-accent hover:text-ink'
                          }`}>
                            {variant.colorName || variant.size}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Premium Promotion Banner */}
              {renderPromoBanner()}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || selectedVariant.stock === 0}
                  className="flex-1 h-[54px] bg-ink text-surface rounded-sm font-semibold text-xs uppercase tracking-[0.2em] hover:bg-ink/90 active:scale-[0.99] transition-all flex justify-center items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <span className="material-symbols-outlined text-[19px]">shopping_bag</span>
                  <span>{selectedVariant && selectedVariant.stock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
                </button>
                <button
                  onClick={handleToggleWishlist}
                  disabled={!selectedVariant}
                  className={`w-[54px] h-[54px] border rounded-sm flex justify-center items-center transition-all duration-200 wishlist-btn-pop ${
                    selectedVariant && isInWishlist(selectedVariant.id.toString())
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-[#e4dcc8] text-ink/70 hover:border-accent hover:text-accent bg-surface-container-lowest'
                  }`}
                  aria-label={selectedVariant && isInWishlist(selectedVariant.id.toString()) ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: selectedVariant && isInWishlist(selectedVariant.id.toString()) ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                </button>
              </div>

              {/* Trust Section */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-5 text-[10px] sm:text-[11px] uppercase tracking-wider text-ink/60 font-medium border-t border-[#e4dcc8]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-accent">verified</span>
                  100% Authentic
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-accent">lock</span>
                  Encrypted Checkout
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-accent">local_shipping</span>
                  Express Delivery
                </div>
                <div className="flex items-center gap-1.5 hidden sm:flex">
                  <span className="material-symbols-outlined text-[16px] text-accent">package_2</span>
                  Artisanal Packaging
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* SECTION 3: Customer Reviews (1100px) */}
      {product && (
        <section ref={reviewsRef} className={`max-w-[1100px] mx-auto w-full px-4 md:px-8 reveal ${reviewsInView ? 'in-view' : ''}`}>
          <ReviewList productId={product.id} productName={product.name} />
        </section>
      )}

      {/* SECTION 4: Similar Fragrances (1280px) */}
      {product && (
        <section ref={relatedRef} className={`max-w-[1280px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 reveal ${relatedInView ? 'in-view' : ''}`}>
          <RelatedProducts productId={product.id} />
        </section>
      )}

      {/* Mobile Floating Sticky CTA */}
      {product && selectedVariant && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fbf9f5]/95 backdrop-blur-md border-t border-[#e4dcc8] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-serif text-ink truncate font-medium">{product.name}</p>
            <p className="text-sm font-semibold text-ink">{formatPrice(selectedVariant.price)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={selectedVariant.stock === 0}
            className="px-5 py-2.5 bg-ink text-surface rounded-sm font-semibold text-xs uppercase tracking-wider hover:bg-ink/90 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
            <span>{selectedVariant.stock > 0 ? 'Add to Bag' : 'Sold Out'}</span>
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
};

export const Product = ProductPage;
