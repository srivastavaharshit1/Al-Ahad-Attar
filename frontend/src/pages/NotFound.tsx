import React from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../hooks/useInView';

export const NotFound: React.FC = () => {
  const { ref, inView } = useInView();

  return (
    <main className="flex-grow flex items-center justify-center w-full min-h-screen px-margin-mobile md:px-margin-desktop py-section-gap max-w-container-max mx-auto relative bg-background">
      {/* Subtle background decorative element */}
      <div className="absolute inset-0 pointer-events-none flex justify-center items-center opacity-[0.03]">
        <span className="material-symbols-outlined text-[400px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          water_drop
        </span>
      </div>

      <div ref={ref} className={`relative z-10 max-w-2xl text-center flex flex-col items-center reveal ${inView ? 'in-view' : ''}`}>
        <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-accent text-2xl">search_off</span>
        </div>

        <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.4em] mb-4 block">Error 404</span>
        <h1 className="font-headline-lg text-headline-lg md:text-4xl text-on-surface mb-6 tracking-wide uppercase">
          Lost in the Scents
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mx-auto mb-10 leading-relaxed">
          The page you are looking for has vanished like a fleeting fragrance. Let us guide you back to our curated collections.
        </p>

        <div className="w-16 h-[1px] bg-outline-variant mb-10"></div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto">
          <Link to="/" className="btn btn-primary">
            Return Home
          </Link>
          <Link to="/category/attars" className="btn btn-outline">
            Shop Attars
          </Link>
          <Link to="/category/bakhoor" className="btn btn-outline">
            Shop Bakhoor
          </Link>
        </div>
      </div>
    </main>
  );
};
