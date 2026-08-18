import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cmsService } from '../services/cmsService';

export const About: React.FC = () => {
  const [content, setContent] = useState({
    hero: {
      title: 'The Alchemy of Stillness',
      subtitle: 'Our Philosophy',
      description: 'Where centuries of traditional Arabic perfumery converge with the quiet restraint of modern luxury. We craft not just scents, but moments of profound reflection.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhki3C6gDAjRNyDBV8U_XwUQ2ImFWQtx2MDVAV6-txhuaUJJusdbUKfIx4WqlqYFHUVOvPX_RewEzDEdfGBHF0Qd3ZR8nZvMPR2pMnxPXwUpfZ7QfPBArUJstd22K36Xh8-mx5KR9GiD5_JOIj46R5qaVqZ6WtF8u_OEvAqJcM1IpCy_2fsszkAgP65FGbLlVv1wxNFh_Vv5b8K_KoZ2szdmJtOCI4ommDZunH61nESrJ-BmwYnKHfQu0fqdHngk12xhYSf4_wXg'
    },
    heritage: {
      title: 'Our Heritage',
      subtitle: 'Our Story',
      largeBlockTitle: 'Roots in Antiquity',
      largeBlockText: 'Our lineage traces back to the ancient incense routes. Based in Ayodhya, the sacred land of Lord Rama, we preserve techniques passed down through generations of master distillers to bring divine fragrances to the world.',
      largeBlockImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpfyKq-fTIeobDe10wnwUKsCdFkuDC0sCEgReGlXb3uCiLwnlrQmUwHNkdvnTeWr-GpKUV2NTazq_bBnA0mbopwqBESctUoLgcp4UNQJj214y1fnaT3mWnrc4D5FC-aeN3008Myp9DPZtLbmn69XxI10aQBOkn5Ls9H9GFWMWuWS0v2wRcGDLRZiFsaImWqOpZ839tUgFz5ON5WtKpWhPJZYrjqLyXjG0jrMJE2thBcciaj6dO7qzPrJvSXp3XrbhlsIUKg2dlXw',
      smallBlock1Title: 'Pure Essence',
      smallBlock1Text: 'We source only the absolute highest grade of raw materials—rare ouds, wild-harvested resins, and pristine florals.',
      smallBlock2Title: 'Time Honored',
      smallBlock2Text: 'True luxury cannot be rushed. Our attars undergo extensive maturation processes in optimal conditions to achieve their final, complex profiles.',
      mediumBlockTitle: 'A Modern Interpretation',
      mediumBlockText: 'While our roots are traditional, our vision is contemporary. We strip away the unnecessary, focusing on the profound beauty of singular, exquisite notes allowed to breathe in a minimalist composition.',
      mediumBlockImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn1kiFiE9F4b9hfkotXX0gtBtfkxaoqIm3u9f3mIzjHJDAic9Vzthv3R1N-5fwis6V1yDZHyW41nxoExNJAs5F45e8dyhqyK3ZrJ77w2Imc07cML4XX-Q3bfxRJjSDd34LsigxeKQ3vNYtNkMyEMkQUQN3zbHCJO94c6lydw3KbT-UuDJRaSaTrH66Q82srdeO8jwIOVk-ucGL2b1RgeYxrAXiuF-PT9PkM0usauRBb3Y0mxyHoqSilzSVN-2H9VHSv1dYCNm-1A'
    },
    sustainability: {
      title: 'Sustainability & Ethics',
      subtitle: 'Intentional Sourcing',
      description: 'The earth offers its most precious aromas, and we believe in honoring that gift through radical transparency and ethical stewardship. We partner directly with artisan growers and distillers, ensuring fair compensation and sustainable harvesting practices.',
      points: [
        'Traceable botanical origins.',
        'Cruelty-free and vegan formulations.',
        'Minimalist, recyclable packaging.'
      ],
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyi8RPVcL4Byn0Dysy6Q9rZUhyhxRz6lyNpnPjXF6L8SA60toE6Pl4yg-35W_CFodPYFEGszFBO00WrGVEoQmjxIRP3zgDqbPdMlzP5n1i8k5cEthoxPCBC7MNAftEEd-wpZN9pR6VCieuiw5ynrp4PZJ9gl6oFmUPuOmNsqMv002xo0mL_EyJ_dCYTU1GheMSTkStAVJUburAJ1NCrf3Ocq9ZsZNQ0XIPQAr0bmMllR1VUR7NTxstQYNuzawvicUrrcvHm4UnIg',
      buttonText: 'Read Our Manifesto',
      buttonLink: '/contact'
    },
    cta: {
      title: 'Experience the Craft',
      description: 'Explore our foundational collections or inquire about our bespoke olfactory design services.',
      button1Text: 'Explore Collections',
      button1Link: '/collection',
      button2Text: 'Bespoke Inquiries',
      button2Link: '/contact'
    }
  });

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await cmsService.getPublicPage('about');
        if (response.data.contentJson) {
          const data = JSON.parse(response.data.contentJson);
          setContent(prev => ({ ...prev, ...data }));
        }
      } catch (err: any) {
        // If it's a 404, we just use the default hardcoded content
        console.error('Failed to fetch CMS content for About Us', err);
      }
    };
    fetchContent();
  }, []);

  return (
    <main className="flex-grow">
      {/* Hero Section */}
      <section className="relative w-full h-[614px] md:h-[819px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-ink z-0">
          <img
            src={content.hero.image}
            alt={content.hero.title}
            className="w-full h-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20"></div>
        </div>
        <div className="relative z-10 text-center px-margin-mobile md:px-margin-desktop max-w-3xl mx-auto">
          <p className="font-label-sm text-label-sm text-accent uppercase tracking-widest mb-6">{content.hero.subtitle}</p>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-8" style={{ textShadow: '0 2px 12px rgba(0,0,0,.25)' }}>{content.hero.title}</h1>
          <p className="font-body-lg text-body-lg text-white/80 max-w-2xl mx-auto leading-relaxed">{content.hero.description}</p>
        </div>
      </section>



      {/* Sustainability & Ethics */}
      <section className="py-24 md:py-32 bg-surface-bright border-t border-b border-outline-variant/30">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
            <div className="w-full md:w-5/12 order-2 md:order-1">
              <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-4">{content.sustainability.subtitle}</p>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-6">{content.sustainability.title}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
                {content.sustainability.description}
              </p>
              <ul className="space-y-4 mb-10">
                {content.sustainability.points.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="material-symbols-outlined text-primary mr-3 mt-1">check</span>
                    <span className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
              <Link to={content.sustainability.buttonLink} className="inline-block bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-DEFAULT transition-colors duration-300 hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                {content.sustainability.buttonText}
              </Link>
            </div>
            <div className="w-full md:w-7/12 order-1 md:order-2 relative">
              <div className="aspect-[4/5] md:aspect-[3/4] w-full rounded-xl overflow-hidden relative z-10 border border-outline-variant">
                <img 
                  src={content.sustainability.image} 
                  alt={content.sustainability.title} 
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
        <h2 className="font-headline-md text-headline-md text-on-surface mb-6">{content.cta.title}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-10 max-w-md mx-auto leading-relaxed">{content.cta.description}</p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link to={content.cta.button1Link} className="w-full sm:w-auto bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-DEFAULT transition-colors duration-300 hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 text-center">
            {content.cta.button1Text}
          </Link>
          <Link to={content.cta.button2Link} className="w-full sm:w-auto bg-transparent text-on-surface font-label-md text-label-md px-8 py-3 rounded-DEFAULT border border-outline transition-colors duration-300 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 text-center">
            {content.cta.button2Text}
          </Link>
        </div>
      </section>
    </main>
  );
};
