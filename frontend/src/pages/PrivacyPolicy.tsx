import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';

export const PrivacyPolicy: React.FC = () => {
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

        <div className="bg-surface p-8 md:p-12 rounded-2xl shadow-sm border border-border">
          <div className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <p className="text-text font-body-md leading-relaxed font-light mb-4">
              At Al Ahad Attars, we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains what information we may collect, how we use it, and how we protect it when you visit our website, place an order, or contact us.
            </p>
            <p className="text-text font-body-md leading-relaxed font-light">
              By using our website, you acknowledge the practices described in this Privacy Policy.
            </p>
          </div>

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Information We Collect</h2>
            <div className="space-y-8 text-text font-body-md leading-relaxed font-light">
              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Personal Information</h3>
                <p>When you place an order, contact us, or interact with certain features of our website, we may collect information such as your name, email address, phone number, billing address, shipping address, and order details.</p>
              </div>
              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Order & Transaction Information</h3>
                <p>We may collect information related to your purchases, including products ordered, order amount, order status, delivery information, and transaction-related details necessary to process your order.</p>
              </div>
              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Customer Support Information</h3>
                <p>When you contact our Customer Support team, we may collect the information you provide, including your order number, contact details, messages, photographs, or other information necessary to assist you.</p>
              </div>
              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Website Usage Information</h3>
                <p>Depending on how our website is configured, we may collect limited technical or usage information such as browser type, device information, IP address, and general interaction with our website.</p>
              </div>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">How We Use Your Information</h2>
            <div className="space-y-6 text-text font-body-md leading-relaxed font-light">
              <p>We may use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Process and fulfil your orders</li>
                <li>Arrange delivery of purchased products</li>
                <li>Send order confirmations and shipping updates</li>
                <li>Respond to customer support requests</li>
                <li>Process eligible cancellations, replacements, or refunds</li>
                <li>Improve our website, products, and customer experience</li>
                <li>Prevent fraud, misuse, or unauthorized activity</li>
                <li>Maintain the security and functionality of our website</li>
                <li>Comply with applicable legal and regulatory requirements</li>
              </ul>
              <p>We use personal information only for legitimate business purposes and to provide the services you request.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Payment Information</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Payments made through our website may be processed by third-party payment service providers. Payment information is handled by the applicable payment provider according to its own security and privacy practices.</p>
              <p>Al Ahad Attars does not request or require customers to share complete payment card details through customer support channels.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Shipping & Delivery</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>To fulfil your orders, we may share necessary information such as your name, phone number, and delivery address with courier or logistics partners responsible for delivering your order.</p>
              <p>These details are shared only to the extent reasonably necessary to provide delivery services.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Third-Party Services</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>We may rely on trusted third-party service providers for services such as payment processing, website hosting, order delivery, communication, security, or other operational requirements.</p>
              <p>These providers may process information only as necessary to provide their services to us or to fulfil your order.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Cookies & Similar Technologies</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Our website may use cookies or similar technologies to support essential website functionality, remember preferences, improve website performance, and understand how visitors interact with the website.</p>
              <p>Depending on your browser or device settings, you may be able to control or disable cookies. Disabling certain cookies may affect some website functionality.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Data Security</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>We take reasonable technical and organizational measures to protect personal information against unauthorized access, misuse, loss, alteration, or disclosure.</p>
              <p>However, no method of transmission or electronic storage can be guaranteed to be completely secure. While we work to protect your information, we cannot guarantee absolute security.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Data Retention</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>We retain personal information only for as long as reasonably necessary to fulfil the purposes for which it was collected, provide our services, maintain business and transaction records, resolve disputes, and comply with applicable legal requirements.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Your Privacy Choices</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>You may contact Al Ahad Attars if you believe the personal information we hold about you is inaccurate or if you have questions about how your information is being used.</p>
              <p>If you receive promotional communications from us, you may opt out where an unsubscribe option is provided.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Children's Privacy</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Our website is intended for general consumers and is not specifically directed toward children. We do not knowingly collect personal information from children for the purpose of providing products or services.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Third-Party Links</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Our website may contain links to third-party websites or services. We are not responsible for the privacy practices, content, or security of third-party websites. We encourage you to review their privacy policies before providing personal information.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">Changes to This Privacy Policy</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>We may update this Privacy Policy from time to time to reflect changes in our business, website, services, or applicable requirements.</p>
              <p>Any updated version will be published on this page with a revised 'Last Updated' date.</p>
              <p className="font-semibold text-ink">Last Updated: 01/02/2026</p>
            </div>
          </section>

          <hr className="border-t border-border my-12" />

          <section className="text-center scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-xl md:text-2xl text-ink mb-4">Contact Us</h2>
            <p className="text-text-secondary font-body-md mb-8 max-w-2xl mx-auto leading-relaxed">
              If you have questions, concerns, or requests regarding this Privacy Policy or the way your information is handled, please contact Al Ahad Attars through our Customer Support or Contact page.
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
