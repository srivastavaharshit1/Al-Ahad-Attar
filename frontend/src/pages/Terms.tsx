import React from 'react';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useInView } from '../hooks/useInView';

export const Terms: React.FC = () => {
  const { settings, isLoading } = useStoreSettings();
  const { ref, inView } = useInView();

  return (
    <main className="flex-grow py-10 md:py-16 px-margin-mobile md:px-margin-desktop w-full bg-background">
      <div ref={ref} className={`max-w-[480px] mx-auto reveal ${inView ? 'in-view' : ''}`}>
        <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-4 block">Legal</span>
        <h1 className="font-headline-lg text-headline-lg md:text-4xl text-on-surface mb-10">Terms of Service</h1>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-surface-container rounded w-3/4"></div>
            <div className="h-4 bg-surface-container rounded w-5/6"></div>
            <div className="h-4 bg-surface-container rounded w-full"></div>
          </div>
        ) : (
          <div className="font-body-md text-on-surface-variant leading-[1.7] whitespace-pre-wrap">
            {settings?.termsOfService || 'Terms of service not available.'}
          </div>
        )}
      </div>
    </main>
  );
};
