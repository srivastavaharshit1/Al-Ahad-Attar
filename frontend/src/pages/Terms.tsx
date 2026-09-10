import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';

export const Terms: React.FC = () => {
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
        <p className="text-center text-ink font-semibold mb-12">
          Last Updated: 01/09/2026
        </p>

        <div className="bg-surface p-8 md:p-12 rounded-2xl shadow-sm border border-border">
          
          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">1. Introduction</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Welcome to Al Ahad Attars. These Terms & Conditions govern your use of our website and the purchase of products through our online store.</p>
              <p>By accessing our website, browsing our products, or placing an order, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">2. Use of Our Website</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>You agree to use the Al Ahad Attars website only for lawful purposes and in a manner that does not interfere with the operation, security, or availability of the website.</p>
              <p>Users must not:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Attempt to gain unauthorized access to the website or its systems.</li>
                <li>Interfere with website functionality or security.</li>
                <li>Use the website for fraudulent or unlawful activities.</li>
                <li>Attempt to introduce malicious software or harmful code.</li>
                <li>Copy, reproduce, or misuse website content without permission.</li>
              </ul>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">3. Products & Product Information</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>We make reasonable efforts to ensure that product names, descriptions, images, prices, and other information displayed on our website are accurate and up to date.</p>
              <p>However, minor differences may occur between product images displayed on your screen and the actual product due to lighting, photography, screen settings, packaging updates, or other factors.</p>
              <p>For fragrance products, the way a fragrance smells may vary from person to person depending on individual skin chemistry, environment, application method, and personal perception.</p>
              <p>Product availability may change without prior notice.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">4. Product Availability</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>We aim to keep our product availability information accurate. However, products may become unavailable due to inventory changes or unexpected circumstances.</p>
              <p>Al Ahad Attars reserves the right to limit quantities, discontinue products, or update product availability at any time.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">5. Pricing</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>All prices displayed on the website are shown in Indian Rupees (INR), unless otherwise stated.</p>
              <p>Prices may be changed or updated at any time without prior notice.</p>
              <p>We make reasonable efforts to ensure that prices are displayed accurately. In the event of an obvious pricing or listing error, Al Ahad Attars reserves the right to correct the error and, where necessary, cancel the affected order.</p>
              <p>If an order is cancelled after payment has been received, the applicable amount will be processed for refund according to the applicable payment process.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">6. Orders</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>When you place an order through our website, you are submitting a request to purchase the selected products.</p>
              <p>An order confirmation indicates that we have received your order. It does not necessarily guarantee that the order will be fulfilled if a product becomes unavailable, a pricing error is identified, or another issue prevents fulfilment.</p>
              <p>Al Ahad Attars reserves the right to accept, reject, or cancel an order where reasonably necessary.</p>
              <p>If an order is cancelled after payment has been received, the applicable amount will be refunded according to the applicable payment process.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">7. Order Cancellation</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Orders may be cancelled only before they are packed.</p>
              <p>Once an order has been packed, cancellation is no longer available.</p>
              <p>If you wish to request a cancellation, please contact our Customer Support team as soon as possible with your order number.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">8. Payment</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Orders must be paid using the payment methods made available on the website.</p>
              <p>By completing a payment, you confirm that you are authorized to use the selected payment method.</p>
              <p>Payments may be processed through third-party payment service providers. Their own terms and policies may also apply.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">9. Shipping & Delivery</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Orders are processed and delivered according to our Shipping & Returns policy.</p>
              <p>Estimated delivery times are provided as general guidance and may vary depending on the delivery location, courier service, weather conditions, and other unforeseen circumstances.</p>
              <p>Customers are responsible for providing accurate and complete delivery information.</p>
              <p>For detailed information about shipping, delivery, cancellations, and order-related issues, please refer to our Shipping & Returns page.</p>
              <p><Link to="/shipping-and-returns" className="text-accent hover:underline font-medium">View Shipping & Returns</Link></p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">10. Returns, Replacements & Refunds</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Al Ahad Attars does not offer a general return or exchange policy. All purchases are considered final once the order has been successfully placed.</p>
              <p>However, if you receive a wrong, damaged, missing, or otherwise affected product, you may contact our Customer Support team for review.</p>
              <p>Each case is evaluated individually. A replacement or refund is not automatic and will be provided only where approved by Al Ahad Attars.</p>
              <p>Please do not send products back without first contacting Customer Support and receiving instructions.</p>
              <p><Link to="/shipping-and-returns" className="text-accent hover:underline font-medium">View Shipping & Returns</Link></p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">11. Customer Responsibilities</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Customers are responsible for providing accurate information when placing an order, including their name, phone number, email address, billing information, and shipping address.</p>
              <p>Customers are also responsible for reviewing their order details before completing the purchase.</p>
              <p>Al Ahad Attars cannot be held responsible for issues caused by incorrect or incomplete information provided by the customer.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">12. Fragrance Experience</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Fragrance is a personal experience. The scent, intensity, projection, and longevity of an attar or fragrance may vary between individuals.</p>
              <p>Factors such as skin chemistry, application method, weather, temperature, and environment can influence how a fragrance develops and performs.</p>
              <p>Product descriptions and fragrance notes are intended to help customers understand the character of a fragrance and should not be considered a guarantee of identical performance for every individual.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">13. Intellectual Property</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>All content available on the Al Ahad Attars website, including logos, brand names, product images, photography, graphics, text, videos, product descriptions, and website design, is owned by or licensed to Al Ahad Attars unless otherwise stated.</p>
              <p>You may not reproduce, copy, modify, distribute, publish, or commercially use our content without prior written permission.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">14. Third-Party Services & Links</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Our website may use or provide access to third-party services, including payment, delivery, hosting, communication, or other services required to operate our online store.</p>
              <p>Third-party websites or services may have their own terms and privacy policies. Al Ahad Attars is not responsible for the content, availability, security, or policies of third-party websites.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">15. Website Availability</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>We aim to keep our website available and functioning properly, but we cannot guarantee that the website will always be available, uninterrupted, or free from errors.</p>
              <p>Temporary interruptions may occur due to maintenance, technical issues, security measures, third-party services, or circumstances beyond our reasonable control.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">16. Limitation of Liability</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>To the extent permitted by applicable law, Al Ahad Attars will not be responsible for losses arising from circumstances beyond our reasonable control, including courier delays, technical interruptions, third-party service failures, or events that could not reasonably have been anticipated or prevented.</p>
              <p>Nothing in these Terms & Conditions is intended to exclude or limit any rights or protections that cannot legally be excluded under applicable law.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">17. Governing Law</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>These Terms & Conditions shall be governed by and interpreted in accordance with the applicable laws of India.</p>
              <p>Any disputes relating to the use of our website or purchase of our products shall be subject to the applicable jurisdiction under Indian law.</p>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">18. Changes to These Terms</h2>
            <div className="space-y-4 text-text font-body-md leading-relaxed font-light">
              <p>Al Ahad Attars may update these Terms & Conditions from time to time to reflect changes to our website, products, services, policies, or applicable requirements.</p>
              <p>Updated terms will be published on this page with a revised 'Last Updated' date.</p>
            </div>
          </section>

          <hr className="border-t border-border my-12" />

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
