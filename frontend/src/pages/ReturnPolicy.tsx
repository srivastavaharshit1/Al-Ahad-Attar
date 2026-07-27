import React from 'react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const ReturnPolicy: React.FC = () => {
  const { settings, isLoading } = useStoreSettings();

  return (
    <main className="flex-grow py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display-lg text-display-lg text-on-surface mb-8">Shipping & Return Policy</h1>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-surface-container rounded w-3/4"></div>
            <div className="h-4 bg-surface-container rounded w-5/6"></div>
            <div className="h-4 bg-surface-container rounded w-full"></div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none text-on-surface-variant whitespace-pre-wrap">
            {settings?.returnPolicy || 'Return policy not available.'}
          </div>
        )}
      </div>
    </main>
  );
};
