import React from 'react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <main className="flex-grow">
      {/* Hero Section */}
      <section className="relative w-full h-[614px] md:h-[819px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-ink z-0">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhki3C6gDAjRNyDBV8U_XwUQ2ImFWQtx2MDVAV6-txhuaUJJusdbUKfIx4WqlqYFHUVOvPX_RewEzDEdfGBHF0Qd3ZR8nZvMPR2pMnxPXwUpfZ7QfPBArUJstd22K36Xh8-mx5KR9GiD5_JOIj46R5qaVqZ6WtF8u_OEvAqJcM1IpCy_2fsszkAgP65FGbLlVv1wxNFh_Vv5b8K_KoZ2szdmJtOCI4ommDZunH61nESrJ-BmwYnKHfQu0fqdHngk12xhYSf4_wXg"
            alt="Master perfumer in workshop"
            className="w-full h-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20"></div>
        </div>
        <div className="relative z-10 text-center px-margin-mobile md:px-margin-desktop max-w-3xl mx-auto">
          <p className="font-label-sm text-label-sm text-accent uppercase tracking-widest mb-6">Our Philosophy</p>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-8" style={{ textShadow: '0 2px 12px rgba(0,0,0,.25)' }}>The Alchemy of Stillness</h1>
          <p className="font-body-lg text-body-lg text-white/80 max-w-2xl mx-auto leading-relaxed">Where centuries of traditional Arabic perfumery converge with the quiet restraint of modern luxury. We craft not just scents, but moments of profound reflection.</p>
        </div>
      </section>

      {/* Our Heritage (Bento Grid) */}
      <section className="py-24 md:py-32 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="mb-16 text-center md:text-left">
          <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-4 block">Our Story</span>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Our Heritage</h2>
          <div className="h-px w-24 bg-outline-variant mx-auto md:mx-0"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Large featured block */}
          <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(31,41,55,0.04)] transition-shadow duration-500 group relative min-h-[400px]">
            <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpfyKq-fTIeobDe10wnwUKsCdFkuDC0sCEgReGlXb3uCiLwnlrQmUwHNkdvnTeWr-GpKUV2NTazq_bBnA0mbopwqBESctUoLgcp4UNQJj214y1fnaT3mWnrc4D5FC-aeN3008Myp9DPZtLbmn69XxI10aQBOkn5Ls9H9GFWMWuWS0v2wRcGDLRZiFsaImWqOpZ839tUgFz5ON5WtKpWhPJZYrjqLyXjG0jrMJE2thBcciaj6dO7qzPrJvSXp3XrbhlsIUKg2dlXw" 
                alt="Antique copper alembic" 
                className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-105" 
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/25 to-transparent z-10"></div>
            <div className="absolute bottom-0 left-0 p-8 z-20 text-on-primary">
              <h3 className="font-headline-md text-headline-md mb-2">Roots in Antiquity</h3>
              <p className="font-body-md text-body-md text-on-primary/80 max-w-md leading-relaxed">Our lineage traces back to the ancient incense routes. Based in Ayodhya, the sacred land of Lord Rama, we preserve techniques passed down through generations of master distillers to bring divine fragrances to the world.</p>
            </div>
          </div>

          {/* Small block 1 */}
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col justify-center hover:shadow-[0_10px_30px_rgba(31,41,55,0.04)] transition-shadow">
            <span className="material-symbols-outlined text-primary text-4xl mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Pure Essence</h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">We source only the absolute highest grade of raw materials—rare ouds, wild-harvested resins, and pristine florals.</p>
          </div>

          {/* Small block 2 */}
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col justify-center hover:shadow-[0_10px_30px_rgba(31,41,55,0.04)] transition-shadow">
            <span className="material-symbols-outlined text-primary text-4xl mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_empty</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Time Honored</h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">True luxury cannot be rushed. Our attars undergo extensive maturation processes in optimal conditions to achieve their final, complex profiles.</p>
          </div>

          {/* Medium block */}
          <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(31,41,55,0.04)] group relative min-h-[300px]">
            <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBn1kiFiE9F4b9hfkotXX0gtBtfkxaoqIm3u9f3mIzjHJDAic9Vzthv3R1N-5fwis6V1yDZHyW41nxoExNJAs5F45e8dyhqyK3ZrJ77w2Imc07cML4XX-Q3bfxRJjSDd34LsigxeKQ3vNYtNkMyEMkQUQN3zbHCJO94c6lydw3KbT-UuDJRaSaTrH66Q82srdeO8jwIOVk-ucGL2b1RgeYxrAXiuF-PT9PkM0usauRBb3Y0mxyHoqSilzSVN-2H9VHSv1dYCNm-1A" 
                alt="Raw perfume ingredients" 
                className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-105" 
              />
            </div>
            <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm z-10 flex flex-col justify-center p-12 transition-opacity duration-500 group-hover:bg-surface-container-lowest/90">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-4">A Modern Interpretation</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-lg leading-relaxed">While our roots are traditional, our vision is contemporary. We strip away the unnecessary, focusing on the profound beauty of singular, exquisite notes allowed to breathe in a minimalist composition.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability & Ethics */}
      <section className="py-24 md:py-32 bg-surface-bright border-t border-b border-outline-variant/30">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
            <div className="w-full md:w-5/12 order-2 md:order-1">
              <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">Intentional Sourcing</p>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-6">Sustainability &amp; Ethics</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
                The earth offers its most precious aromas, and we believe in honoring that gift through radical transparency and ethical stewardship. We partner directly with artisan growers and distillers, ensuring fair compensation and sustainable harvesting practices.
              </p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-primary mr-3 mt-1">check</span>
                  <span className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Traceable botanical origins.</span>
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-primary mr-3 mt-1">check</span>
                  <span className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Cruelty-free and vegan formulations.</span>
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-primary mr-3 mt-1">check</span>
                  <span className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Minimalist, recyclable packaging.</span>
                </li>
              </ul>
              <Link to="/contact" className="inline-block bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-DEFAULT transition-colors duration-300 hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                Read Our Manifesto
              </Link>
            </div>
            <div className="w-full md:w-7/12 order-1 md:order-2 relative">
              <div className="aspect-[4/5] md:aspect-[3/4] w-full rounded-xl overflow-hidden relative z-10 border border-outline-variant">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyi8RPVcL4Byn0Dysy6Q9rZUhyhxRz6lyNpnPjXF6L8SA60toE6Pl4yg-35W_CFodPYFEGszFBO00WrGVEoQmjxIRP3zgDqbPdMlzP5n1i8k5cEthoxPCBC7MNAftEEd-wpZN9pR6VCieuiw5ynrp4PZJ9gl6oFmUPuOmNsqMv002xo0mL_EyJ_dCYTU1GheMSTkStAVJUburAJ1NCrf3Ocq9ZsZNQ0XIPQAr0bmMllR1VUR7NTxstQYNuzawvicUrrcvHm4UnIg" 
                  alt="Artisan harvesting botanicals" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="absolute -bottom-8 -left-8 w-2/3 h-2/3 bg-tertiary-fixed/20 rounded-xl z-0 hidden md:block"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 px-margin-mobile md:px-margin-desktop text-center">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Experience the Craft</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-10 max-w-md mx-auto leading-relaxed">Explore our foundational collections or inquire about our bespoke olfactory design services.</p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link to="/collection" className="w-full sm:w-auto bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-DEFAULT transition-colors duration-300 hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 text-center">
            Explore Collections
          </Link>
          <Link to="/contact" className="w-full sm:w-auto bg-transparent text-on-surface font-label-md text-label-md px-8 py-3 rounded-DEFAULT border border-outline transition-colors duration-300 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 text-center">
            Bespoke Inquiries
          </Link>
        </div>
      </section>
    </main>
  );
};
