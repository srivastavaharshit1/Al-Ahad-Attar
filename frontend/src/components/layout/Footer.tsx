import React from 'react';
import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { getImageUrl } from '../../utils/getImageUrl';

export const Footer: React.FC = () => {
  const { settings } = useStoreSettings();

  return (
    <footer className="bg-[#0a0a0a] w-full pt-20 pb-8 border-t border-[#d4af37]/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
        
        {/* Column 1: Brand */}
        <div className="lg:col-span-4 pr-0 lg:pr-8">
          <div className="mb-6">
            {settings?.brandLogoUrl ? (
              <div className="flex flex-col">
                <img src={getImageUrl(settings.brandLogoUrl)} alt={settings?.storeName || 'Al Ahad Attars'} className="h-12 w-auto object-contain brightness-0 invert opacity-90 self-start" />
                <span className="text-[9px] text-[#d4af37]/80 uppercase tracking-[0.2em] mt-4 block">Premium Arabic Fragrances Since 2025</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="font-headline-md text-2xl text-[#d4af37] tracking-wider uppercase">{settings?.storeName || 'Al Ahad Attars'}</span>
                <span className="text-[9px] text-[#d4af37]/80 uppercase tracking-[0.2em] mt-2 block">Premium Arabic Fragrances Since 2025</span>
              </div>
            )}
          </div>
          <p className="font-body-md text-sm text-white/60 mb-8 leading-relaxed font-light">
            Crafting authentic attars and luxurious fragrances inspired by timeless Arabian traditions.
          </p>
          <div className="flex space-x-6">
            {settings?.instagramHandle && (
              <a href={`https://instagram.com/${settings.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/60 uppercase tracking-[0.2em] hover:text-[#d4af37] transition-colors">
                Instagram
              </a>
            )}
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/60 uppercase tracking-[0.2em] hover:text-[#d4af37] transition-colors">
              Facebook
            </a>
            {settings?.whatsappNumber ? (
              <a href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/60 uppercase tracking-[0.2em] hover:text-[#d4af37] transition-colors">
                WhatsApp
              </a>
            ) : (
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/60 uppercase tracking-[0.2em] hover:text-[#d4af37] transition-colors">
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Column 2: SHOP */}
        <div className="lg:col-span-2">
          <h4 className="font-label-md text-[10px] text-[#d4af37] uppercase tracking-[0.25em] mb-8">Shop</h4>
          <ul className="space-y-4">
            <li><Link to="/category/attars" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Attars</Link></li>
            <li><Link to="/category/bakhoor" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Bakhoor</Link></li>
            <li><Link to="/category/car-perfumes" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Car Perfumes</Link></li>
            <li><Link to="/collections" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Collections</Link></li>
            <li><Link to="/offers" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Offers</Link></li>
          </ul>
        </div>

        {/* Column 3: COMPANY */}
        <div className="lg:col-span-2">
          <h4 className="font-label-md text-[10px] text-[#d4af37] uppercase tracking-[0.25em] mb-8">Company</h4>
          <ul className="space-y-4">
            <li><Link to="/about" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">About Us</Link></li>
            <li><Link to="/our-story" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Our Story</Link></li>
            <li><Link to="/contact" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Contact</Link></li>
            <li><Link to="/faq" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">FAQ</Link></li>
          </ul>
        </div>

        {/* Column 4: CUSTOMER SUPPORT */}
        <div className="lg:col-span-2">
          <h4 className="font-label-md text-[10px] text-[#d4af37] uppercase tracking-[0.25em] mb-8">Customer Support</h4>
          <ul className="space-y-4">
            <li><Link to="/shipping-policy" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Shipping Policy</Link></li>
            <li><Link to="/refund-policy" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Return Policy</Link></li>
            <li><Link to="/privacy-policy" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Privacy Policy</Link></li>
            <li><Link to="/terms-and-conditions" className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light">Terms & Conditions</Link></li>
          </ul>
        </div>

        {/* Column 5: CONTACT */}
        <div className="lg:col-span-2">
          <h4 className="font-label-md text-[10px] text-[#d4af37] uppercase tracking-[0.25em] mb-8">Contact</h4>
          <ul className="space-y-6">
            <li className="font-body-md text-sm text-white/60 font-light flex items-start gap-3">
              <span className="text-[14px] text-[#d4af37] mt-1">📍</span>
              <span>Lucknow, Uttar Pradesh</span>
            </li>
            <li>
              <a href={`mailto:${settings?.emailAddress || 'contact@alahadattars.com'}`} className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light flex items-start gap-3">
                <span className="text-[14px] text-[#d4af37] mt-1">✉</span>
                <span className="break-all">{settings?.emailAddress || 'contact@alahadattars.com'}</span>
              </a>
            </li>
            <li>
              <a href={`tel:${settings?.phoneNumber || '+91 xxxxxxxxxx'}`} className="font-body-md text-sm text-white/60 hover:text-[#d4af37] transition-colors font-light flex items-start gap-3">
                <span className="text-[14px] text-[#d4af37] mt-1">📞</span>
                <span>{settings?.phoneNumber || '+91 xxxxxxxxxx'}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Bottom Copyright */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-1 font-body-md text-[11px] text-white/40 tracking-wider">
          <span>© {new Date().getFullYear()} {settings?.storeName || 'Al Ahad Attars'}.</span>
          <span>All Rights Reserved.</span>
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <span className="text-[9px] text-[#d4af37] uppercase tracking-[0.2em]">Secure Payments</span>
          <div className="flex items-center gap-5 text-white/30 text-[10px] font-label-md uppercase tracking-[0.15em]">
            <span className="hover:text-white/60 transition-colors cursor-pointer">Visa</span>
            <span className="hover:text-white/60 transition-colors cursor-pointer">Mastercard</span>
            <span className="hover:text-white/60 transition-colors cursor-pointer">UPI</span>
            <span className="hover:text-white/60 transition-colors cursor-pointer">Razorpay</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
