import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div 
      className={`fixed inset-0 z-50 bg-surface/95 backdrop-blur-xl flex flex-col pt-24 px-margin-mobile md:px-margin-desktop overflow-y-auto transition-all duration-400 ease-in-out ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
    >
      <button
        onClick={onClose}
        aria-label="Close search"
        className="absolute top-8 right-8 text-on-surface-variant hover:text-accent transition-colors p-2 rounded-full hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>

      <div className="max-w-container-max mx-auto w-full flex-grow flex flex-col gap-section-gap pb-24">
        <div className="flex flex-col items-center text-center space-y-8 w-full max-w-3xl mx-auto">
          <h1 className="font-headline-lg text-4xl md:text-5xl text-ink tracking-tight">Discover Fragrances</h1>
          <form
            className="w-full relative group"
            onSubmit={(e) => {
              e.preventDefault();
              if (inputRef.current?.value.trim()) {
                onClose();
                navigate(`/search?q=${encodeURIComponent(inputRef.current.value.trim())}`);
              }
            }}
          >
            <span className="material-symbols-outlined absolute left-6 top-1/2 transform -translate-y-1/2 text-on-surface-variant group-focus-within:text-accent transition-colors" style={{ fontSize: '28px' }}>search</span>
            <input
              ref={inputRef}
              className="w-full border-b border-outline-variant py-6 pl-16 pr-6 font-headline-md text-headline-md text-on-surface placeholder:text-outline-variant/60 focus:border-accent focus:ring-0 transition-colors bg-surface-container-lowest/50 caret-accent focus:outline-none"
              placeholder="Search for attars, notes, or collections..."
              type="text"
            />
          </form>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mt-12 w-full">
          {/* Left Column: Trending & Recent */}
          <div className="md:col-span-4 flex flex-col gap-12">
            {/* Trending Searches */}
            <div className="space-y-6">
              <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest flex items-center gap-2 border-b border-outline-variant pb-2">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>trending_up</span>
                Trending Searches
              </h3>
              <ul className="space-y-4">
                {['Oud Wood', 'Saffron Blends', 'White Musk', 'Rose Taifi'].map(term => (
                  <li key={term}>
                    <Link to="/collection" onClick={onClose} className="font-body-lg text-body-lg text-on-surface hover:text-accent transition-colors flex items-center group rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 -ml-6 mr-2 transition-all text-accent" aria-hidden="true">arrow_right</span>
                      {term}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Searches */}
            <div className="space-y-6 mt-4">
              <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest flex items-center gap-2 border-b border-outline-variant pb-2">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
                Recent Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Sandalwood', 'Amber', 'Gift Sets'].map(term => (
                  <Link key={term} to="/collection" onClick={onClose} className="px-4 py-2 bg-surface-container border border-outline-variant/30 rounded-full font-label-md text-label-md text-on-surface-variant hover:border-accent hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Suggested Products */}
          <div className="md:col-span-8 md:pl-12 border-t md:border-t-0 md:border-l border-outline-variant/30 pt-12 md:pt-0">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest flex items-center gap-2 border-b border-outline-variant pb-2 mb-8">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
              Suggested Products
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Product 1 */}
              <Link to="/product/1" onClick={onClose} className="group flex flex-col gap-4 p-4 rounded-xl hover:bg-surface-container-lowest transition-colors border border-transparent hover:border-outline-variant/30 shadow-none hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <div className="aspect-square bg-surface-container rounded-lg overflow-hidden relative">
                  <img className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuOdZxuYCsRAQDrwiP9u564frCby7WeqS8uDAh_NZDsbytOknjvn3sjuQwgUJxRcgO7lPL7RN5KVzX_lTDo_7b09StwdlpppG68Bpk-JpwCIk8L4H2XPCR0e6l2_v__V0adNZjcrc3PBsHaaDTGn8Qf00KwrsB8QixyrfJu5jeSd1L1O-eko-V4Rl1PLuBRvv-KorN0yyPfb-BorJBePi1sJ-XB0myvvOfwUE2bP2L1UJeF78vRxnTNFqWBEiPf8738UyHgtSDCw" alt="Royal Amber" />
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-accent transition-colors line-clamp-1">Royal Amber</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">Rich, woody, sweet</p>
                </div>
              </Link>
              {/* Product 2 */}
              <Link to="/product/2" onClick={onClose} className="group flex flex-col gap-4 p-4 rounded-xl hover:bg-surface-container-lowest transition-colors border border-transparent hover:border-outline-variant/30 shadow-none hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <div className="aspect-square bg-surface-container rounded-lg overflow-hidden relative">
                  <img className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDggE1VejinBFl-z2Be3SIcvFDlNyZoBqIfH4S_BYpLUex3RhMWgFQYETU7kjdSaENIfoquDU6e9fTzy_p0jj6j66Ypxn0DKxJcM0kGVFVv45s9t9qYP30x7GZaARoUNONqAqmlZmvPm8ugr5jPGfNeQ--5K3B_8Xr_U5lNNA8JG-ZJyPoSYwu5VBoSvWM3RRM_Ku_4tdAvhFSlWo-BcZTRpHhBnB8DdeMH95jgeKq_hXp7fUviAxJZK46T_QRip6p9xBpiD8n2zQ" alt="White Musk Pure" />
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-accent transition-colors line-clamp-1">White Musk Pure</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">Clean, powdery, soft</p>
                </div>
              </Link>
              {/* Product 3 */}
              <Link to="/product/3" onClick={onClose} className="group flex flex-col gap-4 p-4 rounded-xl hover:bg-surface-container-lowest transition-colors border border-transparent hover:border-outline-variant/30 shadow-none hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent hidden lg:flex">
                <div className="aspect-square bg-surface-container rounded-lg overflow-hidden relative">
                  <img className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDusrs-FBPzVwTnUiaZDTgIkTHiilq_O_cJnhkS72TiMiNALfBD1e_piDt38OtFTWDNiFeoUlsHnFTBnOVlhz_qTyt6fShkXYtaEhwnT0aHT0PxGNWA1OsL65aYn4yrEzlXLm6MzD8-g3DEom0lrSMm3wCNKJF0Sz6ignPfKJdAZM6HUO00ZE8Tv4Wd82NIrjkBNMyVnnlmSb4t2YH8oKy-v7ctIRsWhqqrTr43-OqzBb90FgMiKp6iMa5Pzp6HlWkt_DVFktS8eQ" alt="Oud Al Layl" />
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-on-surface group-hover:text-accent transition-colors line-clamp-1">Oud Al Layl</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">Deep, smoky, intense</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
