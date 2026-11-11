import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';

const footerLinkClass =
  "font-body-md text-xs sm:text-sm text-white/60 hover:text-accent transition-colors font-light leading-relaxed rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

export const Footer: React.FC = () => {
  const { settings } = useStoreSettings();

  return (
    <footer className="bg-ink w-full pt-14 sm:pt-18 md:pt-20 pb-8 border-t border-accent/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-8">

        {/* Column 1: Brand */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 pr-0 lg:pr-8 min-w-0">
          <div className="mb-5 sm:mb-6">
            <div className="flex flex-col items-start">
              {settings?.brandLogoUrl ? (
                <img src={settings.brandLogoUrl} alt={settings.storeName || "Brand Logo"} className="h-16 sm:h-20 w-auto max-w-full object-contain object-left mb-2" />
              ) : (
                <span className="font-serif text-xl sm:text-2xl text-accent tracking-wider uppercase font-medium">{settings?.storeName || 'AL AHAD ATTARS'}</span>
              )}
              <span className="text-[8.5px] sm:text-[9px] text-accent/80 uppercase tracking-[0.2em] mt-1.5 block">Premium Arabic Fragrances Since 2025</span>
            </div>
          </div>
          <p className="font-body-md text-xs sm:text-sm text-white/60 mb-6 sm:mb-8 leading-relaxed font-light max-w-md">
            Crafting authentic attars and luxurious fragrances inspired by timeless Arabian traditions.
          </p>
          <div className="flex space-x-6">
            {settings?.instagramHandle && (
              <a href={`https://instagram.com/${settings.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/60 uppercase tracking-[0.2em] hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                Instagram
              </a>
            )}
            {settings?.whatsappNumber ? (
              <a href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/60 uppercase tracking-[0.2em] hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                WhatsApp
              </a>
            ) : (
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/60 uppercase tracking-[0.2em] hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Column 2: SHOP */}
        <div className="col-span-1 lg:col-span-2 min-w-0">
          <h4 className="font-label-md text-[10px] text-accent uppercase tracking-[0.25em] mb-4 sm:mb-6 font-medium">Shop</h4>
          <ul className="space-y-3 sm:space-y-3.5">
            <li><Link to="/category/attars" className={footerLinkClass}>Attars</Link></li>
            <li><Link to="/category/bakhoor" className={footerLinkClass}>Bakhoor</Link></li>
            <li><Link to="/category/car-perfumes" className={footerLinkClass}>Car Perfumes</Link></li>
            <li><Link to="/collections" className={footerLinkClass}>Collections</Link></li>
            <li><Link to="/offers" className={footerLinkClass}>Offers</Link></li>
          </ul>
        </div>

        {/* Column 3: COMPANY */}
        <div className="col-span-1 lg:col-span-2 min-w-0">
          <h4 className="font-label-md text-[10px] text-accent uppercase tracking-[0.25em] mb-4 sm:mb-6 font-medium">Company</h4>
          <ul className="space-y-3 sm:space-y-3.5">
            <li><Link to="/about" className={footerLinkClass}>About Us</Link></li>
            <li><Link to="/contact" className={footerLinkClass}>Contact</Link></li>
            <li><Link to="/faq" className={footerLinkClass}>FAQ</Link></li>
          </ul>
        </div>

        {/* Column 4: CUSTOMER SUPPORT */}
        <div className="col-span-1 lg:col-span-2 min-w-0">
          <h4 className="font-label-md text-[10px] text-accent uppercase tracking-[0.25em] mb-4 sm:mb-6 font-medium">Customer Support</h4>
          <ul className="space-y-3 sm:space-y-3.5">
            <li><Link to="/shipping-and-returns" className={footerLinkClass}>Shipping &amp; Returns</Link></li>
            <li><Link to="/privacy-policy" className={footerLinkClass}>Privacy Policy</Link></li>
            <li><Link to="/terms-and-conditions" className={footerLinkClass}>Terms &amp; Conditions</Link></li>
          </ul>
        </div>

        {/* Column 5: CONTACT */}
        <div className="col-span-1 lg:col-span-2 min-w-0">
          <h4 className="font-label-md text-[10px] text-accent uppercase tracking-[0.25em] mb-4 sm:mb-6 font-medium">Contact</h4>
          <ul className="space-y-4 sm:space-y-5">
            <li className="font-body-md text-xs sm:text-sm text-white/60 font-light leading-relaxed flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>
                {settings?.city || settings?.state 
                  ? [settings.city, settings.state].filter(Boolean).join(', ') 
                  : 'Lucknow, Uttar Pradesh'}
              </span>
            </li>
            <li>
              <a href={`mailto:${settings?.emailAddress || 'contact@alahadattars.com'}`} className={`${footerLinkClass} flex items-start gap-2.5`}>
                <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="break-all">{settings?.emailAddress || 'contact@alahadattars.com'}</span>
              </a>
            </li>
            <li>
              <a href={`tel:${settings?.phoneNumber || '+91 xxxxxxxxxx'}`} className={`${footerLinkClass} flex items-start gap-2.5`}>
                <Phone className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>{settings?.phoneNumber || '+91 xxxxxxxxxx'}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright & Security */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-14 sm:mt-18 pt-6 sm:pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-5 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 font-body-md text-[11px] text-white/40 tracking-wider text-center sm:text-left">
          <span>© {new Date().getFullYear()} {settings?.storeName || 'Al Ahad Attars'}.</span>
          <span>All Rights Reserved.</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-4">
          <span className="text-[9px] text-accent uppercase tracking-[0.2em] flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure Payments
          </span>
          <div className="flex items-center gap-2 text-white/50 text-[9.5px] font-mono tracking-wider flex-wrap justify-center">
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-[1px]">VISA</span>
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-[1px]">MASTERCARD</span>
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-[1px]">UPI</span>
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-[1px]">RAZORPAY</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
