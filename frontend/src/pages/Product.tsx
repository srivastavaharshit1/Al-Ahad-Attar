import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  Truck,
  Package,
  Plus,
  Minus,
  Sparkles,
  Search,
  ArrowRight,
  Star,
  Share2,
} from 'lucide-react';
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
import { useInView } from '../hooks/useInView';
import { SEO } from '../components/seo/SEO';
import { BottleSelectionModal } from '../components/product/BottleSelectionModal';
import { ShareModal } from '../components/ui/ShareModal';
import { resolveProductImage, sortVariantsByVolume } from '../utils/productUtils';

function getAllProductImages(images: ProductImage[]): ProductImage[] {
  const unique = new Map<string | number, ProductImage>();
  for (const img of images) {
    if (!unique.has(img.id)) {
      unique.set(img.id, img);
    }
  }
  return Array.from(unique.values());
}

function formatVariantVolume(size?: string | null): string {
  if (!size) return '';
  return size.replace(/(\d+)\s*(ml|g|gm|oz)/i, '$1 $2').toUpperCase();
}

function getVariantSubLabel(
  variant: Variant,
  index: number,
  total: number
): { label: string; isHighlight: boolean } {
  const sizeLower = variant.size?.toLowerCase() || '';
  if (sizeLower.includes('6ml') || sizeLower.includes('60ml') || (total === 3 && index === 1)) {
    return { label: 'Save 15%', isHighlight: true };
  }
  if (
    sizeLower.includes('12ml') ||
    sizeLower.includes('100ml') ||
    (total > 1 && index === total - 1)
  ) {
    return { label: 'Best Value', isHighlight: false };
  }
  return { label: 'Standard', isHighlight: false };
}

