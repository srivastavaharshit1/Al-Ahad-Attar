import React, { useEffect, useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User, Menu, X, ArrowRight } from 'lucide-react';
import { SearchOverlay } from './SearchOverlay';
import { AuthContext } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useStoreSettings } from '../../context/StoreSettingsContext';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const { itemCount } = useCart();
  const { productIds } = useWishlist();
  const { settings } = useStoreSettings();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string, searchParams?: string) => {
    if (searchParams) {
      return location.pathname === path && location.search === searchParams;
    }
    return location.pathname === path && !location.search;
  };

  const getLinkClass = (path: string, searchParams?: string) => {
    const active = isActive(path, searchParams);
    return `nav-link-luxury font-label-md text-[11.5px] xl:text-[12px] uppercase tracking-[0.10em] xl:tracking-[0.16em] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
      active ? 'is-active text-ink font-semibold' : 'text-on-surface-variant hover:text-ink'
    }`;
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav
        className={`sticky top-0 w-full z-40 transition-all duration-500 ease-in-out ${
          scrolled
            ? 'bg-[#fbf9f5]/95 backdrop-blur-md shadow-[0_4px_25px_rgba(18,28,42,0.06)] border-b border-[#e4dcc8]'
            : 'bg-[#fbf9f5]/90 backdrop-blur-sm border-b border-[#e4dcc8]/40'
        }`}
        id="main-nav"
      >
        <div className={`flex items-center justify-between px-3 sm:px-5 lg:px-6 xl:px-8 max-w-7xl mx-auto w-full relative transition-all duration-300 ${
          scrolled ? 'h-15 sm:h-16 md:h-20' : 'h-16 md:h-[86px]'
        }`}>

          {/* Left: Brand Logo */}
          <div className="shrink-0 flex items-center h-full py-2 mr-2 sm:mr-3 lg:mr-4 xl:mr-6 min-w-0 max-w-[130px] xs:max-w-[170px] sm:max-w-none">
            <Link
              to="/"
              className="flex items-center gap-2 h-full min-w-0 rounded-sm group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {settings?.navbarLogoUrl ? (
                <img
                  src={settings.navbarLogoUrl}
                  alt={settings.storeName || "Brand Logo"}
                  className="h-7 sm:h-9 md:h-10 xl:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <span
                  className="font-serif text-[13px] xs:text-[15px] sm:text-base md:text-lg xl:text-2xl text-ink tracking-[0.04em] uppercase whitespace-nowrap block transition-colors duration-300 group-hover:text-accent font-normal truncate"
                >
                  {settings?.storeName || 'AL AHAD ATTARS'}
                </span>
              )}
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-3.5 xl:space-x-7 h-full mx-auto">
            <Link to="/" className={getLinkClass('/')}>Home</Link>
            <Link to="/collections" className={getLinkClass('/collections')}>Collections</Link>
            <Link to="/gift-sets" className={getLinkClass('/gift-sets')}>Gift Sets</Link>
            <Link to="/category/attars" className={getLinkClass('/category/attars')}>Attars</Link>
            <Link to="/category/bakhoor" className={getLinkClass('/category/bakhoor')}>Bakhoor</Link>
            <Link to="/category/perfumes" className={getLinkClass('/category/perfumes')}>Perfumes</Link>
            <Link to="/about" className={getLinkClass('/about')}>About Us</Link>
          </div>

          {/* Right: Actions (Search, Wishlist, Cart, Profile, Menu) */}
          <div className="flex items-center justify-end gap-0.5 xs:gap-1 sm:gap-2 ml-auto shrink-0">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-ink/75 hover:text-accent hover:bg-black/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
              aria-label="Search Fragrances"
              title="Search"
            >
              <Search className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            </button>

            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-ink/75 hover:text-accent hover:bg-black/[0.03] transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              {productIds.length > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-accent text-ink rounded-full text-[8.5px] sm:text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {productIds.length > 9 ? '9+' : productIds.length}
                </span>
              )}
            </Link>

            {/* Cart Link */}
            <Link
              to="/cart"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-ink/75 hover:text-accent hover:bg-black/[0.03] transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label="Cart"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-accent text-ink rounded-full text-[8.5px] sm:text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Profile / Account Link */}
            <Link
              to={user?.role === 'ADMIN' ? '/admin' : '/account/dashboard'}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-ink/75 hover:text-accent hover:bg-black/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label={user?.role === 'ADMIN' ? 'Admin Dashboard' : 'My Account'}
              title={user?.role === 'ADMIN' ? 'Admin Dashboard' : 'My Account'}
            >
              <User className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            </Link>

            {/* Mobile Menu Hamburger */}
            <button
              className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-ink/80 hover:text-accent hover:bg-black/[0.03] transition-colors ml-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
              ) : (
                <Menu className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Panel */}
            <div className="relative ml-auto w-full max-w-sm bg-[#fbf9f5] h-full shadow-2xl flex flex-col justify-between border-l border-[#e4dcc8] z-10 animate-fade-up">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-[#e4dcc8]">
                <span className="font-serif text-base text-ink tracking-wider uppercase font-medium">
                  AL AHAD ATTARS
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-ink/70 hover:text-ink hover:bg-black/5 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Search Shortcut inside Drawer */}
              <div className="px-5 pt-4">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsSearchOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-white border border-[#e4dcc8] rounded-[2px] text-xs text-ink/60 hover:text-ink hover:border-accent transition-all shadow-2xs text-left cursor-pointer"
                >
                  <Search className="w-4 h-4 text-accent" />
                  <span className="font-light">Search luxury fragrances…</span>
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto p-5 space-y-1">
                <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2 px-3">
                  Collections
                </div>
                {[
                  { path: '/', label: 'Home' },
                  { path: '/collections', label: 'All Collections' },
                  { path: '/gift-sets', label: 'Curated Gift Sets' },
                  { path: '/category/attars', label: 'Pure Attars' },
                  { path: '/category/bakhoor', label: 'Bakhoor & Incense' },
                  { path: '/category/perfumes', label: 'Luxury Perfumes' },
                  { path: '/about', label: 'Our Heritage' },
                  { path: '/offers', label: 'Special Offers' },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded text-[12.5px] font-medium tracking-[0.14em] uppercase transition-colors ${
                      isActive(item.path)
                        ? 'text-accent bg-accent/10 font-semibold'
                        : 'text-ink hover:text-accent hover:bg-black/[0.02]'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                  </Link>
                ))}

                {/* Account & Wishlist shortcuts for mobile */}
                <div className="pt-5 mt-3 border-t border-[#e4dcc8]/60">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold mb-2 px-3">
                    Your Account
                  </div>
                  <Link
                    to="/wishlist"
                    className="flex items-center justify-between px-3 py-2.5 rounded text-[12.5px] font-medium tracking-[0.14em] uppercase text-ink hover:text-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2.5">
                      <Heart className="w-4 h-4 text-accent" />
                      Wishlist
                    </span>
                    {productIds.length > 0 && (
                      <span className="bg-accent text-ink text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {productIds.length}
                      </span>
                    )}
                  </Link>

                  <Link
                    to={user?.role === 'ADMIN' ? '/admin' : '/account/dashboard'}
                    className="flex items-center justify-between px-3 py-2.5 rounded text-[12.5px] font-medium tracking-[0.14em] uppercase text-ink hover:text-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-accent" />
                      {user ? (user.role === 'ADMIN' ? 'Admin Portal' : 'My Account') : 'Sign In / Register'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                  </Link>

                  <Link
                    to="/cart"
                    className="flex items-center justify-between px-3 py-2.5 rounded text-[12.5px] font-medium tracking-[0.14em] uppercase text-ink hover:text-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2.5">
                      <ShoppingBag className="w-4 h-4 text-accent" />
                      Shopping Cart
                    </span>
                    {itemCount > 0 && (
                      <span className="bg-accent text-ink text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-[#e4dcc8] bg-[#f5f1e8]/60">
                <div className="text-[10px] tracking-[0.2em] uppercase text-on-surface-variant font-light mb-2">
                  Luxury Arabic Perfumery
                </div>
                <div className="flex items-center gap-3 text-xs text-ink/75 flex-wrap">
                  <Link to="/contact" className="hover:text-accent transition-colors underline-offset-2 hover:underline" onClick={() => setIsMobileMenuOpen(false)}>
                    Contact Us
                  </Link>
                  <span>•</span>
                  <Link to="/faq" className="hover:text-accent transition-colors underline-offset-2 hover:underline" onClick={() => setIsMobileMenuOpen(false)}>
                    FAQ
                  </Link>
                  <span>•</span>
                  <Link to="/shipping-and-returns" className="hover:text-accent transition-colors underline-offset-2 hover:underline" onClick={() => setIsMobileMenuOpen(false)}>
                    Shipping
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
