import React, { useState } from 'react';
import { SectionsTab } from './homepage/SectionsTab';
import { HeroTab } from './homepage/HeroTab';
import { PromoTab } from './homepage/PromoTab';
import { TestimonialsTab } from './homepage/TestimonialsTab';
import { WhyChooseUsTab } from './homepage/WhyChooseUsTab';
import { CategoriesTab } from './homepage/CategoriesTab';

export const Homepage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sections' | 'hero' | 'categories' | 'promo' | 'testimonials' | 'why_choose'>('sections');

  const renderTabs = () => (
    <div className="flex space-x-1 border-b border-outline-variant mb-6 overflow-x-auto pb-1">
      {[
        { id: 'sections', label: 'Layout & Sections' },
        { id: 'hero', label: 'Hero Banners' },
        { id: 'categories', label: 'Categories' },
        { id: 'promo', label: 'Promo Banners' },
        { id: 'testimonials', label: 'Testimonials' },
        { id: 'why_choose', label: 'Why Choose Us' }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`px-4 py-3 font-label-md transition-colors whitespace-nowrap ${
            activeTab === tab.id 
              ? 'text-primary border-b-2 border-primary bg-primary/5' 
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-headline-md text-on-surface mb-2">Homepage CMS</h1>
          <p className="font-body-md text-on-surface-variant">Control the layout and dynamic content of your storefront.</p>
        </div>
      </div>

      {renderTabs()}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        {activeTab === 'sections' && <SectionsTab />}
        {activeTab === 'hero' && <HeroTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'promo' && <PromoTab />}
        {activeTab === 'testimonials' && <TestimonialsTab />}
        {activeTab === 'why_choose' && <WhyChooseUsTab />}
      </div>
      
      <div className="h-section-gap"></div>
    </div>
  );
};
