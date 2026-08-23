import React, { useEffect, useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SearchOverlay } from './SearchOverlay';
import { AuthContext } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const { itemCount } = useCart();
  const { productIds } = useWishlist();

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
    const baseClass = "font-label-md text-label-md transition-colors duration-300 uppercase tracking-[0.15em] text-sm rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
    if (isActive(path, searchParams)) {
      return `${baseClass} text-accent border-b border-accent pb-1`;
    }
    return `${baseClass} text-on-surface-variant hover:text-accent`;
  };

  return (
    <>
      <nav
        className={`sticky top-0 w-full z-40 transition-all duration-300 backdrop-blur-md border-b border-outline-variant/30 shadow-sm ${
          scrolled ? 'scrolled-nav' : 'bg-surface/90 dark:bg-inverse-surface/90'
        }`}
        id="main-nav"
      >
        <div className="flex justify-between items-center px-2 sm:px-4 md:px-8 h-16 md:h-[90px] max-w-7xl mx-auto w-full relative">

          {/* Left: Logo */}
          <div className="flex-1 flex justify-start h-full py-2 min-w-0">
            <Link to="/" className="flex items-center h-full min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
              <span className="font-headline-md text-base sm:text-xl md:text-2xl text-ink tracking-tight whitespace-nowrap block" style={{ letterSpacing: '0.05em' }}>
                AL AHAD ATTARS
              </span>
            </Link>
          </div>

          {/* Center: Navigation */}
          <div className="hidden lg:flex flex-none items-center space-x-3 xl:space-x-8 h-full">
            <Link to="/" className={getLinkClass('/')}>Home</Link>
            <Link to="/collections" className={getLinkClass('/collections')}>Collections</Link>
            <Link to="/category/attars" className={getLinkClass('/category/attars')}>Attars</Link>
            <Link to="/category/bakhoor" className={getLinkClass('/category/bakhoor')}>Bakhoor</Link>
            <Link to="/category/perfumes" className={getLinkClass('/category/perfumes')}>Perfumes</Link>
            <Link to="/about" className={getLinkClass('/about')}>About Us</Link>
          </div>

          {/* Right: Actions */}
          <div className="flex-1 flex justify-end items-center space-x-0.5 sm:space-x-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-on-surface-variant hover:text-accent hover:bg-surface-container-high transition-colors duration-300 rounded-full p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label="Search"
            >
              <span className="material-symbols-outlined">search</span>
            </button>

            {/* Wishlist with badge */}
            <Link
              to="/wishlist"
              className="text-on-surface-variant hover:text-accent hover:bg-surface-container-high transition-colors duration-300 relative rounded-full p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label="Wishlist"
            >
              <span className="material-symbols-outlined">favorite</span>
              {productIds.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-ink rounded-full text-[10px] flex items-center justify-center font-bold">
                  {productIds.length > 9 ? '9+' : productIds.length}
                </span>
              )}
            </Link>

            {/* Cart with badge */}
            <Link
              to="/cart"
              className="text-on-surface-variant hover:text-accent hover:bg-surface-container-high transition-colors duration-300 relative rounded-full p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label="Cart"
            >
              <span className="material-symbols-outlined">shopping_bag</span>
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-ink rounded-full text-[10px] flex items-center justify-center font-bold">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Profile — routes admin to admin dashboard */}
            <Link
              to={user?.role === 'ADMIN' ? '/admin' : '/account/dashboard'}
              className="text-on-surface-variant hover:text-accent hover:bg-surface-container-high transition-colors duration-300 rounded-full p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label="Account"
            >
              <span className="material-symbols-outlined">person</span>
            </Link>

            <button
              className="lg:hidden text-on-surface-variant hover:text-accent hover:bg-surface-container-high transition-colors duration-300 rounded-full p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label="Menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-surface border-t border-outline-variant/30 px-6 py-6 space-y-5 shadow-lg absolute w-full left-0 animate-fade-up">
            <Link to="/" className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            <Link to="/collections" className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setIsMobileMenuOpen(false)}>Collections</Link>
            <Link to="/category/attars" className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setIsMobileMenuOpen(false)}>Attars</Link>
            <Link to="/category/bakhoor" className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setIsMobileMenuOpen(false)}>Bakhoor</Link>
            <Link to="/category/perfumes" className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setIsMobileMenuOpen(false)}>Perfumes</Link>
            <Link to="/about" className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
          </div>
        )}
      </nav>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
