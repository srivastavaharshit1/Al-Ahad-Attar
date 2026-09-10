import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

interface FAQCategory {
  title: string;
  items: FAQItem[];
}

const AccordionItem: React.FC<{ item: FAQItem; isOpen: boolean; onClick: () => void }> = ({ item, isOpen, onClick }) => {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="w-full py-5 flex justify-between items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <span className="font-headline-md text-ink text-[16px] md:text-lg pr-4">{item.question}</span>
        <span className={`text-accent transform transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
      <div 
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'}`}
        aria-hidden={!isOpen}
      >
        <div className="overflow-hidden">
          <div className="font-body-md text-text leading-relaxed font-light">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
};

const faqData: FAQCategory[] = [
  {
    title: "1. ABOUT OUR FRAGRANCES",
    items: [
      {
        question: "What is an attar?",
        answer: "Attar is a concentrated fragrance traditionally made using aromatic ingredients and, in many cases, prepared through traditional distillation methods. It is known for its rich and distinctive fragrance character."
      },
      {
        question: "How should I apply attar?",
        answer: "Apply a small amount to pulse points such as the wrists, behind the ears, or on the neck. Since attar is concentrated, a small amount is usually enough."
      },
      {
        question: "How long does an attar last?",
        answer: "Fragrance longevity varies from person to person depending on skin chemistry, application method, weather, environment, and the particular fragrance. We recommend starting with a small amount and adjusting according to your preference."
      },
      {
        question: "Are Al Ahad Attars fragrances suitable for everyday use?",
        answer: "Yes. Our collection includes fragrances that can be enjoyed for everyday wear as well as special occasions. The ideal choice depends on your personal preference and the character of the fragrance."
      },
      {
        question: "Will the fragrance smell exactly the same on everyone?",
        answer: "Not necessarily. Fragrance can develop differently on different people due to individual skin chemistry, temperature, environment, and application method."
      }
    ]
  },
  {
    title: "2. ORDERS & PAYMENTS",
    items: [
      {
        question: "How can I place an order?",
        answer: "Browse our collection, select the product you would like to purchase, add it to your cart, and complete the checkout process with your shipping and payment details."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept the payment methods currently displayed at checkout."
      },
      {
        question: "Do you offer Cash on Delivery (COD)?",
        answer: "No. Al Ahad Attars currently does not offer Cash on Delivery."
      },
      {
        question: "Can I cancel my order?",
        answer: "Orders may be cancelled only before they are packed. If you wish to request a cancellation, please contact our Customer Support team as soon as possible with your order number."
      },
      {
        question: "Can I change my shipping address after placing an order?",
        answer: "Please contact our Customer Support team as soon as possible. We will try to assist if the order has not yet been dispatched, but changes may not be possible once the order has been processed or shipped."
      }
    ]
  },
  {
    title: "3. SHIPPING & DELIVERY",
    items: [
      {
        question: "How long does delivery take?",
        answer: "Standard delivery typically takes 3–7 business days depending on your location. Delivery times may vary depending on the destination, courier service, weather conditions, and other unforeseen circumstances."
      },
      {
        question: "When will my order be processed?",
        answer: "Orders are generally processed within 1–2 business days. Processing times may vary during high order volumes, promotional periods, or due to unforeseen circumstances."
      },
      {
        question: "How can I track my order?",
        answer: "Once your order has been shipped, you will receive a Shipment Confirmation email containing your tracking number. Tracking information may take up to 24 hours to become active."
      },
      {
        question: "What should I do if my order is delayed?",
        answer: "If your order is significantly delayed, please contact our Customer Support team with your order number. We will review the shipment status and coordinate with our courier partner where necessary."
      },
      {
        question: "What should I do if I receive a damaged package?",
        answer: "If your package appears visibly damaged when delivered, please take clear photographs or a video of the package before opening it, where possible. If the product inside is damaged, contact our Customer Support team as soon as possible with your order number and supporting photographs or videos."
      },
      {
        question: "What happens if I enter the wrong shipping address?",
        answer: "Please contact our Customer Support team immediately. We will try to assist if the order has not yet been dispatched. Al Ahad Attars is not responsible for delays or returns caused by incorrect or incomplete information provided by the customer."
      }
    ]
  },
  {
    title: "4. RETURNS & ORDER ISSUES",
    items: [
      {
        question: "Can I return or exchange my order?",
        answer: "Al Ahad Attars does not offer a general return or exchange policy. All purchases are considered final once the order has been successfully placed."
      },
      {
        question: "What if I receive the wrong product?",
        answer: "If you receive a product different from what you ordered, please contact our Customer Support team with your order number and clear photographs or videos of the received product. Your case will be reviewed individually."
      },
      {
        question: "What if a product is missing from my order?",
        answer: "Please contact our Customer Support team with your order number and details of the missing item. We will review the issue and assist you accordingly."
      },
      {
        question: "Can I get a refund?",
        answer: "Refunds are not provided as a general policy. However, exceptional order-related issues may be reviewed by Customer Support on a case-by-case basis. Any refund or replacement is subject to approval by Al Ahad Attars."
      },
      {
        question: "What if my product arrives damaged?",
        answer: "Please contact our Customer Support team as soon as possible with your order number and clear photographs or videos showing the product and packaging. Each case will be reviewed individually. A replacement or refund is not automatic and will depend on the outcome of the review."
      },
      {
        question: "Should I send a product back if there is an issue?",
        answer: "No. Please contact Customer Support first. Do not send any product back without receiving instructions from our team. Unauthorized returns will not be accepted or processed."
      },
      {
        question: "What types of order issues can Customer Support help with?",
        answer: "Our team can review exceptional situations such as receiving the wrong product, receiving a damaged product, a missing product, significant package damage during delivery, or other genuine order-related issues."
      },
      {
        question: "Are exceptional cases automatically eligible for a refund or replacement?",
        answer: "No. Exceptional cases are reviewed individually. Any refund or replacement is provided only where approved by Al Ahad Attars."
      }
    ]
  }
];

