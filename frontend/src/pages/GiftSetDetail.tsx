import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, Package, ShoppingBag, ShieldCheck, Truck, Check, AlertCircle, ArrowLeft, Plus, Minus, ExternalLink } from 'lucide-react';
import { giftSetService } from '../services/giftSetService';
import type { GiftSet, GiftSetImage } from '../types/giftSet';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/formatPrice';
import { getImageUrl } from '../utils/getImageUrl';
import { sanitizeText } from '../utils/textUtils';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { SEO } from '../components/seo/SEO';

export const GiftSetDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();

  const [giftSet, setGiftSet] = useState<GiftSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchGiftSet = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        setError(null);
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
      } catch (err: any) {
        console.error('Failed to load gift set details', err);
        setError('We could not find the requested gift set. It may have been archived or is temporarily unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchGiftSet();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] bg-[#fbf9f5] flex items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-3 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-serif text-sm tracking-widest uppercase text-ink/70">Unveiling Gift Collection…</p>
        </div>
      </div>
    );
  }

  if (error || !giftSet) {
    return (
      <div className="w-full min-h-[70vh] bg-[#fbf9f5] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-white border border-[#e4dcc8] rounded-[2px] p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 stroke-[1.5]" />
          <h1 className="font-serif text-2xl text-ink mb-2">Gift Set Not Found</h1>
          <p className="text-xs text-ink/70 mb-6 leading-relaxed">
            {error || 'This gift set is not available in our current boutique collection.'}
          </p>
          <Link
            to="/gift-sets"
            className="inline-flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-[2px] text-xs font-semibold uppercase tracking-wider hover:bg-accent hover:text-ink transition-colors"
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
  const discountPercent = hasSale ? Math.round(((Number(giftSet.price) - currentPrice) / Number(giftSet.price)) * 100) : 0;

  const isOutOfStock = !giftSet.inStock || giftSet.availableStock <= 0;
  const isLowStock = !isOutOfStock && giftSet.availableStock > 0 && giftSet.availableStock <= 5;
  const maxAvailable = Math.min(10, Math.max(1, giftSet.availableStock || 1));

  // Images list
  const allImages: string[] = [];
  if (giftSet.primaryImageUrl) allImages.push(giftSet.primaryImageUrl);
  if (giftSet.images && giftSet.images.length > 0) {
    giftSet.images.forEach(img => {
      if (img.imageUrl && !allImages.includes(img.imageUrl)) {
        allImages.push(img.imageUrl);
      }
    });
  }
  // If no uploaded gift set images, fallback to included items images
  if (allImages.length === 0 && giftSet.items) {
    giftSet.items.forEach(it => {
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
    } finally {
      setIsAdding(false);
    }
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
    <main className="w-full min-h-screen bg-[#fbf9f5] pb-24">
      <SEO
        title={`${giftSet.name} — Curated Gift Set | Al Ahad Attars`}
        description={giftSet.description || `Experience ${giftSet.name}, a curated fragrance set in luxury presentation packaging.`}
        canonicalUrl={`/gift-sets/${giftSet.slug}`}
        type="product"
        imageUrl={allImages.length > 0 ? getImageUrl(allImages[0]) : undefined}
        schema={giftSetSchema}
      />

      {/* Top Breadcrumbs */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-2">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Gift Sets', href: '/gift-sets' },
            { label: giftSet.name },
          ]}
        />
      </div>

      {/* Main Grid: Gallery & Information */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
          {/* Left Column: Image Gallery */}
          <div className="flex flex-col md:flex-row gap-4 lg:col-span-6 w-full max-w-[560px] mx-auto lg:mx-0">
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="order-2 md:order-1 flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 md:pr-1 hide-scrollbar w-full md:w-[72px] shrink-0">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(imgUrl)}
                    className={`shrink-0 w-[64px] h-[64px] md:w-[68px] md:h-[68px] rounded-[2px] overflow-hidden border bg-white transition-all duration-200 cursor-pointer ${
                      activeImage === imgUrl ? 'border-accent shadow-xs ring-1 ring-accent' : 'border-[#e4dcc8] hover:border-accent/60'
                    }`}
                    aria-label={`View set image ${idx + 1}`}
                  >
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={`${giftSet.name} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image Frame */}
            <div className="order-1 md:order-2 w-full aspect-square max-h-[580px] rounded-[2px] overflow-hidden bg-white border border-[#e4dcc8] shadow-xs relative flex items-center justify-center group">
              {activeImage ? (
                <img
                  src={getImageUrl(activeImage)}
                  alt={giftSet.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-104 select-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#f8f5ec]">
                  <Package className="w-16 h-16 text-accent/60 mb-3 stroke-[1.2]" />
                  <span className="text-xs uppercase tracking-[0.25em] text-ink/50 font-medium">Bespoke Gift Set</span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
                <span className="bg-accent text-ink text-[10px] font-semibold uppercase tracking-[0.2em] px-3 py-1 rounded-[1px] shadow-sm">
                  Curated Gift Set
                </span>
                {hasSale && (
                  <span className="bg-ink text-accent text-[10px] font-semibold uppercase tracking-[0.2em] px-3 py-1 rounded-[1px] shadow-sm">
                    Special Offer — Save {discountPercent}%
                  </span>
                )}
              </div>

              {/* Sold out overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <span className="bg-ink/90 text-white text-xs font-semibold uppercase tracking-[0.25em] px-6 py-2 rounded-[1px]">
                    Currently Sold Out
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Gift Set Details */}
          <div className="flex flex-col lg:col-span-6 justify-start">
            {/* Category / Eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-accent text-[11px] font-semibold uppercase tracking-[0.25em]">
                {giftSet.items?.length || 0} Fragrances • Curated Collection
              </span>
            </div>

            {/* Set Name */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-ink font-normal tracking-tight mb-4 leading-tight">
              {sanitizeText(giftSet.name)}
            </h1>

            {/* Price Section */}
            <div className="flex items-baseline gap-3 mb-4 pb-4 border-b border-[#e4dcc8]">
              {originalPrice && (
                <span className="font-serif text-xl sm:text-2xl text-ink/45 line-through font-light">
                  {formatPrice(originalPrice)}
                </span>
              )}
              <span className="font-serif text-3xl sm:text-4xl text-ink font-semibold">
                {formatPrice(currentPrice)}
              </span>
              <span className="text-[11px] text-ink/60 uppercase tracking-wider ml-1">
                Taxes included
              </span>
            </div>

            {/* Availability Indicator (Backend Authoritative) */}
            <div className="mb-6">
              {isOutOfStock ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[1px] bg-red-50 text-red-700 border border-red-200 text-xs uppercase tracking-wider font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Sold Out — Component stock temporarily depleted
                </div>
              ) : isLowStock ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[1px] bg-amber-50 text-amber-800 border border-amber-200 text-xs uppercase tracking-wider font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Low Stock — Only {giftSet.availableStock} gift sets remaining
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[1px] bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs uppercase tracking-wider font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  In Stock ({giftSet.availableStock} sets available)
                </div>
              )}
            </div>

            {/* Description */}
            {giftSet.description && (
              <p className="text-sm sm:text-base text-ink/80 mb-6 leading-relaxed font-light whitespace-pre-line">
                {giftSet.description}
              </p>
            )}

            {/* Packaging Highlights Box */}
            <div className="bg-[#f5f1e8]/70 border border-[#e4dcc8] rounded-[2px] p-4 sm:p-5 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#fbf9f5] border border-accent/40 flex items-center justify-center shrink-0 text-accent">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif text-sm text-ink font-semibold tracking-wide uppercase mb-1">
                    Signature Gift Presentation
                  </h4>
                  <p className="text-xs text-ink/75 leading-relaxed font-light">
                    {giftSet.packagingNotes ||
                      'Encased within our signature rigid presentation box lined with velvet inserts. Finished with satin ribbon and an embossed Al Ahad seal, ready for memorable gifting.'}
                  </p>
                </div>
              </div>
            </div>

            {/* What's Inside Breakdown Section */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>What's Included in This Set ({giftSet.items?.length || 0} Fragrances)</span>
              </h3>

              <div className="space-y-2.5">
                {giftSet.items && giftSet.items.length > 0 ? (
                  giftSet.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-white border border-[#e4dcc8] rounded-[2px] p-3 sm:p-4 flex items-center justify-between gap-4 transition-colors hover:border-accent/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-[1px] bg-[#f5f1e8] border border-[#e4dcc8] overflow-hidden shrink-0">
                          {item.productImage ? (
                            <img
                              src={getImageUrl(item.productImage)}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-accent/60" />
                            </div>
                          )}
                        </div>

                        {/* Title and details */}
                        <div className="min-w-0">
                          <h4 className="font-serif text-sm text-ink font-medium truncate">
                            {item.productName}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-ink/60 mt-0.5">
                            <span className="font-medium text-ink/80">{item.variantSize}</span>
                            <span>•</span>
                            <span>Quantity: {item.quantity}</span>
                          </div>
                        </div>
                      </div>

                      {/* Link to view standalone product */}
                      {item.productId && (
                        <Link
                          to={`/product/${item.productId}`}
                          className="shrink-0 text-[10px] uppercase tracking-wider text-accent hover:text-ink flex items-center gap-1 font-semibold"
                          title="View individual fragrance"
                        >
                          <span className="hidden sm:inline">Explore Scent</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ink/60 italic">Components information pending.</p>
                )}
              </div>
            </div>

            {/* Quantity Selector & Add to Bag CTA */}
            <div className="space-y-4 pt-4 border-t border-[#e4dcc8]">
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                {/* Stepper */}
                <div className="flex items-center border border-[#e4dcc8] rounded-[2px] h-[52px] bg-white shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-12 h-full flex items-center justify-center text-ink/70 hover:text-ink disabled:opacity-30 cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-mono font-semibold text-sm text-ink select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => Math.min(maxAvailable, q + 1))}
                    disabled={quantity >= maxAvailable || isOutOfStock}
                    className="w-12 h-full flex items-center justify-center text-ink/70 hover:text-ink disabled:opacity-30 cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Add to Bag CTA */}
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAdding}
                  className="flex-1 h-[52px] bg-ink text-white rounded-[2px] font-semibold text-xs uppercase tracking-[0.2em] hover:bg-accent hover:text-ink active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Currently Sold Out' : isAdding ? 'Adding to Bag…' : 'Add Gift Set to Bag'}</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-[10px] sm:text-[11px] uppercase tracking-wider text-ink/65 font-medium border-t border-[#e4dcc8]/60">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Curated by Master Artisans</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>100% Authentic Attars</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Carefully Packaged</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Ready to Gift</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Sticky Bottom CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fbf9f5]/95 backdrop-blur-md border-t border-[#e4dcc8] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-serif text-ink truncate font-medium">{giftSet.name}</p>
          <p className="text-sm font-semibold text-ink">{formatPrice(currentPrice)}</p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className="px-5 py-2.5 bg-ink text-white rounded-[2px] font-semibold text-xs uppercase tracking-wider hover:bg-accent hover:text-ink active:scale-95 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isOutOfStock ? 'Sold Out' : isAdding ? 'Adding…' : 'Add to Bag'}</span>
        </button>
      </div>
    </main>
  );
};

