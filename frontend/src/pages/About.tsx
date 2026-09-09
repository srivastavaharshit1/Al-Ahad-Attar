import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cmsService } from '../services/cmsService';
import { SEO } from '../components/seo/SEO';
import { useInView } from '../hooks/useInView';

/* ─────────────────────────────────────────────────────────────────
   Default content — used as fallback when CMS returns no saved data.
   Keys match the new admin schema; hero & cta keys are kept identical
   to the old schema so any previously-saved DB data hydrates cleanly.
───────────────────────────────────────────────────────────────── */
const DEFAULT_CONTENT = {
  hero: {
    eyebrow: 'OUR PHILOSOPHY',
    title: 'Your Fragrance is Your Signature',
    description:
      'At Al Ahad Attars, we believe that scent is more than an accessory—it is an identity, an emotion, and a lasting impression. Guided by our philosophy, "Your Fragrance is Your Signature," we curate exquisite, alcohol-free artisanal attars and pure perfume oils designed to leave an unforgettable presence wherever you go.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDhki3C6gDAjRNyDBV8U_XwUQ2ImFWQtx2MDVAV6-txhuaUJJusdbUKfIx4WqlqYFHUVOvPX_RewEzDEdfGBHF0Qd3ZR8nZvMPR2pMnxPXwUpfZ7QfPBArUJstd22K36Xh8-mx5KR9GiD5_JOIj46R5qaVqZ6WtF8u_OEvAqJcM1IpCy_2fsszkAgP65FGbLlVv1wxNFh_Vv5b8K_KoZ2szdmJtOCI4ommDZunH61nESrJ-BmwYnKHfQu0fqdHngk12xhYSf4_wXg',
  },
  craft: {
    eyebrow: 'OUR CRAFT & HERITAGE',
    title: 'Rooted in Tradition, Crafted for Today',
    description:
      'Rooted in the timeless traditions of Eastern perfumery, our journey began with a passion for authenticity and refined taste. We source premium natural essences—from deep, smoky aged oud and rare agarwood to royal saffron, warm amber, and delicate floral extracts. Every blend is crafted with precision, balancing heritage distillation techniques with modern sophistication to create long-lasting, skin-safe fragrances that evolve beautifully throughout the day.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpfyKq-fTIeobDe10wnwUKsCdFkuDC0sCEgReGlXb3uCiLwnlrQmUwHNkdvnTeWr-GpKUV2NTazq_bBnA0mbopwqBESctUoLgcp4UNQJj214y1fnaT3mWnrc4D5FC-aeN3008Myp9DPZtLbmn69XxI10aQBOkn5Ls9H9GFWMWuWS0v2wRcGDLRZiFsaImWqOpZ839tUgFz5ON5WtKpWhPJZYrjqLyXjG0jrMJE2thBcciaj6dO7qzPrJvSXp3XrbhlsIUKg2dlXw',
  },
  whyChoose: {
    feature1Title: '100% Alcohol-Free Purity',
    feature1Desc:
      'Concentrated perfume oils formulated for superior longevity, rich projection, and gentle application on skin.',
    feature2Title: 'Masterful Blends',
    feature2Desc:
      'Thoughtfully balanced notes ranging from dark, magnetic ouds and warm musks to crisp florals and modern Middle Eastern blends.',
    feature3Title: 'Uncompromising Quality',
    feature3Desc:
      'Sourced from ethical distillers and bottled with meticulous attention to presentation and elegance.',
  },
  signature: {
    eyebrow: 'FIND YOUR SIGNATURE',
    title: 'A Fragrance That Tells Your Story',
    description:
      'Whether you are seeking a distinguished oud for special occasions, a soothing daily wear, or an evocative fragrance that speaks of understated luxury, Al Ahad Attars offers an olfactory experience crafted just for you. Discover a scent that tells your story—because your fragrance is truly your signature.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBn1kiFiE9F4b9hfkotXX0gtBtfkxaoqIm3u9f3mIzjHJDAic9Vzthv3R1N-5fwis6V1yDZHyW41nxoExNJAs5F45e8dyhqyK3ZrJ77w2Imc07cML4XX-Q3bfxRJjSDd34LsigxeKQ3vNYtNkMyEMkQUQN3zbHCJO94c6lydw3KbT-UuDJRaSaTrH66Q82srdeO8jwIOVk-ucGL2b1RgeYxrAXiuF-PT9PkM0usauRBb3Y0mxyHoqSilzSVN-2H9VHSv1dYCNm-1A',
    ctaText: 'DISCOVER OUR COLLECTION',
    ctaLink: '/collection',
  },
  cta: {
    eyebrow: 'THE AL AHAD EXPERIENCE',
    title: 'Find Your Signature',
    description:
      'Explore our collection of artisanal attars and pure perfume oils, crafted for those who appreciate authentic fragrance, refined craftsmanship, and understated luxury.',
    button1Text: 'EXPLORE COLLECTIONS',
    button1Link: '/collection',
    button2Text: 'CONTACT US',
    button2Link: '/contact',
  },
};