export const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (categoryId: number, itemIndex: number) => {
    const key = `${categoryId}-${itemIndex}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <main className="flex-grow bg-surface-alt py-16 md:py-24">
      <SEO 
        title="FAQ | Al Ahad Attars" 
        description="Find answers to common questions about Al Ahad Attars, our fragrances, orders, shipping, and customer support." 
        canonicalUrl="/faq" 
      />
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h1 className="font-headline-lg text-4xl md:text-5xl text-ink text-center mb-4 tracking-tight">
          FAQ
        </h1>
        <h2 className="font-headline-md text-2xl text-accent text-center mb-6">Frequently Asked Questions</h2>
        <p className="text-center text-text-secondary font-body-md text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
          Find answers to common questions about Al Ahad Attars, our fragrances, orders, shipping, and customer support.
        </p>

        <div className="bg-surface p-8 md:p-12 rounded-2xl shadow-sm border border-border">
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12 last:mb-0 scroll-mt-24 md:scroll-mt-32" id={`category-${categoryIndex}`}>
              <h2 className="font-headline-md text-xl md:text-2xl text-accent mb-6 tracking-wide border-b border-border pb-4">
                {category.title}
              </h2>
              <div className="space-y-0">
                {category.items.map((item, itemIndex) => (
                  <AccordionItem 
                    key={itemIndex}
                    item={item} 
                    isOpen={!!openItems[`${categoryIndex}-${itemIndex}`]} 
                    onClick={() => toggleItem(categoryIndex, itemIndex)} 
                  />
                ))}
              </div>
            </div>
          ))}

          <hr className="border-t border-border my-12" />

          <section className="text-center scroll-mt-24 md:scroll-mt-32">
            <h2 className="font-headline-md text-xl md:text-2xl text-ink mb-4">STILL HAVE QUESTIONS?</h2>
            <p className="text-text-secondary font-body-md mb-8 max-w-2xl mx-auto leading-relaxed">
              Couldn't find the answer you're looking for? Our Customer Support team is here to help. Contact us with your question or order details and we'll be happy to assist.
            </p>
            <div className="flex flex-col items-center gap-6">
              <Link to="/contact" className="btn btn-gold">
                Contact Us
              </Link>
              <Link to="/shipping-and-returns" className="text-accent hover:underline font-medium text-sm">
                View our full Shipping &amp; Returns policy
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
