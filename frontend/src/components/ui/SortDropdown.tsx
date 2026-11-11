import React, { useState, useRef, useEffect } from 'react';

export interface SortOption {
  id: string;
  label: string;
  backendSort: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: 'createdAt,desc', label: 'Newest First', backendSort: 'createdAt,desc' },
  { id: 'name,asc', label: 'Name: A–Z', backendSort: 'name,asc' },
  { id: 'name,desc', label: 'Name: Z–A', backendSort: 'name,desc' },
  { id: 'price,asc', label: 'Price: Low to High', backendSort: 'minPrice,asc' },
  { id: 'price,desc', label: 'Price: High to Low', backendSort: 'minPrice,desc' },
];

export const normalizeSortOption = (sortParam: string | null | undefined): string => {
  if (!sortParam) return 'createdAt,desc';
  if (sortParam === 'createdAt,desc') return 'createdAt,desc';
  if (sortParam === 'name,asc') return 'name,asc';
  if (sortParam === 'name,desc') return 'name,desc';
  if (sortParam === 'price,asc' || sortParam === 'minPrice,asc') return 'price,asc';
  if (sortParam === 'price,desc' || sortParam === 'minPrice,desc' || sortParam === 'maxPrice,desc') return 'price,desc';
  return 'createdAt,desc';
};

export const getBackendSortParam = (normalizedId: string): string => {
  const match = SORT_OPTIONS.find(opt => opt.id === normalizedId);
  return match ? match.backendSort : 'createdAt,desc';
};

interface SortDropdownProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
  showLabel?: boolean;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  className = '',
  id = 'luxury-sort-dropdown',
  ariaLabel = 'Sort products by',
  showLabel = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const normalizedVal = normalizeSortOption(value);
  const currentOption = SORT_OPTIONS.find(opt => opt.id === normalizedVal) || SORT_OPTIONS[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const currentIndex = SORT_OPTIONS.findIndex(opt => opt.id === currentOption.id);
      const nextIndex =
        e.key === 'ArrowDown'
          ? (currentIndex + 1) % SORT_OPTIONS.length
          : (currentIndex - 1 + SORT_OPTIONS.length) % SORT_OPTIONS.length;
      onChange(SORT_OPTIONS[nextIndex].id);
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const renderOptionIcon = (optionId: string) => {
    switch (optionId) {
      case 'createdAt,desc':
        // Calendar icon
        return (
          <svg
            className="w-4 h-4 text-[#9b7938]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="17" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );

      case 'name,asc':
        // Typographic AŽ icon
        return (
          <span
            className="font-serif font-bold text-[#9b7938] text-[13px] tracking-tight select-none leading-none inline-block w-4 text-center"
            aria-hidden="true"
          >
            AŽ
          </span>
        );

      case 'name,desc':
        // Typographic ŽA icon
        return (
          <span
            className="font-serif font-bold text-[#9b7938] text-[13px] tracking-tight select-none leading-none inline-block w-4 text-center"
            aria-hidden="true"
          >
            ŽA
          </span>
        );

      case 'price,asc':
        // Ascending 3 vertical bars
        return (
          <svg
            className="w-4 h-4 text-[#9b7938]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="2.5" y="11" width="3" height="6.5" rx="0.5" />
            <rect x="8.5" y="6.5" width="3" height="11" rx="0.5" />
            <rect x="14.5" y="2" width="3" height="15.5" rx="0.5" />
          </svg>
        );

      case 'price,desc':
        // Descending 3 vertical bars
        return (
          <svg
            className="w-4 h-4 text-[#9b7938]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="2.5" y="2" width="3" height="15.5" rx="0.5" />
            <rect x="8.5" y="6.5" width="3" height="11" rx="0.5" />
            <rect x="14.5" y="11" width="3" height="6.5" rx="0.5" />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-flex items-center gap-3 sm:gap-4.5 ${className}`}
      onKeyDown={handleKeyDown}
      id={id}
    >
      {/* Optional "SORT BY" label beside the pill */}
      {showLabel && (
        <span className="font-serif uppercase text-[11px] sm:text-xs tracking-[0.24em] text-[#121c2a] font-medium shrink-0 select-none">
          SORT BY
        </span>
      )}

      {/* Pill-shaped Dropdown Button Container */}
      <div className="relative w-[185px] xs:w-[200px] sm:w-[242px]">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          className={`w-full group relative inline-flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-[9999px] bg-[#fdfbf7] border transition-all duration-200 cursor-pointer shadow-[0_2px_8px_rgba(20,24,35,0.04)] select-none min-h-[40px] sm:min-h-[42px] ${
            isOpen
              ? 'border-[#c8aa70] ring-1 ring-[#c8aa70]/40 shadow-sm'
              : 'border-[#c8aa70] hover:border-[#b39151] hover:shadow-[0_4px_12px_rgba(20,24,35,0.07)]'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
            {/* Funnel/Filter Icon: 3 descending horizontal lines */}
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9b7938] shrink-0"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="3" y1="5.5" x2="17" y2="5.5" />
              <line x1="5.5" y1="10" x2="14.5" y2="10" />
              <line x1="8" y1="14.5" x2="12" y2="14.5" />
            </svg>

            {/* Thin Vertical Champagne Divider */}
            <span
              className="w-[1px] h-3 sm:h-3.5 bg-[#dfd1b8] shrink-0 mx-0.5"
              aria-hidden="true"
            />

            {/* Currently Selected Option Label in Serif */}
            <span className="font-serif text-[13px] sm:text-[14.5px] text-[#121c2a] font-normal tracking-tight select-none truncate">
              {currentOption.label}
            </span>
          </div>

          {/* Upward/Downward Chevron */}
          <svg
            className={`w-3.5 h-3.5 text-[#121c2a] transition-transform duration-300 ease-out shrink-0 ml-1.5 sm:ml-auto ${
              isOpen ? 'rotate-180' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Floating Expanded Dropdown Panel */}
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute right-0 top-full mt-2 z-50 w-[220px] sm:w-full bg-[#fdfbf7] border border-[#e8ded0] shadow-[0_12px_36px_rgba(20,24,35,0.08),0_2px_8px_rgba(20,24,35,0.03)] rounded-[16px] p-1.5 sm:p-2 transition-all duration-200 origin-top-right backdrop-blur-xs flex flex-col gap-1 ${
            isOpen
              ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
              : 'opacity-0 scale-95 pointer-events-none -translate-y-1'
          }`}
        >
          {SORT_OPTIONS.map(opt => {
            const isSelected = opt.id === currentOption.id;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.id)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors duration-150 flex items-center justify-between cursor-pointer rounded-[10px] min-h-[38px] sm:min-h-[40px] ${
                  isSelected
                    ? 'bg-[#f6ebd9] text-[#121c2a]'
                    : 'text-[#121c2a] hover:bg-[#f8f3ea]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 flex items-center justify-center shrink-0 text-[#9b7938]">
                    {renderOptionIcon(opt.id)}
                  </div>
                  <span
                    className={`font-serif text-[13.5px] sm:text-[14.5px] text-[#121c2a] select-none leading-none ${
                      isSelected ? 'font-medium' : 'font-normal'
                    }`}
                  >
                    {opt.label}
                  </span>
                </div>

                {/* Right-aligned gold checkmark for selected option */}
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-[#9b7938] shrink-0 ml-auto animate-fadeIn"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
