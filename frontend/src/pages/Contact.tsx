import React, { useState } from 'react';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { contactService } from '../services/contactService';
import toast from 'react-hot-toast';
import { SEO } from '../components/seo/SEO';

export const Contact: React.FC = () => {
  const { settings } = useStoreSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    inquiryType: 'general',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await contactService.submitInquiry(formData);
      toast.success('Your message has been sent successfully!');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        inquiryType: 'general',
        message: ''
      });
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-16">
      <SEO 
        title="Contact Us | Al Ahad Attars"
        description="Get in touch with Al Ahad Attars for bespoke inquiries, private consultations, or any questions regarding our premium heritage collections."
        canonicalUrl="/contact"
      />
      {/* Header Section */}
      <header className="text-center mb-16 md:mb-24 animate-[fadeIn_0.8s_ease-out_forwards]">
        <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-4 block">Get in Touch</span>
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary mb-6">Contact Us</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          We invite you to reach out for bespoke inquiries, private consultations, or any questions regarding our heritage collections.
        </p>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Contact Form */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-8 md:p-12 border border-outline-variant rounded shadow-[0_10px_30px_rgba(31,41,55,0.04)] animate-[fadeIn_0.8s_ease-out_forwards] [animation-delay:0.2s] opacity-0 fill-mode-forwards">
          <h2 className="font-headline-lg text-headline-lg text-primary mb-8">Send a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="field-label" htmlFor="firstName">First Name</label>
                <input className="field-input" id="firstName" name="firstName" required type="text" value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="flex flex-col">
                <label className="field-label" htmlFor="lastName">Last Name</label>
                <input className="field-input" id="lastName" name="lastName" required type="text" value={formData.lastName} onChange={handleChange} />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="field-label" htmlFor="email">Email Address</label>
              <input className="field-input" id="email" name="email" required type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className="flex flex-col">
              <label className="field-label" htmlFor="inquiryType">Inquiry Type</label>
              <select className="field-input" id="inquiryType" name="inquiryType" value={formData.inquiryType} onChange={handleChange}>
                <option value="general">General Inquiry</option>
                <option value="bespoke">Bespoke Consultation</option>
                <option value="wholesale">Wholesale</option>
                <option value="press">Press &amp; Media</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="field-label" htmlFor="message">Message</label>
              <textarea className="field-input resize-none" id="message" name="message" required rows={5} value={formData.message} onChange={handleChange}></textarea>
            </div>
            <button disabled={isSubmitting} className="btn btn-primary w-full md:w-auto" type="submit">
              {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
            </button>
          </form>
        </div>

        {/* Concierge & Boutiques */}
        <div className="lg:col-span-5 flex flex-col gap-gutter animate-[fadeIn_0.8s_ease-out_forwards] [animation-delay:0.4s] opacity-0 fill-mode-forwards">
          {/* Concierge Card */}
          <div className="bg-ink text-white p-8 border border-outline-variant rounded shadow-[0_10px_30px_rgba(31,41,55,0.04)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500"></div>
            <div className="relative z-10 flex flex-col h-full justify-center">
              <span className="material-symbols-outlined text-accent text-4xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
              <h3 className="font-headline-md text-headline-md mb-2 text-white">Concierge Support</h3>
              <p className="font-body-md text-body-md mb-6 text-white/80 leading-relaxed">Experience personalized assistance for your olfactory journey. Connect with our experts via WhatsApp.</p>
              <a
                href={settings?.whatsappNumber ? `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-widest border-b border-accent pb-1 self-start text-white transition-colors hover:text-accent focus-visible:outline-none focus-visible:text-accent"
              >
                <span className="material-symbols-outlined text-xl">forum</span>
                Message on WhatsApp
              </a>
            </div>
          </div>

          {/* Dynamic Boutique Location */}
          <div className="bg-surface-container-lowest p-8 border border-outline-variant rounded shadow-[0_10px_30px_rgba(31,41,55,0.04)]">
            <h3 className="font-headline-md text-headline-md text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              {settings?.storeName || 'Our Boutique'}
            </h3>
            
            {(settings?.businessAddress || settings?.city || settings?.country) && (
              <address className="not-italic font-body-md text-body-md text-on-surface-variant mb-4 leading-relaxed">
                {settings?.businessAddress && <>{settings.businessAddress}<br/></>}
                {settings?.city}{settings?.state && `, ${settings.state}`} {settings?.pincode}<br/>
                {settings?.country}
              </address>
            )}

            {settings?.businessHours && (
              <p className="font-body-md text-body-md text-on-surface-variant mb-2 leading-relaxed whitespace-pre-wrap">
                <span className="font-medium">Hours:</span> {settings.businessHours}
              </p>
            )}

            {settings?.phoneNumber && (
              <p className="font-body-md text-body-md text-on-surface-variant mb-2 leading-relaxed">
                <span className="font-medium">Phone:</span> {settings.phoneNumber}
              </p>
            )}

            {settings?.emailAddress && (
              <p className="font-body-md text-body-md text-on-surface-variant mb-4 leading-relaxed">
                <span className="font-medium">Email:</span> {settings.emailAddress}
              </p>
            )}

            {settings?.mapEmbedUrl && (
              <div className="mt-4 w-full h-48 bg-surface-dim rounded overflow-hidden">
                <iframe 
                  src={settings.mapEmbedUrl} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Maps Location"
                  className="grayscale hover:grayscale-0 transition-all duration-500"
                ></iframe>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
