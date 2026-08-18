import React, { useState } from 'react';
import { SectionsTab } from './homepage/SectionsTab';
import { HeroTab } from './homepage/HeroTab';
import { PromoTab } from './homepage/PromoTab';
import { TestimonialsTab } from './homepage/TestimonialsTab';
import { WhyChooseUsTab } from './homepage/WhyChooseUsTab';
import { CategoriesTab } from './homepage/CategoriesTab';
import { AdminAboutUs } from './AdminAboutUs';

export const Homepage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sections' | 'hero' | 'categories' | 'promo' | 'testimonials' | 'why_choose' | 'about_us'>('sections');

  const renderTabs = () => (
    <div className="flex gap-1 border-b border-outline-variant mb-6 overflow-x-auto">
      {[
        { id: 'sections', label: 'Layout & Sections' },
        { id: 'hero', label: 'Hero Banners' },
        { id: 'categories', label: 'Categories' },
        { id: 'promo', label: 'Promo Banners' },
        { id: 'testimonials', label: 'Testimonials' },
        { id: 'why_choose', label: 'Why Choose Us' },
        { id: 'about_us', label: 'About Us' }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          className={`px-4 py-3 font-label-sm text-label-sm uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
            activeTab === tab.id
              ? 'text-accent border-accent font-semibold'
              : 'text-on-surface-variant border-transparent hover:text-accent hover:border-accent/40'
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
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Storefront UI CMS</h1>
          <p className="font-body-md text-on-surface-variant">Control the layout and dynamic content of your storefront and pages.</p>
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
        {activeTab === 'about_us' && <AdminAboutUs />}
      </div>
      
      <div className="h-section-gap"></div>
    </div>
  );
};
