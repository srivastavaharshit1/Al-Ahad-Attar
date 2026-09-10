import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { PolicyRenderer } from '../components/ui/PolicyRenderer';
import { defaultPrivacyPolicyMd } from '../utils/defaultPolicies';

export const PrivacyPolicy: React.FC = () => {
  const { settings, isLoading } = useStoreSettings();

  const policyContent = settings?.privacyPolicy && settings.privacyPolicy !== 'Default Privacy Policy' 
    ? settings.privacyPolicy 
    : defaultPrivacyPolicyMd;
  return (
    <main className="flex-grow bg-surface-alt py-16 md:py-24">
      <SEO 
        title="Privacy Policy | Al Ahad Attars" 
        description="Learn how Al Ahad Attars collects, uses, and protects your information when you use our website." 
        canonicalUrl="/privacy-policy" 
      />
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h1 className="font-headline-lg text-4xl md:text-5xl text-ink text-center mb-4 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-center text-text-secondary font-body-md text-lg mb-12">
          Your privacy matters to us. Learn how Al Ahad Attars collects, uses, and protects your information when you use our website.
        </p>

        <PolicyRenderer content={policyContent} />

        <div className="bg-surface p-8 md:p-12 rounded-2xl shadow-sm border border-border mt-8">
          <section className="text-center scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-xl md:text-2xl text-ink mb-4">Contact Us</h2>
            <p className="text-text-secondary font-body-md mb-8 max-w-2xl mx-auto leading-relaxed">
              If you have questions, concerns, or requests regarding this policy, please contact Al Ahad Attars through our Customer Support or Contact page.
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
