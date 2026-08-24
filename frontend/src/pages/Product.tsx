import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Loader } from '../components/ui/Loader';
import { productService } from '../services/productService';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { formatPrice } from '../utils/formatPrice';
import type { Product as ProductType, Variant } from '../types';
import { getImageUrl } from '../utils/getImageUrl';
import { usePromotions } from '../context/PromotionContext';
import { getPromoIcon, getDaysRemaining } from '../utils/promotionHelpers';
import { ReviewList } from '../components/reviews/ReviewList';
import { RelatedProducts } from '../components/reviews/RelatedProducts';
import { StarRating } from '../components/common/StarRating';
import { useInView } from '../hooks/useInView';
import { SEO } from '../components/seo/SEO';
import { BottleSelectionModal } from '../components/product/BottleSelectionModal';

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
          
          if (res.data.images && res.data.images.length > 0) {
            const primary = res.data.images.find((img: any) => img.isPrimary) || res.data.images[0];
            setMainImage(primary.imageUrl);
          }
          
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
            const initialVariants = res.data.variants.filter((v: Variant) => v.productType === initialType);
            setSelectedVariant(initialVariants.length > 0 ? initialVariants[0] : res.data.variants[0]);
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
  const isAttarCategory = product.category?.name?.toLowerCase().includes('attar');

  const sortedImages = [...(product.images || [])].sort((a, b) => a.displayOrder - b.displayOrder);
  const allImages = sortedImages.map(img => img.imageUrl);
  
  if (activeType === 'ATTAR' && isAttarCategory) {
    allImages.push(window.location.origin + '/attar-sizes.jpg');
  }

  const showTypeToggle = hasAttar && hasPerfume;
  const filteredVariants = (product.variants?.filter(v => v.productType === activeType) || [])
    .sort((a, b) => a.price - b.price);

  const handleVariantChange = (variant: Variant) => {
    setSelectedVariant(variant);
    // Note: In the new architecture, images are tied to Product, not Variant.
    // Changing variant size no longer changes the image.
  };
  
  const handleTypeChange = (type: string) => {
    setActiveType(type);
    const newVariants = product.variants?.filter(v => v.productType === type) || [];
    if (newVariants.length > 0) {
      setSelectedVariant(newVariants[0]);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    
    if (selectedVariant.productType === 'ATTAR') {
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
      size: selectedVariant.size,
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
        const categoryName = product.category.name.toLowerCase();
        if (categoryName.includes('attar') && activeType !== 'ATTAR') return false;
        if (categoryName.includes('perfume') && activeType !== 'PERFUME') return false;
        return true;
    }
    if (promo.promotionType === 'FREE_PRODUCT') {
      if (promo.configuration?.buyProductId && promo.configuration.buyProductId === product.id) return true;
      if (product.category?.id && promo.configuration?.buyCategoryId === product.category.id) return true;
      if (!promo.configuration?.buyProductId && !promo.configuration?.buyCategoryId) return true;
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-16">
        {/* Left Column: Image Gallery */}
        <div className="flex flex-col md:flex-row gap-4 lg:col-span-5 w-full max-w-[540px] mx-auto lg:mx-0">
          
          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 md:pr-2 hide-scrollbar w-full md:w-[76px] flex-shrink-0">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  className={`flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 bg-surface transition-all duration-200 hover:-translate-y-[1px] md:hover:-translate-y-0 md:hover:-translate-x-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${mainImage === img ? 'border-accent shadow-sm' : 'border-transparent hover:border-accent/50'}`}
                  onClick={() => setMainImage(img)}
                  aria-label={`View image ${idx + 1}`}
                  aria-current={mainImage === img}
                >
                  <img 
                    src={getImageUrl(img)} 
                    alt={`Thumbnail ${idx+1}`} 
                    className="w-full h-full object-cover" 
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Image */}
          <div className="order-1 md:order-2 w-full h-auto aspect-[4/5] max-h-[560px] rounded-2xl overflow-hidden bg-surface border border-outline-variant/50 shadow-[0_10px_30px_rgba(18,28,42,0.05)] relative group cursor-zoom-in flex items-center justify-center">
            {mainImage ? (
              <>
                <img 
                  src={getImageUrl(mainImage)} 
                  alt={product.name} 
                  className="w-full h-full object-contain p-4 md:p-[16px] lg:p-[20px] transition-transform duration-700 group-hover:scale-105" 
                />
              </>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                 <span className="material-symbols-outlined text-6xl">image</span>
               </div>
            )}
          </div>
        </div>

        {/* Right Column: Product Details */}
        <div className="flex flex-col lg:col-span-7">
          <div className="mb-6">
            <h1 className="font-headline-lg text-headline-lg text-primary mb-3 mt-1 lg:mt-0">{product.name}</h1>
            
            <div className="flex items-center space-x-4 mb-5">
              <div className="flex text-inverse-primary fill-icon">
                <StarRating rating={product.averageRating || 0} size={20} showText={false} />
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">({product.reviewCount || 0} Reviews)</span>
            </div>
            
            <div className="flex items-baseline space-x-4 mb-7">
              <span className="font-display-lg-mobile text-display-lg-mobile text-primary">{selectedVariant ? formatPrice(selectedVariant.price) : 'N/A'}</span>
            </div>
            
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-[85%] leading-relaxed">
              {product.description}
            </p>
            
            <div className="space-y-6">
                {showTypeToggle && (
                  <div className="mb-6">
                    <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-3">Select Type</h3>
                    <div className="inline-flex flex-wrap bg-surface-container-lowest border border-outline-variant/30 rounded-full p-1 max-w-full">
                      <button
                        onClick={() => handleTypeChange('ATTAR')}
                        className={`px-6 py-2 rounded-full font-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                          activeType === 'ATTAR' 
                            ? 'bg-accent-soft text-accent-hover' 
                            : 'text-on-surface-variant hover:text-accent'
                        }`}
                      >
                        Attar
                      </button>
                      <button
                        onClick={() => handleTypeChange('PERFUME')}
                        className={`px-6 py-2 rounded-full font-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                          activeType === 'PERFUME' 
                            ? 'bg-accent-soft text-accent-hover' 
                            : 'text-on-surface-variant hover:text-accent'
                        }`}
                      >
                        Perfume
                      </button>
                    </div>
                  </div>
                )}

              {product.category?.name === 'Bakhoor' || filteredVariants.length === 1 ? (
                <div>
                  <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-3">Weight</h3>
                  <div className="px-6 py-3 border border-outline-variant rounded-DEFAULT font-label-md text-label-md text-on-surface inline-block bg-surface-bright">
                    {filteredVariants[0]?.size} Pack
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-3">Select Size</h3>
                  <div className="flex flex-wrap gap-4">
                    {filteredVariants.map((variant) => (
                      <label key={variant.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="size"
                          className="peer sr-only variant-radio"
                          checked={selectedVariant?.id === variant.id}
                          onChange={() => handleVariantChange(variant)}
                        />
                        <div className="px-6 py-3 border border-outline-variant rounded-md font-label-md text-label-md text-on-surface hover:border-accent peer-checked:bg-accent peer-checked:text-ink peer-checked:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 transition-all duration-200 shadow-sm">
                          {variant.size}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}


              {/* Premium Promotion Banner */}
              {renderPromoBanner()}
              
              <div className="flex gap-4 pt-7">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || selectedVariant.stock === 0}
                  className="w-[85%] h-[56px] bg-primary text-on-primary rounded-md font-label-md uppercase tracking-widest hover:bg-surface-tint transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-[1px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                  {selectedVariant && selectedVariant.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
                <button
                  onClick={handleToggleWishlist}
                  disabled={!selectedVariant}
                  className={`w-[15%] min-w-[56px] h-[56px] border rounded-md flex justify-center items-center transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                    selectedVariant && isInWishlist(selectedVariant.id.toString())
                      ? 'border-accent text-accent bg-accent-soft'
                      : 'border-outline-variant text-on-surface hover:border-accent hover:text-accent'
                  }`}
                  aria-label={selectedVariant && isInWishlist(selectedVariant.id.toString()) ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: selectedVariant && isInWishlist(selectedVariant.id.toString()) ? "'FILL' 1" : "'FILL' 0" }}>
                    favorite
                  </span>
                </button>
              </div>

              {/* Trust Section */}
              <div className="flex flex-wrap items-center gap-5 pt-6 text-[10px] sm:text-[11px] uppercase tracking-wider text-on-surface-variant/80 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  100% Original
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Secure Checkout
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  Fast Shipping
                </div>
                <div className="flex items-center gap-1.5 hidden sm:flex">
                  <span className="material-symbols-outlined text-[16px]">package_2</span>
                  Premium Packaging
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
          <ReviewList productId={product.id} />
        </section>
      )}

      {/* SECTION 4: Similar Fragrances (1280px) */}
      {product && (
        <section ref={relatedRef} className={`max-w-[1280px] mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 reveal ${relatedInView ? 'in-view' : ''}`}>
          <RelatedProducts productId={product.id} />
        </section>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
};

export const Product = ProductPage;