type ContentType = typeof DEFAULT_CONTENT;

/* ─── Small reusable section-reveal wrapper ────────────────── */
const RevealSection: React.FC<{ children: React.ReactNode; className?: string; threshold?: number }> = ({
  children,
  className = '',
  threshold = 0.12,
}) => {
  const { ref, inView } = useInView<HTMLDivElement>(threshold);
  return (
    <div ref={ref} className={`reveal ${inView ? 'in-view' : ''} ${className}`}>
      {children}
    </div>
  );
};

/* ─── Feature icon SVG paths (minimal line icons) ─────────── */
const FeatureIcons = {
  purity: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.25" />
      <path d="M14 7v7l4 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  blend: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M7 21c0-5 3-9 7-9s7 4 7 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M14 12V6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M10 8l4-4 4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  quality: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <polygon
        points="14,4 16.9,10.1 23.5,11 18.75,15.6 19.8,22.2 14,19 8.2,22.2 9.25,15.6 4.5,11 11.1,10.1"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════
   PAGE COMPONENT
═══════════════════════════════════════════════════════════════ */
export const About: React.FC = () => {
  const [content, setContent] = useState<ContentType>(DEFAULT_CONTENT);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await cmsService.getPublicPage('about');
        if (response.data.contentJson) {
          const data = JSON.parse(response.data.contentJson);
          setContent(prev => ({ ...prev, ...data }));
        }
      } catch (err: any) {
        // 404 = no saved content yet; fall back to defaults silently
        if (err?.response?.status !== 404) {
          console.error('Failed to fetch CMS content for About Us', err);
        }
      }
    };
    fetchContent();
  }, []);

  const { hero, craft, whyChoose, signature, cta } = content;

  const features = [
    { icon: FeatureIcons.purity, title: whyChoose.feature1Title, desc: whyChoose.feature1Desc },
    { icon: FeatureIcons.blend, title: whyChoose.feature2Title, desc: whyChoose.feature2Desc },
    { icon: FeatureIcons.quality, title: whyChoose.feature3Title, desc: whyChoose.feature3Desc },
  ];

  return (
    <main className="flex-grow bg-[#fbf9f5]">
      <SEO
        title="About Al Ahad Attars | Your Fragrance is Your Signature"
        description="Discover Al Ahad Attars—premium alcohol-free artisanal attars and pure perfume oils rooted in the traditions of Eastern perfumery and crafted for modern luxury."
        canonicalUrl="/about"
      />

      {/* ══════════════════════════════════════════════════════
          1. HERO — Cinematic full-viewport
      ══════════════════════════════════════════════════════ */}
      <section
        aria-label="Brand philosophy"
        className="relative w-full min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background image with slow Ken Burns zoom */}
        <div className="absolute inset-0 w-full h-full bg-ink">
          <img
            src={hero.image}
            alt="Cinematic Arabian perfumery interior with ornate attar bottles"
            className="w-full h-full object-cover object-center hero-zoom opacity-70"
          />
          {/* Gradient overlay — bottom-heavy for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/50 to-ink/20" />
          {/* Subtle vignette edges */}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/30 via-transparent to-ink/30" />
        </div>

        {/* Hero text — staggered fade-up */}
        <div className="relative z-10 text-center px-6 md:px-16 max-w-4xl mx-auto py-24 md:py-0">
          <p
            className="text-[10px] md:text-[11px] font-semibold tracking-[0.35em] text-accent uppercase mb-8 opacity-0"
            style={{ animation: 'fadeInUp 0.9s cubic-bezier(.16,1,.3,1) 0.2s forwards' }}
          >
            {hero.eyebrow}
          </p>
          <h1
            className="font-['Playfair_Display'] text-[2.75rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] leading-[1.08] tracking-[-0.02em] font-bold text-white mb-8 opacity-0"
            style={{ animation: 'fadeInUp 1s cubic-bezier(.16,1,.3,1) 0.45s forwards', textShadow: '0 4px 24px rgba(0,0,0,.3)' }}
          >
            {hero.title}
          </h1>
          <p
            className="text-white/75 text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-light opacity-0"
            style={{ animation: 'fadeInUp 1s cubic-bezier(.16,1,.3,1) 0.7s forwards' }}
          >
            {hero.description}
          </p>
          {/* Decorative gold hairline */}
          <div
            className="mt-12 mx-auto w-12 h-px bg-accent opacity-0"
            style={{ animation: 'fadeInUp 1s cubic-bezier(.16,1,.3,1) 0.95s forwards' }}
            aria-hidden="true"
          />
        </div>


      </section>

      {/* ══════════════════════════════════════════════════════
          2. CRAFT & HERITAGE — Editorial split layout
      ══════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="craft-heading"
        className="py-28 md:py-40 bg-[#fbf9f5]"
      >
        <div className="max-w-[1280px] mx-auto px-6 md:px-16">
          <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24 lg:gap-32">
            {/* Text */}
            <RevealSection className="w-full md:w-1/2 order-2 md:order-1">
              <p className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase mb-5">
                {craft.eyebrow}
              </p>
              <h2
                id="craft-heading"
                className="font-['Playfair_Display'] text-[2rem] md:text-[2.75rem] leading-[1.15] tracking-tight text-[#121c2a] mb-7 font-semibold"
              >
                {craft.title}
              </h2>
              {/* Gold accent rule */}
              <div className="w-10 h-px bg-accent mb-7" aria-hidden="true" />
              <p className="text-[#5b5346] text-base md:text-[17px] leading-[1.8] font-light">
                {craft.description}
              </p>
            </RevealSection>

            {/* Image */}
            <RevealSection className="w-full md:w-1/2 order-1 md:order-2 relative">
              <div className="relative">
                {/* Decorative offset block */}
                <div
                  className="absolute -bottom-6 -right-6 w-2/3 h-2/3 bg-accent/8 hidden md:block"
                  aria-hidden="true"
                />
                <div className="relative z-10 aspect-[4/5] overflow-hidden">
                  <img
                    src={craft.image}
                    alt="Artisan hands cradling oud agarwood and saffron — traditional perfumery ingredients"
                    className="w-full h-full object-cover object-center transition-transform duration-[1.5s] ease-out hover:scale-[1.03]"
                    loading="lazy"
                  />
                  {/* Inner subtle vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>

              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. WHY CHOOSE — Three editorial feature blocks
      ══════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="why-heading"
        className="py-24 md:py-32 bg-white border-t border-[#e4dcc8]/60"
      >
        <div className="max-w-[1280px] mx-auto px-6 md:px-16">
          {/* Section header */}
          <RevealSection className="text-center mb-16 md:mb-20">
            <p className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase mb-5">
              WHY CHOOSE AL AHAD ATTARS?
            </p>
            <h2
              id="why-heading"
              className="font-['Playfair_Display'] text-[2rem] md:text-[2.75rem] leading-[1.15] tracking-tight text-[#121c2a] font-semibold max-w-lg mx-auto"
            >
              A Standard You Can Sense
            </h2>
          </RevealSection>

          {/* Feature blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-px bg-transparent md:bg-[#e4dcc8]/50">
            {features.map((feature, i) => (
              <RevealSection
                key={feature.title}
                className={`bg-white px-8 md:px-10 py-12 md:py-14 flex flex-col gap-6 border border-[#e4dcc8]/60 md:border-none ${i < features.length - 1 ? 'border-b md:border-b-0' : ''}`}
                threshold={0.1}
              >
                {/* Top gold rule */}
                <div className="w-8 h-px bg-accent" aria-hidden="true" />
                {/* Icon */}
                <div className="text-accent">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-['Playfair_Display'] text-[1.25rem] leading-snug text-[#121c2a] font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[#5b5346] text-[15px] leading-[1.75] font-light">
                    {feature.desc}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4. FIND YOUR SIGNATURE — Immersive storytelling
      ══════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="signature-heading"
        className="relative py-28 md:py-40 overflow-hidden"
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={signature.image}
            alt="Elegant attar perfume bottles arranged on cream marble with rose petals and oud"
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121c2a]/95 via-[#121c2a]/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-16">
          <div className="max-w-xl">
            <RevealSection>
              <p className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase mb-6">
                {signature.eyebrow}
              </p>
              <h2
                id="signature-heading"
                className="font-['Playfair_Display'] text-[2.25rem] md:text-[3.25rem] leading-[1.1] tracking-tight text-white font-semibold mb-7"
              >
                {signature.title}
              </h2>
              <div className="w-10 h-px bg-accent mb-7" aria-hidden="true" />
              <p className="text-white/70 text-base md:text-[17px] leading-[1.8] font-light mb-10">
                {signature.description}
              </p>
              <Link
                to={signature.ctaLink}
                id="signature-cta"
                className="inline-block btn btn-gold text-[10px] tracking-[0.25em]"
              >
                {signature.ctaText}
              </Link>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          5. BRAND PHILOSOPHY QUOTE — Visual centerpiece
      ══════════════════════════════════════════════════════ */}
      <section
        aria-label="Brand philosophy statement"
        className="bg-[#121c2a] py-32 md:py-48"
      >
        <RevealSection className="max-w-4xl mx-auto px-6 md:px-16 text-center" threshold={0.2}>
          {/* Decorative quotation mark */}
          <div
            className="font-['Playfair_Display'] text-[6rem] md:text-[9rem] leading-none text-accent/15 select-none -mb-8 md:-mb-12"
            aria-hidden="true"
          >
            "
          </div>
          <blockquote>
            <p className="font-['Playfair_Display'] text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] leading-[1.15] tracking-tight text-white font-semibold italic">
              Your Fragrance is Your Signature.
            </p>
          </blockquote>
          {/* Gold hairline */}
          <div className="mt-10 mx-auto w-16 h-px bg-accent" aria-hidden="true" />
          <p className="mt-6 text-[10px] tracking-[0.35em] text-accent/70 uppercase font-semibold">
            Al Ahad Attars
          </p>
        </RevealSection>
      </section>

      {/* ══════════════════════════════════════════════════════
          6. FINAL CTA
      ══════════════════════════════════════════════════════ */}
      <section
        aria-labelledby="cta-heading"
        className="py-20 md:py-28 bg-[#fbf9f5] border-t border-[#e4dcc8]/60"
      >
        <RevealSection className="max-w-[1280px] mx-auto px-6 md:px-16 text-center">
          <p className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase mb-5">
            {cta.eyebrow}
          </p>
          <h2
            id="cta-heading"
            className="font-['Playfair_Display'] text-[2rem] md:text-[2.75rem] leading-[1.15] tracking-tight text-[#121c2a] font-semibold mb-6 max-w-lg mx-auto"
          >
            {cta.title}
          </h2>
          <div className="w-10 h-px bg-accent mx-auto mb-7" aria-hidden="true" />
          <p className="text-[#5b5346] text-base md:text-[17px] leading-[1.8] font-light max-w-md mx-auto mb-12">
            {cta.description}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to={cta.button1Link}
              id="about-cta-primary"
              className="btn btn-gold w-full sm:w-auto text-[10px] tracking-[0.25em]"
            >
              {cta.button1Text}
            </Link>
            <Link
              to={cta.button2Link}
              id="about-cta-secondary"
              className="btn btn-outline w-full sm:w-auto text-[10px] tracking-[0.25em]"
            >
              {cta.button2Text}
            </Link>
          </div>
        </RevealSection>
      </section>
    </main>
  );
};
