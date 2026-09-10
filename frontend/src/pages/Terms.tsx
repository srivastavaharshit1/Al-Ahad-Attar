import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { PolicyRenderer } from '../components/ui/PolicyRenderer';
import { defaultTermsMd } from '../utils/defaultPolicies';

export const Terms: React.FC = () => {
  const { settings, isLoading } = useStoreSettings();

  const policyContent = settings?.termsOfService && settings.termsOfService !== 'Default Terms of Service' 
    ? settings.termsOfService 
    : defaultTermsMd;
  return (
    <main className="flex-grow bg-surface-alt py-16 md:py-24">
      <SEO 
        title="Terms & Conditions | Al Ahad Attars" 
        description="Please read these terms carefully before using the Al Ahad Attars website or placing an order." 
        canonicalUrl="/terms-and-conditions" 
      />
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h1 className="font-headline-lg text-4xl md:text-5xl text-ink text-center mb-4 tracking-tight">
          Terms & Conditions
        </h1>
        <p className="text-center text-text-secondary font-body-md text-lg mb-4">
          Please read these terms carefully before using the Al Ahad Attars website or placing an order.
        </p>
        <PolicyRenderer content={policyContent} />

        <div className="bg-surface p-8 md:p-12 rounded-2xl shadow-sm border border-border mt-8">
          <section className="text-center scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-xl md:text-2xl text-ink mb-4">Questions About These Terms?</h2>
            <p className="text-text-secondary font-body-md mb-8 max-w-2xl mx-auto leading-relaxed">
              If you have any questions or concerns regarding these Terms & Conditions, please contact Al Ahad Attars through our Customer Support or Contact page.
            </p>
            <Link to="/contact" className="btn btn-gold">
              Contact Us
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
};
