import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <main className="flex-grow flex items-center justify-center w-full min-h-screen px-margin-mobile md:px-margin-desktop py-section-gap max-w-container-max mx-auto relative bg-surface">
      {/* Subtle background decorative elements */}
      <div className="absolute inset-0 pointer-events-none flex justify-center items-center opacity-[0.03]">
        <span className="material-symbols-outlined text-[400px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          water_drop
        </span>
      </div>
      
      <div className="relative z-10 max-w-2xl text-center flex flex-col items-center">
        <div className="mb-8 animate-[fadeInUp_0.8s_ease-out_forwards]">
          <span className="font-display-lg-mobile md:font-display-lg text-primary block mb-4">404</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6">Lost in the Scents?</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto">
            The page you are looking for has vanished like a fleeting fragrance. Let us guide you back to our curated collections.
          </p>
        </div>
        
        <div className="w-16 h-[1px] bg-outline-variant my-8 animate-[fadeInUp_0.8s_ease-out_forwards] [animation-delay:100ms] opacity-0 fill-mode-forwards"></div>
        
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-4 w-full sm:w-auto animate-[fadeInUp_0.8s_ease-out_forwards] [animation-delay:200ms] opacity-0 fill-mode-forwards">
          <Link to="/" className="inline-flex items-center justify-center bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded hover:bg-surface-tint transition-colors duration-300 shadow-sm hover:shadow-md">
            Home
          </Link>
          <Link to="/collection" className="inline-flex items-center justify-center border border-secondary text-secondary font-label-md text-label-md px-8 py-3 rounded hover:bg-surface-variant transition-colors duration-300">
            Attars
          </Link>
          <Link to="/collection" className="inline-flex items-center justify-center border border-secondary text-secondary font-label-md text-label-md px-8 py-3 rounded hover:bg-surface-variant transition-colors duration-300">
            Bakhoor
          </Link>
        </div>
      </div>
    </main>
  );
};