function renderRatingStars(rating: number = 0) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1 select-none" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= rounded;
        return (
          <Star
            key={starIndex}
            className={`w-4 h-4 transition-colors ${
              isFilled
                ? 'fill-[#C8A55E] text-[#C8A55E]'
                : 'fill-[#E8DFCA]/60 text-[#C8A55E]'
            }`}
            strokeWidth={1.75}
          />
        );
      })}
    </div>
  );
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
  const [quantity, setQuantity] = useState<number>(1);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [activeType, setActiveType] = useState<string>('ATTAR');
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [isInstantCheckout, setIsInstantCheckout] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Scroll-reveal refs for below-the-fold sections
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
            if (
              requestedType === 'PERFUME' &&
              res.data.variants.some((v: Variant) => v.productType === 'PERFUME')
            ) {
              initialType = 'PERFUME';
            } else if (
              requestedType === 'ATTAR' &&
              res.data.variants.some((v: Variant) => v.productType === 'ATTAR')
            ) {
              initialType = 'ATTAR';
            } else if (
              !res.data.variants.some((v: Variant) => v.productType === 'ATTAR') &&
              res.data.variants.some((v: Variant) => v.productType === 'PERFUME')
            ) {
              initialType = 'PERFUME';
            }

            setActiveType(initialType);
            const initialVariants = sortVariantsByVolume(
              res.data.variants.filter((v: Variant) => v.productType === initialType) as Variant[]
            );

            // Preferred default size: Attar -> 6ml, Perfume -> 60ml
            const preferredDefaultSize =
              initialType === 'ATTAR' ? '6ml' : initialType === 'PERFUME' ? '60ml' : null;
            let initialVariant: Variant | null = null;
            if (preferredDefaultSize) {
              initialVariant =
                initialVariants.find(
                  (v: Variant) => v.size?.toLowerCase() === preferredDefaultSize
                ) ?? null;
            }
            if (!initialVariant) {
              initialVariant =
                initialVariants.length > 0 ? initialVariants[0] : res.data.variants[0] ?? null;
            }
            setSelectedVariant(initialVariant);

            const resolvedImage = resolveProductImage(imgs, initialType);
            const fallbackImage =
              imgs.find((img: any) => img.isPrimary)?.imageUrl || imgs[0]?.imageUrl || '';
            setMainImage(resolvedImage || fallbackImage);
          } else if (imgs.length > 0) {
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
  }, [id, searchParams]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-[#FAF7F0]">
        <Loader />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] text-center px-4 bg-[#FAF7F0]">
        <div className="w-16 h-16 border border-[#C8A55E] rounded-full flex items-center justify-center mb-6 text-[#C8A55E]">
          <Search className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl text-[#121C2A] mb-2 tracking-wide uppercase">
          Product Not Found
        </h2>
        <p className="text-xs text-[#8C8270] mb-8 leading-relaxed max-w-sm">
          {error || 'The fragrance you are looking for does not exist or has been archived.'}
        </p>
        <button
          onClick={() => navigate('/collections')}
          className="border border-[#C8A55E] bg-[#121C2A] text-white px-6 py-2.5 rounded-xs text-xs font-semibold uppercase tracking-wider hover:bg-[#C8A55E] hover:text-[#121C2A] transition-colors"
        >
          Return to Collection
        </button>
      </div>
    );
  }

  const hasAttar = product.variants?.some((v) => v.productType === 'ATTAR');
  const hasPerfume = product.variants?.some((v) => v.productType === 'PERFUME');

  const allProductImageObjects = getAllProductImages(product.images || []);
  const allImages = allProductImageObjects.map((img) => img.imageUrl);
  const currentImageIndex = Math.max(0, allImages.indexOf(mainImage));

  const handleNextImage = () => {
    if (allImages.length <= 1) return;
    const nextIndex = (currentImageIndex + 1) % allImages.length;
    setMainImage(allImages[nextIndex]);
  };

  const handlePrevImage = () => {
    if (allImages.length <= 1) return;
    const prevIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
    setMainImage(allImages[prevIndex]);
  };

  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd(null);
    setTouchStart(
      'touches' in e
        ? (e as React.TouchEvent).targetTouches[0].clientX
        : (e as React.MouseEvent).clientX
    );
  };

  const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd(
      'touches' in e
        ? (e as React.TouchEvent).targetTouches[0].clientX
        : (e as React.MouseEvent).clientX
    );
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
  const filteredVariants = sortVariantsByVolume(
    product.variants?.filter((v) => v.productType === activeType) || []
  );

  const handleVariantChange = (variant: Variant) => {
    setSelectedVariant(variant);
    if (variant.imageUrl) {
      setMainImage(variant.imageUrl);
    }
  };

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    const newVariants = sortVariantsByVolume(
      product?.variants?.filter((v) => v.productType === type) || []
    );
    if (newVariants.length > 0) {
      const preferredSize = type === 'ATTAR' ? '6ml' : type === 'PERFUME' ? '60ml' : null;
      const preferred = preferredSize
        ? newVariants.find((v) => v.size?.toLowerCase() === preferredSize) ?? null
        : null;
      setSelectedVariant(preferred ?? newVariants[0]);
    }

    if (product?.images) {
      const resolvedImage = resolveProductImage(product.images, type);
      const fallbackImage =
        product.images.find((img: any) => img.isPrimary)?.imageUrl || product.images[0]?.imageUrl || '';
      setMainImage(resolvedImage || fallbackImage);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    const isBakhoorCategory =
      product?.category?.type === 'BAKHOOR' ||
      (product as any)?.categoryType === 'BAKHOOR' ||
      product?.category?.name?.toLowerCase() === 'bakhoor';
    const categoryType = product?.category?.type || (product as any)?.categoryType;
    const isAttar = activeType === 'ATTAR' || categoryType === 'ATTAR' || categoryType === 'ATTARS';
    const isPerfume =
      activeType === 'PERFUME' || categoryType === 'PERFUME' || categoryType === 'PERFUMES';
    const isFragranceVariant = (isAttar || isPerfume) && !isBakhoorCategory;

    setIsInstantCheckout(false);

    if (isFragranceVariant) {
      setShowBottleModal(true);
    } else {
      addToCartWithBottle(null, false);
    }
  };

  const addToCartWithBottle = (bottle: any | null, directCheckout = false) => {
    if (!selectedVariant) return;

    const bottlePrice = bottle?.price || 0;
    const basePrice = selectedVariant.price + bottlePrice;

    addItem({
      id: '',
      productId: product!.id.toString(),
      variantId: selectedVariant.id,
      quantity: quantity,
      name: product!.name,
      image: mainImage,
      size: selectedVariant.colorName || selectedVariant.size,
      originalPrice: basePrice,
      finalPrice: basePrice,
      bottle: bottle ? { id: bottle.id, name: bottle.name, price: bottle.price } : undefined,
    });
    setShowBottleModal(false);

    if (directCheckout || isInstantCheckout) {
      setIsInstantCheckout(false);
      navigate('/checkout');
    }
  };

  const handleInstantCheckout = () => {
    if (!selectedVariant || selectedVariant.stock === 0) return;

    const isBakhoorCategory =
      product?.category?.type === 'BAKHOOR' ||
      (product as any)?.categoryType === 'BAKHOOR' ||
      product?.category?.name?.toLowerCase() === 'bakhoor';
    const categoryType = product?.category?.type || (product as any)?.categoryType;
    const isAttar = activeType === 'ATTAR' || categoryType === 'ATTAR' || categoryType === 'ATTARS';
    const isPerfume =
      activeType === 'PERFUME' || categoryType === 'PERFUME' || categoryType === 'PERFUMES';
    const isFragranceVariant = (isAttar || isPerfume) && !isBakhoorCategory;

    if (isFragranceVariant) {
      setIsInstantCheckout(true);
      setShowBottleModal(true);
    } else {
      addToCartWithBottle(null, true);
    }
  };

  const handleToggleWishlist = () => {
    if (!selectedVariant) return;
    if (isInWishlist(selectedVariant.id.toString())) {
      removeFromWishlist(selectedVariant.id.toString());
    } else {
      addToWishlist(selectedVariant.id.toString());
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const applicablePromos = activePromotions.filter((promo) => {
    if (
      promo.promotionType === 'PRODUCT_DISCOUNT' &&
      promo.configuration?.applicableProductIds?.includes(product.id)
    )
      return true;
    if (
      promo.promotionType === 'CATEGORY_DISCOUNT' &&
      product.category?.id &&
      promo.configuration?.applicableCategoryIds?.includes(product.category.id)
    ) {
      const categoryName = product.category.name?.toLowerCase() || '';
      if (categoryName.includes('attar') && activeType !== 'ATTAR') return false;
      if (categoryName.includes('perfume') && activeType !== 'PERFUME') return false;
      return true;
    }
    if (promo.promotionType === 'FREE_PRODUCT') {
      const scope = promo.configuration?.buyScope;
      if (scope === 'SPECIFIC_PRODUCT' && promo.configuration?.buyVariantIds?.length) {
        return product.variants?.some((v) => promo.configuration!.buyVariantIds!.includes(v.id));
      }
      if (
        scope === 'CATEGORY' &&
        product.category?.id &&
        promo.configuration?.buyCategoryId === product.category.id
      )
        return true;
      if (
        scope === 'ANY_PRODUCT' ||
        (!scope && !promo.configuration?.buyVariantIds?.length && !promo.configuration?.buyCategoryId)
      )
        return true;
    }
    return false;
  });

  const renderPromoBanner = () => {
    if (applicablePromos.length === 0) return null;

    return (
      <div className="space-y-3 mt-4 mb-4">
        {applicablePromos.map((promo) => {
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
              className="relative overflow-hidden rounded-md border border-[#C8A55E]/40 bg-[#FAF7F0] p-3 flex items-start gap-3 shadow-3xs"
            >
              <span className="text-lg mt-0.5 shrink-0" aria-hidden="true">
                {icon}
              </span>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-xs font-semibold text-[#121C2A]">{title}</h4>
                  {promo.code && (
                    <span className="bg-[#C8A55E]/15 text-[#121C2A] text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-[#C8A55E]/30">
                      {promo.code}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8C8270] leading-relaxed">{subtitle}</p>
                {daysLeft !== null && (
                  <p className="text-[10px] text-[#8C8270] mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#C8A55E]" />
                    {daysLeft === 1 ? 'Ends tomorrow' : `Offer ends in ${daysLeft} days`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.shortDescription || '',
    image: allImages.length > 0 ? getImageUrl(allImages[0]) : 'https://alahadattars.com/og-image.jpg',
    brand: {
      '@type': 'Brand',
      name: 'Al Ahad Attars',
    },
    offers: {
      '@type': 'AggregateOffer',
      offerCount: product.variants?.length || 1,
      lowPrice:
        filteredVariants.length > 0
          ? Math.min(...filteredVariants.map((v) => v.price))
          : selectedVariant?.price || 0,
      highPrice:
        filteredVariants.length > 0
          ? Math.max(...filteredVariants.map((v) => v.price))
          : selectedVariant?.price || 0,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: `https://alahadattars.com/product/${product.slug}`,
    },
  };

  return (
    <main className="w-full bg-[#FAF7F0] min-h-screen flex flex-col">
      <SEO
        title={product.name}
        description={
          product.shortDescription ||
          product.description?.substring(0, 150) ||
          'Experience the premium attar collection.'
        }
        canonicalUrl={`/product/${product.slug}`}
        type="product"
        imageUrl={allImages.length > 0 ? getImageUrl(allImages[0]) : undefined}
        schema={productSchema}
      />

      <BottleSelectionModal
        isOpen={showBottleModal}
        onClose={() => {
          setShowBottleModal(false);
          setIsInstantCheckout(false);
        }}
        onConfirm={(bottle) => addToCartWithBottle(bottle)}
        selectedSize={selectedVariant?.size}
        productType={activeType === 'PERFUME' ? 'PERFUME' : activeType === 'ATTAR' ? 'ATTAR' : ''}
        confirmLabel={isInstantCheckout ? 'Confirm & Checkout' : 'Confirm & Add to Bag'}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={product ? product.name : 'Al Ahad Fragrance'}
        text={
          product?.shortDescription ||
          `Discover ${product?.name || 'this artisanal fragrance'} by Al Ahad Attars`
        }
        imageUrl={mainImage || (allImages.length > 0 ? getImageUrl(allImages[0]) : undefined)}
      />

      {/* SECTION 1: Product Hero Section */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 pb-16">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Collections', href: '/collections' },
              ...(product.category
                ? [
                    {
                      label: product.category.name,
                      href: `/collections?category=${product.category.name?.toLowerCase() || ''}`,
                    },
                  ]
                : []),
              ...(product.subCategory
                ? [
                    {
                      label: product.subCategory.name,
                      href: `/collections?category=${
                        product.category?.name?.toLowerCase() || ''
                      }&subcategory=${product.subCategory.id}`,
                    },
                  ]
                : []),
              { label: product.name },
            ]}
          />
        </div>

        {/* 2-Column Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* Left Column: Image Gallery with Thumbnail Strip */}
          <div className="flex flex-col md:flex-row gap-4 lg:col-span-6 w-full max-w-[620px] mx-auto lg:mx-0">
            {/* Thumbnails Strip */}
            {allImages.length > 1 && (
              <div className="order-2 md:order-1 flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 hide-scrollbar w-full md:w-[76px] shrink-0">
                {allProductImageObjects.map((imgObj, idx) => (
                  <button
                    key={imgObj.id}
                    type="button"
                    onClick={() => setMainImage(imgObj.imageUrl)}
                    className={`shrink-0 w-16 h-16 md:w-[72px] md:h-[72px] rounded-xs overflow-hidden border bg-white transition-all cursor-pointer ${
                      mainImage === imgObj.imageUrl
                        ? 'border-[#C8A55E] ring-1 ring-[#C8A55E] shadow-xs'
                        : 'border-[#E4DCC8] hover:border-[#C8A55E]/70 opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img
                      src={getImageUrl(imgObj.imageUrl)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Media Frame */}
            <div
              className="order-1 md:order-2 w-full aspect-[4/5] sm:aspect-square max-h-[580px] rounded-xs overflow-hidden bg-white border border-[#E4DCC8] shadow-xs relative group flex items-center justify-center select-none"
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
                    className="w-full h-full object-contain p-6 md:p-8 transition-transform duration-700 ease-out group-hover:scale-105"
                    draggable={false}
                  />

                  {/* Navigation Arrows */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevImage();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-[#E4DCC8] flex items-center justify-center text-[#121C2A] hover:text-[#C8A55E] hover:border-[#C8A55E] shadow-xs transition-all z-10 cursor-pointer"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextImage();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-[#E4DCC8] flex items-center justify-center text-[#121C2A] hover:text-[#C8A55E] hover:border-[#C8A55E] shadow-xs transition-all z-10 cursor-pointer"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Slide Indicator (e.g. 1 / 3) */}
                      <div className="absolute bottom-4 right-4 z-10">
                        <span className="bg-white/85 backdrop-blur-xs border border-[#E4DCC8] rounded-full px-2.5 py-0.5 text-[11px] text-[#8C8270] font-sans font-medium shadow-3xs">
                          {currentImageIndex + 1} / {allImages.length}
                        </span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-[#8C8270] p-6 h-full w-full bg-[#FAF7F0]">
                  <Package className="w-12 h-12 text-[#C8A55E]/50 mb-2 stroke-[1.2]" />
                  <p className="text-xs uppercase tracking-wider text-center">
                    No image available for {activeType === 'ATTAR' ? 'Attar' : 'Perfume'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Product Details & Purchase Actions */}
          <div className="flex flex-col lg:col-span-6 justify-start">
            {/* Category Eyebrow */}
            <div className="flex items-center gap-1.5 text-xs text-[#C8A55E] font-medium tracking-[0.2em] uppercase mb-1">
              <span>✦</span>
              <span>
                {product.category?.name ||
                  (product as any).categoryName ||
                  (activeType === 'PERFUME' ? 'PERFUMES' : 'ATTARS')}
              </span>
            </div>

            {/* Product Title */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#121C2A] font-normal tracking-tight mb-2.5">
              {product.name}
            </h1>

            {/* Review Link Row (Reflecting backend rating dynamically, no underlined line) */}
            <div className="flex items-center gap-2 text-xs mb-4">
              <a
                href="#customer-reviews"
                className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity no-underline"
                aria-label={
                  product.reviewCount > 0
                    ? `${(product.averageRating || 0).toFixed(1)} out of 5 stars from ${product.reviewCount} connoisseur reviews`
                    : 'Customer Reviews'
                }
              >
                {renderRatingStars(product.averageRating || 0)}
                {product.reviewCount > 0 && (
                  <span className="text-xs text-[#8C8270] font-sans font-light">
                    ({product.reviewCount})
                  </span>
                )}
              </a>
            </div>

            {/* Price Block */}
            <div className="flex flex-wrap items-baseline gap-2 mb-5">
              <span className="font-serif text-3xl sm:text-4xl text-[#121C2A] font-semibold">
                {selectedVariant ? formatPrice(selectedVariant.price) : 'N/A'}
              </span>
              <span className="text-[10px] text-[#8C8270] font-medium tracking-wider uppercase ml-1">
                INCLUSIVE OF ALL TAXES
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-xs sm:text-sm text-[#5A6578] font-light leading-relaxed mb-6">
                {product.description}
              </p>
            )}

            {/* Formulation Toggle if applicable */}
            {showTypeToggle && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#121C2A] mb-2.5">
                  Select Formulation
                </h3>
                <div className="inline-flex bg-white border border-[#E4DCC8] rounded-full p-1 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('ATTAR')}
                    className={`px-5 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                      activeType === 'ATTAR'
                        ? 'bg-[#121C2A] text-white shadow-xs'
                        : 'text-[#5A6578] hover:text-[#121C2A]'
                    }`}
                  >
                    Pure Attar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('PERFUME')}
                    className={`px-5 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                      activeType === 'PERFUME'
                        ? 'bg-[#121C2A] text-white shadow-xs'
                        : 'text-[#5A6578] hover:text-[#121C2A]'
                    }`}
                  >
                    Eau De Parfum
                  </button>
                </div>
              </div>
            )}

            {/* Volume Selection Row (Matching Reference) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-widest text-[#121C2A] uppercase">
                  SELECT VOLUME
                </span>
                <span className="text-xs text-[#8C8270] font-light">
                  {activeType === 'PERFUME' ? 'Fine Mist Vaporisateur' : 'Concentrated Oil Roll-On'}
                </span>
              </div>

              {filteredVariants.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {filteredVariants.map((variant, idx) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const isMiddleVariant =
                      variant.size?.toLowerCase() === '6ml' ||
                      variant.size?.toLowerCase() === '60ml' ||
                      (filteredVariants.length === 3 && idx === 1);
                    const sub = getVariantSubLabel(variant, idx, filteredVariants.length);

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleVariantChange(variant)}
                        className={`relative rounded-xl sm:rounded-2xl py-3.5 px-2 text-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'border-2 border-[#C8A55E] bg-[#FAF7F0] shadow-xs'
                            : 'border border-[#E8E2D5] bg-white hover:border-[#C8A55E]/70 shadow-3xs'
                        }`}
                      >
                        {/* Floating MOST POPULAR Badge */}
                        {isMiddleVariant && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                            <span className="bg-[#B68D40] text-white text-[8px] sm:text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap shadow-xs">
                              MOST POPULAR
                            </span>
                          </div>
                        )}

                        {/* Top-Right Circular Checkmark Badge for Selected Card */}
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 sm:-top-2.5 sm:-right-2.5 w-5 h-5 rounded-full bg-[#B68D40] text-white flex items-center justify-center shadow-xs z-10">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}

                        <span className="block font-serif text-sm sm:text-base text-[#121C2A] font-normal tracking-wide">
                          {formatVariantVolume(variant.size) || variant.colorName}
                        </span>
                        <span className="block font-serif text-xs sm:text-sm font-semibold text-[#121C2A] mt-0.5">
                          {formatPrice(variant.price)}
                        </span>
                        <span
                          className={`block text-[10px] sm:text-[11px] font-sans mt-0.5 ${
                            sub.isHighlight ? 'text-[#B68D40] font-medium' : 'text-[#8C8270]'
                          }`}
                        >
                          {sub.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Promotions Banner */}
            {renderPromoBanner()}

            {/* Quantity Stepper + Add to Bag + Wishlist Row (Matching Reference) */}
            <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
              {/* Pill-Shaped Stepper */}
              <div className="flex items-center justify-between border border-[#E8E2D5] rounded-full h-12 sm:h-13 w-28 sm:w-32 bg-white px-1.5 shrink-0 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={Boolean(quantity <= 1 || (selectedVariant && selectedVariant.stock === 0))}
                  className="w-8 h-8 rounded-full bg-[#F5F2EB] hover:bg-[#ECE7DC] flex items-center justify-center text-[#121C2A] disabled:opacity-30 cursor-pointer transition-colors focus:outline-none"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="font-serif font-semibold text-sm sm:text-base text-[#121C2A] select-none px-2">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) =>
                      Math.min(selectedVariant?.stock ? Math.min(10, selectedVariant.stock) : 10, q + 1)
                    )
                  }
                  disabled={
                    !selectedVariant ||
                    selectedVariant.stock === 0 ||
                    quantity >= (selectedVariant.stock || 10)
                  }
                  className="w-8 h-8 rounded-full bg-[#F5F2EB] hover:bg-[#ECE7DC] flex items-center justify-center text-[#121C2A] disabled:opacity-30 cursor-pointer transition-colors focus:outline-none"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Add to Bag CTA with Gold Shopping Bag */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedVariant || selectedVariant.stock === 0}
                className="flex-1 h-12 sm:h-13 bg-[#0B1424] hover:bg-[#152238] text-white rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-[13px] uppercase tracking-[0.18em] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C8A55E]"
              >
                <ShoppingBag className="w-4 h-4 text-[#C8A55E] shrink-0 stroke-[2]" />
                <span>
                  {selectedVariant && selectedVariant.stock > 0 ? 'ADD TO BAG' : 'OUT OF STOCK'}
                </span>
              </button>

              {/* Circular Wishlist Button */}
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={!selectedVariant}
                className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all bg-white shrink-0 shadow-3xs cursor-pointer ${
                  selectedVariant && isInWishlist(selectedVariant.id.toString())
                    ? 'border-2 border-[#C8A55E] text-[#C8A55E] bg-[#FAF7F0]'
                    : 'border border-[#E8E2D5] text-[#121C2A] hover:border-[#C8A55E] hover:text-[#C8A55E]'
                }`}
                aria-label={
                  selectedVariant && isInWishlist(selectedVariant.id.toString())
                    ? 'Remove from wishlist'
                    : 'Add to wishlist'
                }
              >
                <Heart
                  className={`w-5 h-5 ${
                    selectedVariant && isInWishlist(selectedVariant.id.toString())
                      ? 'fill-[#C8A55E] text-[#C8A55E]'
                      : 'text-[#121C2A]'
                  }`}
                />
              </button>

              {/* Circular Share Button */}
              <button
                type="button"
                onClick={handleShare}
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all bg-white shrink-0 shadow-3xs cursor-pointer border border-[#E8E2D5] text-[#121C2A] hover:border-[#C8A55E] hover:text-[#C8A55E] focus:outline-none focus:ring-2 focus:ring-[#C8A55E]"
                aria-label="Share this fragrance"
                title="Share this fragrance"
              >
                <Share2 className="w-5 h-5 transition-colors" />
              </button>
            </div>

            {/* Instant Checkout with UPI CTA (Matching Reference) */}
            <button
              type="button"
              onClick={handleInstantCheckout}
              disabled={!selectedVariant || selectedVariant.stock === 0}
              className="w-full h-12 sm:h-13 border border-[#B68D40] bg-white hover:bg-[#FAF7F0] text-[#B68D40] rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-[13px] tracking-[0.18em] uppercase transition-all shadow-3xs cursor-pointer mb-6 flex items-center justify-center gap-2.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {/* 4-Lobed Clover / UPI Symbol */}
              <svg
                className="w-4 h-4 text-[#B68D40] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="8" r="3.5" />
                <circle cx="16" cy="8" r="3.5" />
                <circle cx="8" cy="16" r="3.5" />
                <circle cx="16" cy="16" r="3.5" />
              </svg>
              <span>INSTANT CHECKOUT WITH UPI</span>
              <ArrowRight className="w-4 h-4 text-[#B68D40] shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Elegant Divider with Centered Gold Diamond */}
            <div className="flex items-center justify-center gap-3 my-5 sm:my-6">
              <span className="flex-1 h-px bg-[#E4DCC8]/60" />
              <span className="text-[#C8A55E] text-[10px]">✦</span>
              <span className="flex-1 h-px bg-[#E4DCC8]/60" />
            </div>

            {/* Trust Badges: 2 Rows with Inline Separator Pipes */}
            <div className="space-y-2.5 text-xs text-[#5A6578]">
              <div className="flex items-center justify-between sm:justify-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#B68D40] shrink-0 stroke-[2.5]" />
                  <span>100% Pure Attar Oil</span>
                </div>
                <span className="w-px h-3.5 bg-[#E4DCC8]" />
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#B68D40] shrink-0 stroke-[2]" />
                  <span>Encrypted Checkout</span>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#B68D40] shrink-0 stroke-[2]" />
                  <span>Express Delivery (2-4 Days)</span>
                </div>
                <span className="w-px h-3.5 bg-[#E4DCC8]" />
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-[#B68D40] shrink-0 stroke-[2]" />
                  <span>Artisanal Packaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Artisanal Quote Transition Banner (from Image 2) */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="w-10 h-px bg-[#C8A55E]/40" />
          <span className="text-[#C8A55E] text-xs">✦</span>
          <span className="w-10 h-px bg-[#C8A55E]/40" />
        </div>
        <blockquote className="font-serif italic text-xl sm:text-2xl text-[#121C2A] leading-relaxed mb-3">
          &ldquo;In traditional oriental perfumery, an attar is not merely applied; it becomes an
          intimate aura that weaves with your skin&apos;s natural warmth.&rdquo;
        </blockquote>
        <p className="text-[10px] tracking-[0.25em] text-[#8C8270] uppercase font-medium">
          HANDCRAFTED IN LIMITED NUMBERED BATCHES USING ANCIENT COPPER DEG-BAPKA HYDRO-DISTILLATION
        </p>
      </section>

      {/* SECTION 3: Customer Reviews (from Image 2) */}
      {product && (
        <section
          ref={reviewsRef}
          className={`max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 reveal ${
            reviewsInView ? 'in-view' : ''
          }`}
        >
          <ReviewList productId={product.id} productName={product.name} />
        </section>
      )}

      {/* SECTION 4: Similar Fragrances */}
      {product && (
        <section
          ref={relatedRef}
          className={`max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-20 reveal ${
            relatedInView ? 'in-view' : ''
          }`}
        >
          <RelatedProducts productId={product.id} />
        </section>
      )}

      {/* Mobile Floating Sticky CTA */}
      {product && selectedVariant && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F0]/95 backdrop-blur-md border-t border-[#E4DCC8] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-serif text-[#121C2A] truncate font-medium">{product.name}</p>
            <p className="text-sm font-semibold text-[#121C2A]">
              {formatPrice(selectedVariant.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={selectedVariant.stock === 0}
            className="px-5 py-2.5 bg-[#0B1424] text-white rounded-xl font-semibold text-xs uppercase tracking-wider hover:bg-[#152238] active:scale-95 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 shrink-0 min-h-[44px] min-w-[44px] justify-center cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#C8A55E]" />
            <span>{selectedVariant.stock > 0 ? 'Add to Bag' : 'Sold Out'}</span>
          </button>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </main>
  );
};

export const Product = ProductPage;
