import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Gift, Headphones, Sparkles, Star } from 'lucide-react';
import { homepageService } from '../services/homepageService';
import type { HomepageDataResponse } from '../types/homepage';
import { ProductCard } from '../components/product/ProductCard';
import { ProductCarousel } from '../components/product/ProductCarousel';
import { GiftSetCard } from '../components/giftset/GiftSetCard';
import { giftSetService } from '../services/giftSetService';
import type { GiftSet } from '../types/giftSet';
import { getImageUrl } from '../utils/getImageUrl';
import { sanitizeText } from '../utils/textUtils';
import { SEO } from '../components/seo/SEO';

export const Home: React.FC = () => {
  const [data, setData] = useState<HomepageDataResponse | null>(null);
  const [giftSets, setGiftSets] = useState<GiftSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHomepageData = async (currentRetryCount = 0) => {
    try {
      if (currentRetryCount === 0) {
        setLoading(data === null);
      }
      setError(null);
      const response = await homepageService.getHomepageData();
      setData(response);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load homepage data", err);
      if (currentRetryCount < 3) {
        setTimeout(() => loadHomepageData(currentRetryCount + 1), 2000);
      } else {
        setError("Something went wrong while loading content. Please try again in a moment.");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadHomepageData();

    const loadGiftSets = async () => {
      try {
        let sets = await giftSetService.getFeaturedGiftSets();
        if (!sets || sets.length === 0) {
          sets = await giftSetService.getAllGiftSets();
        }
        setGiftSets(sets || []);
      } catch (err) {
        console.error("Failed to load gift sets for homepage", err);
      }
    };
    loadGiftSets();
  }, []);

  const sortedSections = [...(data?.sections || [])].sort((a, b) => a.displayOrder - b.displayOrder);
  const getSection = (key: string) => {
    return sortedSections.find(s => s.sectionKey === key || s.sectionKey.startsWith(key.replace('_banners', '')));
  };
  const isSectionVisible = (key: string) => {
    return getSection(key)?.visible;
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Al Ahad Attars",
    "url": "https://alahadattars.com/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://alahadattars.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Al Ahad Attars",
    "url": "https://alahadattars.com/",
    "logo": "https://alahadattars.com/favicon.svg",
    "description": "Premium Arabic perfumery offering authentic attars, rich ouds, and fine fragrances."
  };

  return (
    <div className="w-full flex flex-col font-light relative">
      <SEO 
        title="Al Ahad Attars"
        description="Discover Al Ahad Attars, your premier destination for luxury Arabic perfumery. Shop our exquisite collection of premium attars, rich ouds, and fine fragrances."
        canonicalUrl="/"
        schema={{
          "@context": "https://schema.org",
          "@graph": [websiteSchema, organizationSchema]
        }}
      />

      {error && (
        <div className="w-full bg-[#f5f2eb] border-b border-[#121c2a]/10 py-3 px-4 flex justify-center items-center gap-4 z-50">
          <span className="material-symbols-outlined text-[#121c2a] text-lg">info</span>
          <p className="font-body-sm text-[#121c2a]">{error}</p>
          <button 
            onClick={() => loadHomepageData(0)} 
            className="text-[10px] uppercase tracking-wider font-semibold text-[#d4af37] hover:text-[#121c2a] transition-colors ml-2"
          >
            Try Again
          </button>
        </div>
      )}

      {loading && !data ? (
        <HomeSkeleton />
      ) : !data ? (
        <div className="min-h-[40vh]" />
      ) : (
        <>

      {isSectionVisible('hero') && data.heroes?.length > 0 && <HeroSection heroes={data.heroes} section={getSection('hero')} />}
      
      {/* ── Curated Product Carousels: ATTARS ── */}
      {(() => {
        const attarsSection = data.productSections?.find(sec => sec.section === 'ATTARS' && sec.products && sec.products.length > 0);
        if (!attarsSection) return null;
        return (
          <div key="attars" className="bg-white">
            <ProductCarousel
              eyebrow="THE ESSENCE"
              heading="Explore Our Attars"
              description="Pure, alcohol-free traditional attars crafted from the world's finest ingredients."
              products={attarsSection.products}
              viewAllUrl="/collections?category=ATTARS"
              defaultType="attar"
            />
          </div>
        );
      })()}

      {isSectionVisible('categories') && data.categories?.length > 0 && (
        <div className="bg-[#faf9f8]">
          <CategoriesSection categories={data.categories} section={getSection('categories')} />
        </div>
      )}
      {/* ── Curated Product Carousels: PERFUMES ── */}
      {(() => {
        const perfumesSection = data.productSections?.find(sec => sec.section === 'PERFUMES_BAKHOOR' && sec.products && sec.products.length > 0);
        if (!perfumesSection) return null;
        return (
          <div key="perfumes" className="bg-white">
            <ProductCarousel
              eyebrow="FINE FRAGRANCES"
              heading="Perfumes & Car Perfumes"
              description="Long-lasting modern perfumes and premium car fragrances for every journey."
              products={perfumesSection.products}
              viewAllUrl="/collections?category=PERFUMES"
              defaultType="perfume"
            />
          </div>
        );
      })()}

      {(!getSection('brand_story') || getSection('brand_story')?.visible) && (
        <div className="bg-[#fbf9f5] border-t border-b border-[#e4dcc8]/40">
          <BrandStorySection section={getSection('brand_story')} />
        </div>
      )}

      {/* ── Curated Product Carousels: BAKHOOR ── */}
      {(() => {
        const bakhoorSection = data.productSections?.find(sec => sec.section === 'CAR_PERFUMES_INCENSE' && sec.products && sec.products.length > 0);
        if (!bakhoorSection) return null;
        return (
          <div key="car" className="bg-white border-b border-[#e4dcc8]/40">
            <ProductCarousel
              eyebrow="TRADITIONAL AROMAS"
              heading="Bakhoor & Incense Sticks"
              description="Elevate your home with our premium bakhoor and pure incense sticks."
              products={bakhoorSection.products}
              viewAllUrl="/collections?category=BAKHOOR"
              defaultType="bakhoor"
            />
          </div>
        );
      })()}

      {isSectionVisible('featured_products') && data.featuredProducts?.length > 0 && (
        <div className="bg-white border-b border-[#e4dcc8]/40">
          <FeaturedProductsSection products={data.featuredProducts} section={getSection('featured_products')} />
        </div>
      )}

      {giftSets.length > 0 && (
        <div className="bg-[#faf9f8] border-b border-[#e4dcc8]/40">
          <CuratedGiftSetsSection giftSets={giftSets} />
        </div>
      )}

      {isSectionVisible('promo_banners') && data.promoBanners?.length > 0 && (
        <div className="bg-[#fbf9f5] border-b border-[#e4dcc8]/40">
          <PromoBannerSection banners={data.promoBanners} />
        </div>
      )}

      {isSectionVisible('why_choose_us') && data.whyChooseUsItems?.length > 0 && (
        <div className="bg-white border-b border-[#e4dcc8]/40">
          <WhyChooseUsSection items={data.whyChooseUsItems} section={getSection('why_choose_us')} />
        </div>
      )}

      {isSectionVisible('testimonials') && data.testimonials?.length > 0 && (
        <div className="bg-[#fbf9f5]">
          <TestimonialsSection testimonials={data.testimonials} section={getSection('testimonials')} />
        </div>
      )}
        </>
      )}
    </div>
  );
};

// --- Skeletons ---
const HomeSkeleton = () => (
  <div className="w-full flex flex-col font-light animate-pulse">
    {/* Hero Skeleton */}
    <section className="relative h-[90vh] min-h-[700px] w-full flex items-center justify-center text-center overflow-hidden bg-[#f5f2eb]">
      <div className="relative z-10 px-6 max-w-4xl mx-auto flex flex-col items-center pt-20 w-full">
        <div className="h-3 w-48 bg-[#121c2a]/10 mb-6"></div>
        <div className="h-16 md:h-24 w-3/4 bg-[#121c2a]/10 mb-8"></div>
        <div className="h-6 w-2/3 bg-[#121c2a]/10 mb-12"></div>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="h-14 w-64 bg-[#121c2a]/10"></div>
          <div className="h-14 w-64 bg-[#121c2a]/10"></div>
        </div>
      </div>
    </section>

    {/* Categories Skeleton */}
    <div className="bg-[#faf9f8]">
      <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-20 w-full">
          <div className="h-3 w-32 bg-[#121c2a]/10 mb-4"></div>
          <div className="h-12 w-64 bg-[#121c2a]/10 mb-6"></div>
          <div className="h-5 w-96 bg-[#121c2a]/10 max-w-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] bg-[#121c2a]/5 rounded-sm"></div>
          ))}
        </div>
      </section>
    </div>

    {/* Brand Story Skeleton */}
    <div className="bg-white">
      <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 lg:gap-24 items-center">
          <div className="w-full md:w-1/2 aspect-[4/5] md:aspect-[3/4] bg-[#121c2a]/5 rounded-sm"></div>
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            <div className="max-w-md w-full">
              <div className="h-3 w-32 bg-[#121c2a]/10 mb-6"></div>
              <div className="h-12 w-3/4 bg-[#121c2a]/10 mb-8"></div>
              <div className="h-4 w-full bg-[#121c2a]/10 mb-3"></div>
              <div className="h-4 w-full bg-[#121c2a]/10 mb-3"></div>
              <div className="h-4 w-5/6 bg-[#121c2a]/10 mb-12"></div>
              <div className="h-4 w-32 bg-[#121c2a]/10"></div>
            </div>
          </div>
        </div>
      </section>
    </div>

    {/* Featured Products Skeleton */}
    <div className="bg-[#f5f2eb]">
      <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-[#121c2a]/10 pb-6 gap-6">
          <div className="w-full max-w-xl">
            <div className="h-3 w-32 bg-[#121c2a]/10 mb-4"></div>
            <div className="h-12 w-64 bg-[#121c2a]/10 mb-4"></div>
            <div className="h-5 w-full bg-[#121c2a]/10"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-[4/5] bg-[#121c2a]/5 rounded-sm mb-4"></div>
              <div className="h-5 w-3/4 bg-[#121c2a]/10 mb-2"></div>
              <div className="h-4 w-1/2 bg-[#121c2a]/10"></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

// --- Sections ---

const HeroSection = ({ heroes, section }: { heroes: any[], section?: any }) => {
  if (!heroes || heroes.length === 0) return null;
  const heroData = heroes[0];

  return (
    <section className="relative min-h-[540px] xs:min-h-[580px] sm:min-h-[640px] md:min-h-[700px] lg:h-[90vh] w-full flex items-center justify-center text-center overflow-hidden bg-black">
      {/* Background Image & Scrim */}
      <div className="absolute inset-0 z-0">
        <picture>
          {heroData.mobileImageUrl && <source media="(max-width: 768px)" srcSet={getImageUrl(heroData.mobileImageUrl)} />}
          <img 
            src={getImageUrl(heroData.imageUrl)} 
            alt={heroData.title}
            fetchPriority="high"
            className="w-full h-full object-cover object-[75%_center] md:object-center transition-transform duration-[20000ms] scale-105 hero-zoom" 
          />
        </picture>
        {/* Pure neutral black overlays — zero blue/navy tint, preserving original natural golden/warm black lighting */}
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
      </div>
      
      {/* Hero Content */}
      <div className="relative z-10 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto flex flex-col items-center py-14 sm:py-16 md:py-24 animate-fade-up">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
          <span className="w-5 sm:w-8 h-px bg-accent/70" aria-hidden="true" />
          <span className="text-accent text-[10px] sm:text-[11px] font-label-md uppercase tracking-[0.3em] sm:tracking-[0.35em] font-medium">
            {sanitizeText(heroData.badge || 'LUXURY ARABIC FRAGRANCE')}
          </span>
          <span className="w-5 sm:w-8 h-px bg-accent/70" aria-hidden="true" />
        </div>

        {/* Main Headline */}
        <h1 className="font-headline-lg text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white mb-4 sm:mb-6 leading-[1.12] font-normal tracking-tight [text-shadow:_0_3px_20px_rgba(0,0,0,0.5)]">
          {sanitizeText(heroData.title)}
        </h1>

        {/* Subtitle */}
        <p className="font-body-md text-sm sm:text-base md:text-lg text-white/90 mb-3 sm:mb-4 max-w-2xl font-light leading-relaxed">
          {sanitizeText(heroData.subtitle)}
        </p>

        {/* Description (desktop) */}
        {heroData.description && (
          <p className="font-body-md text-xs sm:text-sm text-white/70 mb-6 sm:mb-8 max-w-xl font-light leading-relaxed hidden sm:block">
            {sanitizeText(heroData.description)}
          </p>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-center w-full sm:w-auto mt-2">
          <Link 
            to={heroData.buttonUrl || "/collections"} 
            className="w-full sm:w-auto bg-white text-[#121c2a] px-8 sm:px-12 py-3.5 sm:py-4 text-[10.5px] sm:text-[11px] font-label-md uppercase tracking-[0.2em] font-semibold hover:bg-accent hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-center rounded-[2px]"
          >
            {sanitizeText(heroData.buttonText || "DISCOVER COLLECTION")}
          </Link>
          <Link 
            to="/about" 
            className="w-full sm:w-auto text-white px-8 sm:px-12 py-3.5 sm:py-4 text-[10.5px] sm:text-[11px] font-label-md uppercase tracking-[0.2em] border border-white/60 bg-white/10 hover:border-white hover:bg-white/20 transition-all duration-300 text-center rounded-[2px] backdrop-blur-2xs"
          >
            {sanitizeText(section?.subtitle || "OUR HERITAGE")}
          </Link>
        </div>
      </div>
    </section>
  );
};

const CategoriesSection = ({ categories, section }: { categories: any[], section?: any }) => {
  if (!categories || categories.length === 0) return null;
  
  const displayCategories = categories.slice(0, section?.maxItems || 3);

  return (
    <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-14 md:mb-18">
        <div className="inline-flex items-center gap-3 mb-3">
          <span className="w-5 h-px bg-accent/60" aria-hidden="true" />
          <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.35em] block">
            {section?.subtitle || 'THE COLLECTIONS'}
          </span>
          <span className="w-5 h-px bg-accent/60" aria-hidden="true" />
        </div>
        <h2 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl text-ink font-normal tracking-wide">
          {section?.title || 'Featured Categories'}
        </h2>
        {section?.description && (
          <p className="mt-4 font-body-md text-on-surface-variant max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {section.description}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {displayCategories.map((cat) => (
          <Link 
            key={cat.id} 
            to={cat.homepageButtonUrl || `/category/${cat.type.toLowerCase()}`} 
            className="group relative aspect-[3/4] overflow-hidden rounded-[2px] border border-[#e4dcc8]/60 hover:border-accent/40 flex flex-col justify-end transition-all duration-500 shadow-sm hover:shadow-[0_16px_40px_rgba(18,28,42,0.12)]"
          >
            <div className="absolute inset-0 bg-black">
              <picture>
                {cat.mobileImageUrl && <source media="(max-width: 768px)" srcSet={getImageUrl(cat.mobileImageUrl)} />}
                {cat.desktopImageUrl ? (
                  <img 
                    src={getImageUrl(cat.desktopImageUrl)} 
                    alt={cat.homepageTitle || cat.name} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[1400ms] cubic-bezier(0.16,1,0.3,1) group-hover:scale-108"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                    <Sparkles className="w-16 h-16 text-white mb-4 stroke-[1.2]" />
                  </div>
                )}
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500"></div>
            </div>
            
            <div className="relative z-10 p-6 md:p-8 text-center flex flex-col items-center">
              <span className="text-[9px] text-accent uppercase tracking-[0.25em] font-medium mb-2">
                COLLECTION
              </span>
              <h3 className="font-headline-md text-2xl md:text-3xl text-white mb-2 font-normal tracking-wide group-hover:text-accent transition-colors duration-300">
                {cat.homepageTitle || (cat.name.toLowerCase() === 'bakhoor' ? 'Bakhoor & Incense Stick' : cat.name.toLowerCase() === 'perfumes' ? 'Perfumes & Car Perfumes' : cat.name)}
              </h3>
              {cat.homepageSubtitle && (
                <p className="text-white/80 font-body-sm text-xs sm:text-sm mb-4 italic leading-relaxed max-w-[90%] mx-auto">
                  {cat.homepageSubtitle}
                </p>
              )}
              <span className="inline-flex items-center gap-2 text-[10px] text-accent uppercase tracking-[0.2em] font-semibold border-b border-accent/40 pb-0.5 group-hover:border-accent group-hover:gap-3 transition-all duration-300">
                {cat.homepageButtonText || 'EXPLORE COLLECTION'}
                <span className="text-xs transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const BrandStorySection = ({ section }: { section?: any }) => {
  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
        {/* Left: Framed Brand Image */}
        <div className="lg:col-span-6 relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-[3/4] overflow-hidden rounded-[2px] shadow-[0_16px_40px_rgba(18,28,42,0.08)] border border-[#e4dcc8] group bg-[#f5f1e8]">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[1200ms] group-hover:scale-105" 
            style={{ backgroundImage: `url('${section?.imageUrl ? getImageUrl(section.imageUrl) : 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1887&auto=format&fit=crop'}')` }}
          ></div>
          <div className="absolute inset-0 border border-accent/20 m-2.5 sm:m-3 pointer-events-none rounded-[1px]"></div>
        </div>

        {/* Right: Editorial Story */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
              <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
              <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] sm:tracking-[0.35em] block font-medium">
                {sanitizeText(section?.subtitle || 'OUR HERITAGE')}
              </span>
              <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
            </div>
            <h2 className="font-serif text-2xl xs:text-3xl sm:text-4xl md:text-5xl text-ink mb-4 sm:mb-6 leading-[1.18] font-normal whitespace-pre-line tracking-tight">
              {sanitizeText(section?.title || 'The Art of Fine \nPerfumery')}
            </h2>
            <p className="font-body-md text-on-surface-variant font-light leading-relaxed mb-6 sm:mb-8 whitespace-pre-line text-xs sm:text-sm md:text-base">
              {sanitizeText(section?.description || 'Born from a passion for the rarest ingredients and the most exquisite olfactory experiences, Al Ahad Attars represents the pinnacle of luxury Arabic perfumery.\n\nEvery drop is a testament to generations of masterful craftsmanship, blending rich oud, pure musk, and delicate floral essences into timeless signatures that linger long after you leave the room.')}
            </p>
            <Link 
              to="/about" 
              className="inline-flex items-center gap-2.5 sm:gap-3 text-[10.5px] sm:text-[11px] text-ink font-label-md uppercase tracking-[0.2em] border-b border-accent pb-1 hover:text-accent group transition-colors"
            >
              <span>LEARN MORE ABOUT US</span>
              <span className="transform group-hover:translate-x-1.5 transition-transform duration-300 text-accent">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const FeaturedProductsSection = ({ products, section }: { products: any[], section?: any }) => {
  if (!products || products.length === 0) return null;
  
  const displayProducts = products.slice(0, section?.maxItems || 8);

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12 border-b border-[#121c2a]/10 pb-5 sm:pb-6">
        <div>
          <div className="inline-flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
            <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] block font-medium">
              {sanitizeText(section?.subtitle || 'SIGNATURE SCENTS')}
            </span>
            <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-ink font-normal tracking-wide">
            {sanitizeText(section?.title || 'Featured Products')}
          </h2>
          {section?.description && (
            <p className="mt-2 font-body-md text-on-surface-variant text-xs sm:text-sm max-w-xl leading-relaxed font-light">
              {sanitizeText(section.description)}
            </p>
          )}
        </div>
        <Link 
          to="/collections" 
          className="inline-flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-[11px] font-label-md uppercase tracking-[0.2em] text-ink border-b border-accent pb-0.5 hover:text-accent transition-colors group self-start sm:self-auto whitespace-nowrap"
        >
          <span>View Full Catalog</span>
          <span className="transform group-hover:translate-x-1 transition-transform duration-300 text-accent">→</span>
        </Link>
      </div>
      
      {/* 2-Column Mobile Grid / 4-Column Desktop Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
        {displayProducts.map(product => (
          <div key={product.id} className="w-full">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
      
      <div className="mt-10 sm:mt-14 flex justify-center">
        <Link 
          to="/collections" 
          className="bg-ink text-white px-10 sm:px-12 py-3.5 sm:py-4 text-[10.5px] sm:text-[11px] font-label-md uppercase tracking-[0.2em] font-medium hover:bg-accent hover:text-ink transition-all duration-300 shadow-xs rounded-[2px]"
        >
          VIEW ALL PRODUCTS
        </Link>
      </div>
    </section>
  );
};

const CuratedGiftSetsSection = ({ giftSets }: { giftSets: GiftSet[] }) => {
  if (!giftSets || giftSets.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12 border-b border-[#121c2a]/10 pb-5 sm:pb-6">
        <div>
          <div className="inline-flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
            <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] block font-medium">
              BESPOKE PRESENTATION
            </span>
            <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-ink font-normal tracking-wide">
            Curated Gift Sets
          </h2>
          <p className="mt-2 font-body-md text-on-surface-variant text-xs sm:text-sm max-w-xl leading-relaxed font-light">
            Exquisite fragrance selections presented in handcrafted luxury packaging, designed for unforgettable gifting.
          </p>
        </div>
        <Link 
          to="/gift-sets" 
          className="inline-flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-[11px] font-label-md uppercase tracking-[0.2em] text-ink border-b border-accent pb-0.5 hover:text-accent transition-colors group self-start sm:self-auto whitespace-nowrap"
        >
          <span>Explore All Sets</span>
          <span className="transform group-hover:translate-x-1 transition-transform duration-300 text-accent">→</span>
        </Link>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {giftSets.slice(0, 4).map(gs => (
          <div key={gs.id} className="w-full">
            <GiftSetCard giftSet={gs} />
          </div>
        ))}
      </div>

      <div className="mt-10 sm:mt-14 flex justify-center">
        <Link 
          to="/gift-sets" 
          className="bg-ink text-white px-10 sm:px-12 py-3.5 sm:py-4 text-[10.5px] sm:text-[11px] font-label-md uppercase tracking-[0.2em] font-medium hover:bg-accent hover:text-ink transition-all duration-300 shadow-xs rounded-[2px]"
        >
          VIEW ALL GIFT SETS
        </Link>
      </div>
    </section>
  );
};

const PromoBannerSection = ({ banners }: { banners: any[] }) => {
  if (!banners || banners.length === 0) return null;
  const banner = banners[0];

  return (
    <section className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      <div className="relative h-[420px] xs:h-[460px] sm:h-[520px] md:h-[580px] w-full overflow-hidden flex items-center justify-center text-center rounded-[2px] shadow-[0_16px_40px_rgba(18,28,42,0.1)]">
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center transition-transform duration-[15000ms] scale-105 hover:scale-110" 
            style={{backgroundImage: `url('${getImageUrl(banner.imageUrl)}')`}}
          ></div>
          <div className="absolute inset-0 bg-black/35"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(25,15,5,0.45)_0%,_rgba(25,15,5,0.15)_45%,_transparent_75%)]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25"></div>
        </div>
        
        <div className="relative z-10 px-4 sm:px-6 w-full max-w-[850px] flex flex-col items-center">
          <div className="flex flex-col items-center mb-6 sm:mb-8 text-center" style={{ textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}>
            <span className="text-accent text-[10px] sm:text-xs font-label-md uppercase tracking-[0.3em] sm:tracking-[0.35em] mb-3 sm:mb-4 font-medium">
              EXCLUSIVE CREATIONS
            </span>
            <h2 className="font-serif text-xl xs:text-2xl sm:text-3xl md:text-4xl text-[#e0c990] mb-2 sm:mb-3 font-normal tracking-wide leading-tight">
              {sanitizeText(banner.title || 'What Are You Waiting For?')}
            </h2>
            <p className="font-serif text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#fdf7ea] leading-[1.12] font-normal tracking-tight max-w-2xl">
              {sanitizeText(banner.subtitle || 'Discover Your Signature Fragrance')}
            </p>
          </div>
          {banner.buttonUrl && (
            <Link 
              to={banner.buttonUrl} 
              className="bg-[#cda64b] text-[#0a1118] px-8 sm:px-10 py-3 sm:py-3.5 text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-[#b8913d] hover:scale-[1.02] shadow-[0_4px_20px_rgba(205,166,75,0.3)] transition-all duration-300 rounded-[2px]"
            >
              {sanitizeText(banner.buttonText || 'EXPLORE PRODUCTS')}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

const WhyChooseUsSection = ({ items, section }: { items: any[], section?: any }) => {
  if (!items || items.length === 0) return null;
  const displayItems = items.slice(0, section?.maxItems || 4);

  const getWhyIcon = (iconName: string, title: string) => {
    const key = ((iconName || '') + ' ' + (title || '')).toLowerCase();
    if (key.includes('auth') || key.includes('verify')) return <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />;
    if (key.includes('ship') || key.includes('deliver')) return <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />;
    if (key.includes('gift') || key.includes('pack')) return <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />;
    if (key.includes('concierge') || key.includes('support') || key.includes('agent')) return <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />;
    return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />;
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
          <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
          <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] block font-medium">
            {sanitizeText(section?.subtitle || 'THE AL AHAD PROMISE')}
          </span>
          <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-ink font-normal tracking-wide">
          {sanitizeText(section?.title || 'Why Choose Al Ahad Attars')}
        </h2>
      </div>

      {/* Balanced 2x2 Mobile Grid / 4-Column Desktop Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 lg:gap-8 text-center">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center p-4 sm:p-6 bg-white rounded-[2px] border border-[#e4dcc8]/70 shadow-xs hover:border-accent/40 hover:shadow-sm transition-all duration-300"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center mb-3 sm:mb-4 shrink-0">
              {getWhyIcon(item.icon, item.title)}
            </div>
            <h4 className="font-serif text-[11px] sm:text-xs md:text-sm text-ink mb-1.5 sm:mb-2 font-normal tracking-wider uppercase">
              {sanitizeText(item.title)}
            </h4>
            <p className="font-body-md text-[10.5px] sm:text-xs text-on-surface-variant font-light leading-relaxed max-w-[200px]">
              {sanitizeText(item.description)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

const TestimonialsSection = ({ testimonials, section }: { testimonials: any[], section?: any }) => {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto overflow-hidden relative">
      <div className="text-center mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
          <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
          <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] block font-medium">
            {sanitizeText(section?.subtitle || 'TESTIMONIALS')}
          </span>
          <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-ink font-normal tracking-wide">
          {sanitizeText(section?.title || 'Client Experiences')}
        </h2>
        {section?.description && (
          <p className="mt-3 font-body-md text-on-surface-variant max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed font-light">
            {sanitizeText(section.description)}
          </p>
        )}
      </div>
      
      {/* Luxury Scroll Snap Carousel */}
      <div
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-6 md:gap-8 pb-8 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {testimonials.map(test => (
          <div 
            key={test.id} 
            className="snap-start shrink-0 w-[80vw] xs:w-[320px] sm:w-[360px] md:w-[390px] bg-white p-6 sm:p-8 rounded-[2px] border border-[#e4dcc8] flex flex-col items-center text-center shadow-[0_6px_24px_rgba(18,28,42,0.03)] hover:shadow-[0_12px_36px_rgba(18,28,42,0.07)] transition-all duration-300"
          >
            <div className="flex gap-1 text-accent mb-4 sm:mb-5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < test.rating ? 'text-accent fill-accent' : 'text-[#e4dcc8]'
                  }`}
                />
              ))}
            </div>
            <p className="font-serif text-sm sm:text-base text-ink mb-6 italic font-light leading-relaxed">
              "{sanitizeText(test.review)}"
            </p>
            <div className="flex flex-col items-center gap-2.5 mt-auto">
              {test.photoUrl ? (
                <img
                  src={getImageUrl(test.photoUrl)}
                  alt={test.customerName}
                  loading="lazy"
                  className="w-12 h-12 rounded-full object-cover border border-accent/40 p-0.5"
                />
              ) : (
                <div className="w-11 h-11 rounded-full border border-accent/40 p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-[#f5f1e8] rounded-full flex items-center justify-center text-accent font-serif text-base font-normal">
                    {test.customerName.charAt(0)}
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-body-md text-xs sm:text-sm text-ink tracking-wider uppercase font-semibold">
                  {test.customerName}
                </h4>
                {(test.isVerifiedPurchase === true || test.verifiedPurchase === true || test.verified === true) && (
                  <p className="text-[9px] text-accent uppercase tracking-[0.2em] mt-0.5 font-medium">
                    Verified Buyer
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </section>
  );
};
