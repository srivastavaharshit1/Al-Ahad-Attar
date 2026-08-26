import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { homepageService } from '../services/homepageService';
import type { HomepageDataResponse } from '../types/homepage';
import { ProductCard } from '../components/product/ProductCard';
import { getImageUrl } from '../utils/getImageUrl';
import { SEO } from '../components/seo/SEO';

export const Home: React.FC = () => {
  const [data, setData] = useState<HomepageDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await homepageService.getHomepageData();
      setData(response);
    } catch (err) {
      console.error("Failed to load homepage data", err);
      setError("Failed to load homepage content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomepageData();
  }, []);

  if (loading) {
    return <HomeSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] bg-[#fcfaf8]">
        <div className="w-16 h-16 border border-[#d4af37] rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[#d4af37] text-2xl">error_outline</span>
        </div>
        <h2 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase">Connection Error</h2>
        <p className="font-body-md text-on-surface-variant mb-8 font-light">{error || "Could not load data."}</p>
        <button onClick={loadHomepageData} className="px-8 py-3 bg-[#121c2a] text-white text-[10px] uppercase tracking-[0.2em] hover:bg-[#d4af37] transition-colors">
          Retry Connection
        </button>
      </div>
    );
  }

  const sortedSections = [...(data.sections || [])].sort((a, b) => a.displayOrder - b.displayOrder);
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
    <div className="w-full flex flex-col font-light">
      <SEO 
        title="Al Ahad Attars"
        description="Discover Al Ahad Attars, your premier destination for luxury Arabic perfumery. Shop our exquisite collection of premium attars, rich ouds, and fine fragrances."
        canonicalUrl="/"
        schema={{
          "@context": "https://schema.org",
          "@graph": [websiteSchema, organizationSchema]
        }}
      />

      {isSectionVisible('hero') && data.heroes?.length > 0 && <HeroSection heroes={data.heroes} section={getSection('hero')} />}
      
      {isSectionVisible('categories') && data.categories?.length > 0 && (
        <div className="bg-[#faf9f8]">
          <CategoriesSection categories={data.categories} section={getSection('categories')} />
        </div>
      )}
      
      {(!getSection('brand_story') || getSection('brand_story')?.visible) && (
        <div className="bg-white">
          <BrandStorySection section={getSection('brand_story')} />
        </div>
      )}

      {isSectionVisible('featured_products') && data.featuredProducts?.length > 0 && (
        <div className="bg-[#f5f2eb]">
          <FeaturedProductsSection products={data.featuredProducts} section={getSection('featured_products')} />
        </div>
      )}

      {isSectionVisible('promo_banners') && data.promoBanners?.length > 0 && (
        <div className="bg-white">
          <PromoBannerSection banners={data.promoBanners} />
        </div>
      )}

      {isSectionVisible('why_choose_us') && data.whyChooseUsItems?.length > 0 && (
        <div className="bg-[#faf9f8]">
          <WhyChooseUsSection items={data.whyChooseUsItems} section={getSection('why_choose_us')} />
        </div>
      )}

      {isSectionVisible('testimonials') && data.testimonials?.length > 0 && (
        <div className="bg-[#f5f2eb]">
          <TestimonialsSection testimonials={data.testimonials} section={getSection('testimonials')} />
        </div>
      )}
    </div>
  );
};

// --- Skeletons ---
const HomeSkeleton = () => (
  <div className="w-full bg-white animate-pulse">
    <div className="h-screen min-h-[700px] w-full bg-gray-100"></div>
  </div>
);

// --- Sections ---

