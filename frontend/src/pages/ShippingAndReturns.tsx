import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';

export const ShippingAndReturns: React.FC = () => {
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

        <div className="bg-surface p-8 md:p-12 rounded-2xl shadow-sm border border-border">
          <section className="mb-12 scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">SHIPPING POLICY</h2>
            <div className="space-y-8 text-text font-body-md leading-relaxed font-light">
              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Order Processing Time</h3>
                <p>All orders are generally processed within 1–2 business days. Processing times may vary during high order volumes, promotional periods, or due to unforeseen circumstances.</p>
              </div>
              
              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Estimated Delivery Time</h3>
                <p>Standard delivery typically takes 3–7 business days depending on your location. Delivery times may vary depending on the destination, courier service, weather conditions, and other unforeseen circumstances.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Shipping Charges</h3>
                <p>Shipping charges for your order will be calculated and displayed at checkout. Any applicable shipping promotions will be clearly communicated at the time of purchase.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Order Tracking</h3>
                <p>You will receive a Shipment Confirmation email once your order has been shipped, containing your tracking number(s). Tracking information may take up to 24 hours to become active.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Delivery Attempts</h3>
                <p>Our courier partners may make multiple attempts to deliver your package. If delivery is unsuccessful after the available attempts, the package may be returned to us.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Incorrect Shipping Address</h3>
                <p>Please ensure that your shipping address and contact information are correct before placing your order. Al Ahad Attars is not responsible for orders delayed or returned due to incorrect or incomplete information provided by the customer.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Shipping Delays & Lost Shipments</h3>
                <p>If you experience a significant delay or believe your shipment may be lost, please contact our Customer Support team with your order number. We will review the shipment status and coordinate with our courier partner where necessary.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Order Cancellation</h3>
                <p>Orders may be cancelled only before they are packed. Once an order has been packed, cancellation is no longer available. If you wish to request a cancellation, please contact our Customer Support team as soon as possible.</p>
              </div>
            </div>
          </section>

          <hr className="border-t border-border mb-12" />

          <section className="scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-2xl text-accent mb-6 tracking-wide">RETURNS & ORDER ISSUES</h2>
            <div className="space-y-8 text-text font-body-md leading-relaxed font-light">
              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-4">General Return Policy</h3>
                <div className="bg-warning-bg border-l-4 border-warning p-4 rounded-r-md mb-6">
                  <p className="font-semibold text-warning">Al Ahad Attars does not offer a general return or exchange policy. All purchases are considered final once the order has been successfully placed.</p>
                </div>
                <p>At Al Ahad Attars, we carefully inspect and pack every order before dispatch. If something goes wrong with your order, please contact our Customer Support team and we will review the issue on a case-by-case basis.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Exceptional Cases</h3>
                <p className="mb-4">We assist customers in the following scenarios:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li>Wrong product received</li>
                  <li>Damaged product received</li>
                  <li>Missing product from the order</li>
                  <li>Significant damage to the package during delivery</li>
                  <li>Other genuine order-related issues</li>
                </ul>
                <p className="mb-4">These cases are reviewed individually and do not automatically qualify for a return, replacement, or refund.</p>
                <p className="font-semibold text-ink">Each case will be reviewed individually. Any replacement or refund will be provided only where approved by Al Ahad Attars.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Damaged Package on Delivery</h3>
                <p>If your package appears visibly damaged when delivered, please take clear photographs or a video of the package before opening it, where possible. If the product inside is damaged, contact our Customer Support team as soon as possible with your order number and supporting photographs or videos.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">How to Request Support</h3>
                <p className="mb-4">If you experience an issue with your order, please contact our Customer Support team as soon as possible.</p>
                <p className="mb-2">Please provide:</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li>Your order number</li>
                  <li>Your name and contact details</li>
                  <li>A brief description of the issue</li>
                  <li>Clear photographs or videos, where applicable</li>
                </ul>
                <p>Providing these details will help our team review your request more efficiently.</p>
              </div>

              <div className="scroll-mt-24 md:scroll-mt-32">
                <h3 className="font-semibold text-ink mb-2">Important Note</h3>
                <div className="bg-surface-alt border border-border p-5 rounded-md">
                  <p className="font-medium text-ink mb-1">Please do not send any products back without contacting Customer Support first. Unauthorized returns will not be accepted or processed.</p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-t border-border my-12" />

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
