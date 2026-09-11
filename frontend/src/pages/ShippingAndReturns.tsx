import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { PolicyRenderer } from '../components/ui/PolicyRenderer';
import { defaultShippingMd } from '../utils/defaultPolicies';

export const ShippingAndReturns: React.FC = () => {
  const { settings } = useStoreSettings();

  const policyContent = settings?.returnPolicy && settings.returnPolicy !== 'Default Return Policy' 
    ? settings.returnPolicy 
    : defaultShippingMd;
  return (
    <main className="flex-grow bg-surface-alt py-16 md:py-24">
      <SEO 
        title="Shipping & Returns | Al Ahad Attars" 
        description="Everything you need to know about delivery and order-related issues." 
        canonicalUrl="/shipping-and-returns" 
      />
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h1 className="font-headline-lg text-4xl md:text-5xl text-ink text-center mb-4 tracking-tight">
          Shipping & Returns
        </h1>
        <p className="text-center text-text-secondary font-body-md text-lg mb-12">
          Everything you need to know about delivery and order-related issues.
        </p>

        <PolicyRenderer content={policyContent} />

        <div className="bg-surface p-8 md:p-12 rounded-2xl shadow-sm border border-border mt-8">
          <section className="text-center scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-xl md:text-2xl text-ink mb-4">NEED HELP WITH YOUR ORDER?</h2>
            <p className="text-text-secondary font-body-md mb-8 max-w-2xl mx-auto leading-relaxed">
              If you have any questions or experience an issue with your order, our Customer Support team is here to help. Please contact us with your order number and a description of the issue, and our team will review your request.
            </p>
            <Link to="/contact" className="btn btn-gold">
              Contact Support
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
};