const HeroSection = ({ heroes, section }: { heroes: any[], section?: any }) => {
  if (!heroes || heroes.length === 0) return null;
  const heroData = heroes[0];

  return (
    <section className="relative h-[90vh] min-h-[700px] w-full flex items-center justify-center text-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <picture>
          {heroData.mobileImageUrl && <source media="(max-width: 768px)" srcSet={getImageUrl(heroData.mobileImageUrl)} />}
          <img 
            src={getImageUrl(heroData.imageUrl)} 
            alt={heroData.title}
            fetchPriority="high"
            className="w-full h-full object-cover transition-transform duration-[20000ms] scale-110 animate-subtle-zoom" 
          />
        </picture>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
      </div>
      
      <div className="relative z-10 px-6 max-w-4xl mx-auto flex flex-col items-center pt-20 animate-fade-up">
        <span className="text-[#d4af37] text-[10px] md:text-[11px] font-label-md uppercase tracking-[0.4em] mb-6 block">
          {heroData.badge || 'L U X U R Y  F R A G R A N C E'}
        </span>
        <h1 className="font-headline-lg text-5xl md:text-7xl lg:text-8xl text-white mb-8 leading-[1.1] font-normal tracking-tight">
          {heroData.title}
        </h1>
        <p className="font-body-md text-lg text-white/80 mb-12 max-w-2xl font-light leading-relaxed">
          {heroData.subtitle}
        </p>
        {heroData.description && (
          <p className="font-body-md text-sm text-white/60 mb-10 max-w-xl font-light leading-relaxed hidden md:block">
            {heroData.description}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          {heroData.buttonUrl && (
            <Link to={heroData.buttonUrl} className="bg-white text-[#121c2a] px-12 py-4 text-[10px] font-label-md uppercase tracking-[0.25em] hover:bg-[#d4af37] hover:text-white transition-all duration-500">
              {heroData.buttonText || "DISCOVER COLLECTION"}
            </Link>
          )}
          {section?.subtitle && (
            <Link to="/about" className="text-white px-12 py-4 text-[10px] font-label-md uppercase tracking-[0.25em] border border-white/30 hover:border-white hover:bg-white/10 transition-all duration-500">
              {section.subtitle}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

const CategoriesSection = ({ categories, section }: { categories: any[], section?: any }) => {
  if (!categories || categories.length === 0) return null;
  
  // Prompt: Exactly 3 premium cards or CMS controlled
  const displayCategories = categories.slice(0, section?.maxItems || 3);

  return (
    <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <span className="text-[#d4af37] text-[10px] font-label-md uppercase tracking-[0.3em] mb-4 block">{section?.subtitle || 'THE COLLECTIONS'}</span>
        <h2 className="font-headline-lg text-4xl md:text-5xl text-[#121c2a] font-normal tracking-wide">{section?.title || 'Featured Blends'}</h2>
        {section?.description && <p className="mt-6 font-body-md text-on-surface-variant max-w-2xl mx-auto">{section.description}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {displayCategories.map((cat) => (
          <Link key={cat.id} to={cat.homepageButtonUrl || `/category/${cat.type.toLowerCase()}`} className="group relative aspect-square overflow-hidden flex flex-col justify-end">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a2332] to-[#0d141e]">
              <picture>
                {cat.mobileImageUrl && <source media="(max-width: 768px)" srcSet={getImageUrl(cat.mobileImageUrl)} />}
                {cat.desktopImageUrl ? (
                  <img 
                    src={getImageUrl(cat.desktopImageUrl)} 
                    alt={cat.homepageTitle || cat.name} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                    <span className="material-symbols-outlined text-6xl text-white mb-4">diamond</span>
                  </div>
                )}
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500"></div>
            </div>
            
            <div className="relative z-10 p-10 text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              <h3 className="font-headline-md text-3xl text-white mb-3 font-normal tracking-wide">
                {cat.homepageTitle || (cat.name.toLowerCase() === 'bakhoor' ? 'Bakhoor & Incense Stick' : cat.name.toLowerCase() === 'perfumes' ? 'Perfumes & Car Perfumes' : cat.name)}
              </h3>
              {cat.homepageSubtitle && (
                <p className="text-white/80 font-body-sm mb-4 italic leading-relaxed max-w-[90%] mx-auto">{cat.homepageSubtitle}</p>
              )}
              <p className="text-[10px] text-[#d4af37] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                {cat.homepageButtonText || 'Explore Collection'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const BrandStorySection = ({ section }: { section?: any }) => {
  return (
    <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-12 lg:gap-24 items-center">
        <div className="w-full md:w-1/2 relative aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-sm">
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{ backgroundImage: `url('${section?.imageUrl ? getImageUrl(section.imageUrl) : 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1887&auto=format&fit=crop'}')` }}
          ></div>
        </div>
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <div className="max-w-md">
            <span className="text-[#d4af37] text-[10px] font-label-md uppercase tracking-[0.3em] mb-6 block">{section?.subtitle || 'OUR HERITAGE'}</span>
            <h2 className="font-headline-lg text-4xl md:text-5xl text-[#121c2a] mb-8 leading-tight font-normal whitespace-pre-line">{section?.title || 'The Art of Fine \nPerfumery'}</h2>
            <p className="font-body-md text-on-surface-variant font-light leading-relaxed mb-12 whitespace-pre-line">
              {section?.description || 'Born from a passion for the rarest ingredients and the most exquisite olfactory experiences, Al Ahad Attars represents the pinnacle of luxury Arabic perfumery.\n\nEvery drop is a testament to generations of masterful craftsmanship, blending rich oud, pure musk, and delicate floral essences into timeless signatures that linger long after you leave the room.'}
            </p>
            <Link to="/about" className="inline-flex items-center gap-4 text-[10px] text-[#121c2a] font-label-md uppercase tracking-[0.2em] border-b border-[#d4af37] pb-1 hover:text-[#d4af37] transition-colors group">
              LEARN MORE 
              <span className="transform group-hover:translate-x-2 transition-transform duration-300">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const FeaturedProductsSection = ({ products, section }: { products: any[], section?: any }) => {
  if (!products || products.length === 0) return null;
  
  // Prompt: Exactly four products, single row, or CMS controlled
  const displayProducts = products.slice(0, section?.maxItems || 4);

  return (
    <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-[#121c2a]/10 pb-6 gap-6">
        <div>
          <span className="text-[#d4af37] text-[10px] font-label-md uppercase tracking-[0.3em] mb-4 block">{section?.subtitle || 'SIGNATURE SCENTS'}</span>
          <h2 className="font-headline-lg text-4xl md:text-5xl text-[#121c2a] font-normal tracking-wide">{section?.title || 'Featured Products'}</h2>
          {section?.description && <p className="mt-4 font-body-md text-on-surface-variant max-w-xl">{section.description}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {displayProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      <div className="mt-16 flex justify-center">
        <Link to="/collections" className="bg-[#121c2a] text-white px-12 py-4 text-[10px] font-label-md uppercase tracking-[0.25em] hover:bg-[#d4af37] transition-colors">
          VIEW ALL PRODUCTS
        </Link>
      </div>
    </section>
  );
};

const PromoBannerSection = ({ banners }: { banners: any[] }) => {
  if (!banners || banners.length === 0) return null;
  // Prompt: One full-width elegant banner
  const banner = banners[0];

  return (
    <section className="py-32 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="relative h-[600px] w-full overflow-hidden flex items-center justify-center text-center">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-cover bg-center transition-transform duration-[15000ms] scale-105 hover:scale-110" style={{backgroundImage: `url('${getImageUrl(banner.imageUrl)}')`}}></div>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
        </div>
        
        <div className="relative z-10 px-6 max-w-3xl flex flex-col items-center">
          <span className="text-[#d4af37] text-[10px] font-label-md uppercase tracking-[0.4em] mb-6 block border border-[#d4af37] px-4 py-2">
            {banner.subtitle || 'LIMITED EDITION'}
          </span>
          <h2 className="font-headline-lg text-4xl md:text-6xl text-white mb-8 leading-[1.2] font-normal tracking-wide">
            {banner.title}
          </h2>
          {banner.buttonUrl && (
            <Link to={banner.buttonUrl} className="mt-4 bg-white text-[#121c2a] px-12 py-4 text-[10px] font-label-md uppercase tracking-[0.25em] hover:bg-[#121c2a] hover:text-white transition-all duration-500">
              {banner.buttonText || 'SHOP GIFT BOXES'}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

const WhyChooseUsSection = ({ items, section }: { items: any[], section?: any }) => {
  if (!items || items.length === 0) return null;
  // Prompt: Four icon cards, simple premium layout
  const displayItems = items.slice(0, section?.maxItems || 4);

  return (
    <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto border-t border-b border-[#121c2a]/5 my-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 text-center divide-y sm:divide-y-0 sm:divide-x divide-[#121c2a]/5">
        {displayItems.map((item, index) => (
          <div key={item.id} className={`flex flex-col items-center px-6 ${index !== 0 ? 'pt-12 sm:pt-0' : ''}`}>
            <span className="material-symbols-outlined text-3xl text-[#d4af37] mb-6 font-light">{item.icon || 'star'}</span>
            <h4 className="font-headline-md text-lg text-[#121c2a] mb-4 font-normal tracking-wide uppercase text-[13px]">{item.title}</h4>
            <p className="font-body-md text-sm text-on-surface-variant font-light leading-relaxed max-w-[200px]">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const TestimonialsSection = ({ testimonials, section }: { testimonials: any[], section?: any }) => {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-32 px-4 overflow-hidden relative">
      <div className="text-center mb-20 max-w-7xl mx-auto">
        <span className="text-[#d4af37] text-[10px] font-label-md uppercase tracking-[0.3em] mb-4 block">{section?.subtitle || 'TESTIMONIALS'}</span>
        <h2 className="font-headline-lg text-4xl md:text-5xl text-[#121c2a] font-normal tracking-wide">{section?.title || 'Client Experiences'}</h2>
        {section?.description && <p className="mt-6 font-body-md text-[#121c2a]/70 max-w-2xl mx-auto">{section.description}</p>}
      </div>
      
      {/* Luxury CSS Scroll Snap Carousel */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-8 pb-12 hide-scrollbar px-4 md:px-[calc((100vw-1280px)/2+2rem)]">
        {testimonials.map(test => (
          <div key={test.id} className="snap-center shrink-0 w-[85vw] md:w-[450px] bg-white p-8 md:p-10 flex flex-col items-center text-center shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]">
            <div className="flex gap-2 text-[#d4af37] mb-8">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: i < test.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
              ))}
            </div>
            <p className="font-headline-md text-lg md:text-xl text-[#121c2a] mb-10 italic font-light leading-relaxed">
              "{test.review}"
            </p>
            <div className="flex flex-col items-center gap-4 mt-auto">
              {test.photoUrl ? (
                <img src={getImageUrl(test.photoUrl)} alt="" loading="lazy" className="w-16 h-16 rounded-full object-cover border border-[#d4af37]/30 p-1" />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#d4af37]/30 p-1 flex items-center justify-center">
                  <div className="w-full h-full bg-[#f5f2eb] rounded-full flex items-center justify-center text-[#d4af37] font-headline-md text-xl">
                    {test.customerName.charAt(0)}
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-body-md text-sm text-[#121c2a] tracking-wider uppercase">{test.customerName}</h4>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] mt-1">Verified Buyer</p>
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
