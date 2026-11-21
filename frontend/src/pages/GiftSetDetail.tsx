import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Package,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Check,
  AlertCircle,
  ArrowLeft,
  Plus,
  Minus,
  ArrowRight,
  Gift,
  Award,
  Share2,
} from 'lucide-react';
import { giftSetService } from '../services/giftSetService';
import type { GiftSet, GiftSetImage } from '../types/giftSet';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/formatPrice';
import { getImageUrl } from '../utils/getImageUrl';
import { sanitizeText } from '../utils/textUtils';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { SEO } from '../components/seo/SEO';
import { GiftSetCard } from '../components/giftset/GiftSetCard';
import { ShareModal } from '../components/ui/ShareModal';

export const GiftSetDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();

  const [giftSet, setGiftSet] = useState<GiftSet | null>(null);
  const [relatedSets, setRelatedSets] = useState<GiftSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [mainImageError, setMainImageError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchGiftSet = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        setError(null);
        setMainImageError(false);
        const data = await giftSetService.getGiftSetBySlug(slug);
        setGiftSet(data);

        // Determine initial active image
        const primary =
          data.primaryImageUrl ||
          data.images?.find((i: GiftSetImage) => i.isPrimary)?.imageUrl ||
          data.images?.[0]?.imageUrl ||
          data.items?.[0]?.productImage ||
          '';
        setActiveImage(primary);

        // Fetch related gift sets for the bottom carousel/grid
        giftSetService
          .getAllGiftSets()
          .then((allSets) => {
            const others = (allSets || []).filter((s) => s.slug !== slug);
            setRelatedSets(others.slice(0, 3));
          })
          .catch(console.error);
      } catch (err: any) {
        console.error('Failed to load gift set details', err);
        setError(
          'We could not find the requested gift set. It may have been archived or is temporarily unavailable.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchGiftSet();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] bg-[#FBF9F5] flex items-center justify-center py-24">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-[#C8A55E] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-serif text-sm tracking-[0.25em] uppercase text-[#121C2A]/70">
            Unveiling Gift Collection…
          </p>
        </div>
      </div>
    );
  }

  if (error || !giftSet) {
    return (
      <div className="w-full min-h-[70vh] bg-[#FBF9F5] flex items-center justify-center px-4 py-24">
        <div className="max-w-md w-full bg-white border border-[#E4DCC8] rounded-2xl p-8 text-center shadow-xs">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 stroke-[1.5]" />
          <h1 className="font-serif text-2xl text-[#121C2A] mb-2">Gift Set Not Found</h1>
          <p className="text-xs text-[#5A6578] mb-6 leading-relaxed">
            {error || 'This gift set is not available in our current boutique collection.'}
          </p>
          <Link
            to="/gift-sets"
            className="inline-flex items-center gap-2 bg-[#121C2A] text-white px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#C8A55E] hover:text-[#121C2A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to All Gift Sets</span>
          </Link>
        </div>
      </div>
    );
  }

  // Authoritative Pricing & Stock
  const hasSale =
    giftSet.salePrice !== null &&
    giftSet.salePrice !== undefined &&
    Number(giftSet.salePrice) < Number(giftSet.price);
  const currentPrice = hasSale ? Number(giftSet.salePrice) : Number(giftSet.price);
  const originalPrice = hasSale ? Number(giftSet.price) : null;
  const discountPercent = hasSale
    ? Math.round(((Number(giftSet.price) - currentPrice) / Number(giftSet.price)) * 100)
    : 0;

  const isOutOfStock = !giftSet.inStock || giftSet.availableStock <= 0;
  const isLowStock = !isOutOfStock && giftSet.availableStock > 0 && giftSet.availableStock <= 5;
  const maxAvailable = Math.min(10, Math.max(1, giftSet.availableStock || 1));

  // Collect all available gallery images
  const allImages: string[] = [];
  if (giftSet.primaryImageUrl) allImages.push(giftSet.primaryImageUrl);
  if (giftSet.images && giftSet.images.length > 0) {
    giftSet.images.forEach((img) => {
      if (img.imageUrl && !allImages.includes(img.imageUrl)) {
        allImages.push(img.imageUrl);
      }
    });
  }
  if (giftSet.items) {
    giftSet.items.forEach((it) => {
      if (it.productImage && !allImages.includes(it.productImage)) {
        allImages.push(it.productImage);
      }
    });
  }

  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);

    try {
      await addItem({
        id: '',
        name: giftSet.name,
        originalPrice: Number(giftSet.price),
        finalPrice: currentPrice,
        quantity: quantity,
        image: activeImage || allImages[0] || '',
        isGiftSet: true,
        giftSetId: giftSet.id,
        giftSetName: giftSet.name,
        includedItems: giftSet.items?.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.productName,
          variantId: it.variantId,
          variantSize: it.variantSize,
          sku: it.sku,
          quantity: it.quantity,
        })),
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const giftSetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: giftSet.name,
    description: giftSet.description || 'Curated luxury fragrance gift set by Al Ahad Attars.',
    image: allImages.length > 0 ? getImageUrl(allImages[0]) : 'https://alahadattars.com/og-image.jpg',
    brand: {
      '@type': 'Brand',
      name: 'Al Ahad Attars',
    },
    offers: {
      '@type': 'Offer',
      price: currentPrice,
      priceCurrency: 'INR',
      availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `https://alahadattars.com/gift-sets/${giftSet.slug}`,
    },
  };

  return (
    <main className="w-full min-h-screen bg-[#FBF9F5] pb-24">
      <SEO
        title={`${giftSet.name} — Curated Gift Set | Al Ahad Attars`}
        description={
          giftSet.description ||
          `Experience ${giftSet.name}, a curated fragrance set in luxury presentation packaging.`
        }
        canonicalUrl={`/gift-sets/${giftSet.slug}`}
        type="product"
        imageUrl={allImages.length > 0 ? getImageUrl(allImages[0]) : undefined}
        schema={giftSetSchema}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={giftSet ? giftSet.name : 'Bespoke Discovery Set'}
        text={
          giftSet?.description?.substring(0, 150) ||
          `Discover the ${giftSet?.name || 'luxury gift set'} curated by Al Ahad Attars`
        }
        imageUrl={activeImage ? getImageUrl(activeImage) : undefined}
      />

      {/* Top Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-3">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Gift Sets', href: '/gift-sets' },
            { label: giftSet.name },
          ]}
        />
      </div>

      {/* Section 1: Main Product Layout (Desktop Two-Column / Mobile Single Column) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* Left Column: Image Gallery */}
          <div className="flex flex-col gap-4 lg:col-span-6 w-full max-w-[600px] mx-auto lg:mx-0">
            {/* Main Image Frame */}
            <div className="w-full aspect-[4/5] sm:aspect-square max-h-[580px] rounded-2xl overflow-hidden bg-[#F7F4EE] border border-[#E4DCC8] shadow-xs relative flex items-center justify-center group">
              {activeImage && !mainImageError ? (
                <img
                  src={getImageUrl(activeImage)}
                  alt={giftSet.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103 select-none"
                  onError={() => setMainImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#F7F4EE]">
                  <div className="w-20 h-20 rounded-full bg-[#C8A55E]/10 border border-[#C8A55E]/30 flex items-center justify-center text-[#C8A55E] mb-4">
                    <Package className="w-10 h-10 stroke-[1.2]" />
                  </div>
                  <span className="font-serif text-sm tracking-[0.2em] uppercase text-[#121C2A]/60 font-medium">
                    Artisanal Presentation
                  </span>
                </div>
              )}

              {/* Floating Luxury Badges */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
                <span className="bg-[#121C2A] text-[#C8A55E] text-[10px] font-semibold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full border border-[#C8A55E]/40 shadow-xs backdrop-blur-xs">
                  Bespoke Discovery Set
                </span>
                {hasSale && (
                  <span className="bg-[#C8A55E] text-[#121C2A] text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1 rounded-full shadow-xs">
                    Save {discountPercent}%
                  </span>
                )}
              </div>

              {/* Out of Stock Overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-[#FBF9F5]/85 backdrop-blur-[2px] flex items-center justify-center z-20">
                  <span className="bg-[#121C2A] text-white text-xs font-semibold uppercase tracking-[0.25em] px-6 py-2.5 rounded-full shadow-md">
                    Temporarily Sold Out
                  </span>
                </div>
              )}
            </div>

            {/* Supporting Gallery Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 pt-1 hide-scrollbar">
                {allImages.map((imgUrl, idx) => {
                  const isSelected = activeImage === imgUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveImage(imgUrl);
                        setMainImageError(false);
                      }}
                      className={`shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-[#F7F4EE] transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-[#C8A55E] border-transparent shadow-xs scale-102'
                          : 'border border-[#E4DCC8] hover:border-[#C8A55E]/70 opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`View set image ${idx + 1}`}
                    >
                      <img
                        src={getImageUrl(imgUrl)}
                        alt={`${giftSet.name} thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Product Information & Purchase Controls */}
          <div className="flex flex-col lg:col-span-6 justify-start">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C8A55E]" />
              <span className="text-[#C8A55E] text-xs font-semibold uppercase tracking-[0.22em]">
                Curated Collection • {giftSet.items?.length || 0} Flacons Included
              </span>
            </div>

            {/* Set Name */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#121C2A] font-normal tracking-tight mb-3 leading-[1.15]">
              {sanitizeText(giftSet.name)}
            </h1>

            {/* Price Section */}
            <div className="flex flex-wrap items-baseline gap-3 mb-4 pb-4 border-b border-[#E4DCC8]">
              <span className="font-serif text-3xl sm:text-4xl text-[#121C2A] font-semibold">
                {formatPrice(currentPrice)}
              </span>
              {originalPrice && (
                <span className="font-serif text-xl sm:text-2xl text-[#8A8171] line-through font-light">
                  {formatPrice(originalPrice)}
                </span>
              )}
              {hasSale && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#C8A55E]/15 text-[#121C2A] border border-[#C8A55E]/30">
                  Save {formatPrice(Number(originalPrice) - currentPrice)} ({discountPercent}% OFF)
                </span>
              )}
              <div className="w-full text-xs text-[#5A6578] font-light mt-1">
                Inclusive of all taxes • Complimentary signature gift packaging included
              </div>
            </div>

            {/* Availability Indicator (Authoritative Backend Stock) */}
            <div className="mb-6">
              {isOutOfStock ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs uppercase tracking-wider font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Sold Out — Component stock temporarily depleted
                </div>
              ) : isLowStock ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs uppercase tracking-wider font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Low Stock — Only {giftSet.availableStock} sets remaining
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs uppercase tracking-wider font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  In Stock ({giftSet.availableStock} curated sets available)
                </div>
              )}
            </div>

            {/* Description */}
            {giftSet.description && (
              <p className="text-sm sm:text-base text-[#5A6578] mb-6 leading-relaxed font-light whitespace-pre-line">
                {giftSet.description}
              </p>
            )}

            {/* Quick Scent & Presentation Specs */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3.5 rounded-xl bg-white border border-[#E4DCC8]/70 mb-6 text-center">
              <div className="border-r border-[#E4DCC8]/60 pr-2">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8171] font-medium block">
                  Presentation
                </span>
                <span className="text-xs font-semibold text-[#121C2A] mt-0.5 block truncate">
                  Keepsake Box
                </span>
              </div>
              <div className="border-r border-[#E4DCC8]/60 px-2">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8171] font-medium block">
                  Formulation
                </span>
                <span className="text-xs font-semibold text-[#121C2A] mt-0.5 block truncate">
                  100% Pure Attar
                </span>
              </div>
              <div className="pl-2">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8171] font-medium block">
                  Alcohol
                </span>
                <span className="text-xs font-semibold text-[#121C2A] mt-0.5 block truncate">
                  Zero Alcohol
                </span>
              </div>
            </div>

            {/* Quantity Stepper & Add to Bag CTA */}
            <div className="space-y-4 pt-4 border-t border-[#E4DCC8]">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                {/* Stepper with 44px hitboxes */}
                <div className="flex items-center justify-between border border-[#E4DCC8] rounded-full h-12 w-full sm:w-36 bg-white px-0.5 shrink-0 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#121C2A] hover:text-[#C8A55E] disabled:opacity-30 cursor-pointer rounded-full transition-colors focus:outline-none"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-center font-serif font-medium text-sm text-[#121C2A] select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                    disabled={quantity >= maxAvailable || isOutOfStock}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#121C2A] hover:text-[#C8A55E] disabled:opacity-30 cursor-pointer rounded-full transition-colors focus:outline-none"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Add to Bag CTA */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAdding}
                  className="flex-1 h-12 bg-[#121C2A] hover:bg-[#1E2D42] text-white rounded-full font-medium text-xs sm:text-sm uppercase tracking-[0.16em] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C8A55E]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isOutOfStock
                      ? 'Currently Sold Out'
                      : isAdding
                      ? 'Adding to Bag…'
                      : 'Add Gift Set to Bag'}
                  </span>
                </button>

                {/* Circular Share Button */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white shrink-0 shadow-2xs cursor-pointer border border-[#E4DCC8] text-[#121C2A] hover:border-[#C8A55E] hover:text-[#C8A55E] focus:outline-none focus:ring-2 focus:ring-[#C8A55E]"
                  aria-label="Share this gift set"
                  title="Share this gift set"
                >
                  <Share2 className="w-4 h-4 transition-colors" />
                </button>
              </div>

              {/* Trust Pillars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-5 text-[10px] sm:text-[11px] uppercase tracking-wider text-[#5A6578] font-medium border-t border-[#E4DCC8]/60">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#C8A55E] shrink-0" />
                  <span>Master Artisans</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C8A55E] shrink-0" />
                  <span>100% Pure Attars</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#C8A55E] shrink-0" />
                  <span>Insured Delivery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-[#C8A55E] shrink-0" />
                  <span>Keepsake Box</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: "What's Inside This Gift Set" (Editorial Grid Showcase) */}
      <section className="bg-white border-y border-[#E4DCC8]/70 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 text-[#C8A55E] text-xs font-semibold tracking-[0.2em] uppercase mb-2">
              <span className="w-6 h-px bg-[#C8A55E]" />
              <span>The Curated Collection</span>
              <span className="w-6 h-px bg-[#C8A55E]" />
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#121C2A] font-normal tracking-tight mb-3">
              What&apos;s Inside This Gift Set
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6578] font-light leading-relaxed">
              Every miniature flacon is filled with pure, highly concentrated attar oil, carefully aged
              and hand-blended in small batches.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {giftSet.items && giftSet.items.length > 0 ? (
              giftSet.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-2xl bg-[#FBF9F5] border border-[#E4DCC8]/80 p-5 sm:p-6 flex flex-col justify-between hover:border-[#C8A55E] hover:shadow-xs transition-all group"
                >
                  <div>
                    {/* Bottle Media Frame */}
                    <div className="w-full aspect-square rounded-xl bg-[#F7F4EE] border border-[#E4DCC8]/50 overflow-hidden relative mb-4">
                      {item.productImage ? (
                        <img
                          src={getImageUrl(item.productImage)}
                          alt={item.productName}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full flex items-center justify-center bg-[#F7F4EE] ${
                          item.productImage ? 'hidden' : ''
                        }`}
                      >
                        <Package className="w-10 h-10 text-[#C8A55E]/40" />
                      </div>
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full bg-[#121C2A]/90 text-white text-[10px] font-semibold uppercase tracking-wider backdrop-blur-xs">
                          {item.quantity} × {item.variantSize || '6ml'}
                        </span>
                      </div>
                    </div>

                    {/* Scent Info */}
                    <div className="mb-4">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C8A55E] block mb-1">
                        Artisanal Flacon
                      </span>
                      <h3 className="font-serif text-lg sm:text-xl text-[#121C2A] group-hover:text-[#C8A55E] transition-colors font-medium mb-1.5">
                        {item.productName}
                      </h3>
                      <p className="text-xs text-[#5A6578] font-light leading-relaxed">
                        Hand-blended pure concentrated perfume oil, extracted from choice natural botanicals
                        and precious essences.
                      </p>
                    </div>
                  </div>

                  {/* Standalone product link */}
                  {item.productId && (
                    <Link
                      to={`/product/${item.productId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#121C2A] group-hover:text-[#C8A55E] transition-colors pt-3 border-t border-[#E4DCC8]/60 mt-auto"
                    >
                      <span>Explore Fragrance Details</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-[#5A6578]">
                <Package className="w-8 h-8 text-[#8A8171]/40 mx-auto mb-2" />
                <p className="text-xs uppercase tracking-wider">Components information pending.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Packaging and Presentation Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="rounded-3xl bg-[#F5F1E8]/70 border border-[#E4DCC8] p-6 sm:p-10 lg:p-12 relative overflow-hidden">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 text-[#C8A55E] text-xs font-semibold tracking-[0.2em] uppercase mb-2">
              <span className="w-6 h-px bg-[#C8A55E]" />
              <span>Signature Unboxing</span>
              <span className="w-6 h-px bg-[#C8A55E]" />
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#121C2A] font-normal tracking-tight mb-3">
              Artisanal Presentation & Keepsake Packaging
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6578] font-light leading-relaxed">
              {giftSet.packagingNotes ||
                'Encased in a handcrafted midnight navy presentation box lined with crushed velvet. Features individual slots and an embossed gold foil Al Ahad emblem.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-xl bg-white p-5 border border-[#E4DCC8]/70 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#F7F4EE] border border-[#C8A55E]/30 flex items-center justify-center text-[#C8A55E] mb-3">
                <Package className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-sm font-semibold text-[#121C2A] mb-1">
                Rigid Keepsake Box
              </h3>
              <p className="text-xs text-[#5A6578] font-light leading-relaxed">
                Handcrafted heavy-density presentation box with debossed gold emblem and durable magnetic closure.
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 border border-[#E4DCC8]/70 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#F7F4EE] border border-[#C8A55E]/30 flex items-center justify-center text-[#C8A55E] mb-3">
                <Sparkles className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-sm font-semibold text-[#121C2A] mb-1">
                Velvet Flacon Cradles
              </h3>
              <p className="text-xs text-[#5A6578] font-light leading-relaxed">
                Precision die-cut velvet slots securely cradle each miniature bottle, preventing friction and shock.
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 border border-[#E4DCC8]/70 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#F7F4EE] border border-[#C8A55E]/30 flex items-center justify-center text-[#C8A55E] mb-3">
                <Award className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-sm font-semibold text-[#121C2A] mb-1">
                Artisanal Certificate
              </h3>
              <p className="text-xs text-[#5A6578] font-light leading-relaxed">
                Accompanied by an olfactory guide detailing the notes, origins, and traditional blending philosophy.
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 border border-[#E4DCC8]/70 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#F7F4EE] border border-[#C8A55E]/30 flex items-center justify-center text-[#C8A55E] mb-3">
                <Gift className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-sm font-semibold text-[#121C2A] mb-1">
                Ready to Bestow
              </h3>
              <p className="text-xs text-[#5A6578] font-light leading-relaxed">
                Finished with a luxurious grosgrain ribbon, ideal for weddings, anniversaries, and distinguished gifting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Related Gift Sets */}
      {relatedSets.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between pb-4 mb-8 border-b border-[#E4DCC8]">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C8A55E] block mb-1">
                More To Explore
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#121C2A] font-normal tracking-tight">
                Curated Gift Collections
              </h2>
            </div>
            <Link
              to="/gift-sets"
              className="text-xs font-semibold uppercase tracking-wider text-[#121C2A] hover:text-[#C8A55E] transition-colors flex items-center gap-1.5"
            >
              <span>View All Sets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {relatedSets.map((set) => (
              <GiftSetCard key={set.id} giftSet={set} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-t border-[#E4DCC8] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-serif text-[#121C2A] truncate font-medium">{giftSet.name}</p>
          <p className="text-sm font-semibold text-[#121C2A]">{formatPrice(currentPrice)}</p>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className="px-5 py-2.5 bg-[#121C2A] text-white rounded-full font-medium text-xs uppercase tracking-wider hover:bg-[#C8A55E] hover:text-[#121C2A] active:scale-95 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isOutOfStock ? 'Sold Out' : isAdding ? 'Adding…' : 'Add to Bag'}</span>
        </button>
      </div>
    </main>
  );
};
