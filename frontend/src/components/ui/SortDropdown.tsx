import React, { useState, useRef, useEffect } from 'react';

export interface SortOption {
  id: string;
  label: string;
  backendSort: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: 'name,asc', label: 'Name: A–Z', backendSort: 'name,asc' },
  { id: 'name,desc', label: 'Name: Z–A', backendSort: 'name,desc' },
  { id: 'price,asc', label: 'Price: Low to High', backendSort: 'minPrice,asc' },
  { id: 'price,desc', label: 'Price: High to Low', backendSort: 'minPrice,desc' },
  { id: 'createdAt,desc', label: 'Newest First', backendSort: 'createdAt,desc' },
];

export const normalizeSortOption = (sortParam: string | null | undefined): string => {
  if (!sortParam) return 'name,asc';
  if (sortParam === 'price,asc' || sortParam === 'minPrice,asc') return 'price,asc';
  if (sortParam === 'price,desc' || sortParam === 'minPrice,desc' || sortParam === 'maxPrice,desc') return 'price,desc';
  if (sortParam === 'name,desc') return 'name,desc';
  if (sortParam === 'createdAt,desc') return 'createdAt,desc';
  return 'name,asc';
};

export const getBackendSortParam = (normalizedId: string): string => {
  const match = SORT_OPTIONS.find(opt => opt.id === normalizedId);
  return match ? match.backendSort : 'name,asc';
};

interface SortDropdownProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  className = '',
  id = 'luxury-sort-dropdown',
  ariaLabel = 'Sort products by'
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

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
      id={id}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`group relative flex items-center justify-between gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-sm bg-[#fbf9f5] border transition-all duration-200 cursor-pointer shadow-xs select-none min-h-[40px] ${
          isOpen
            ? 'border-[#c5a059] ring-1 ring-[#d4af37]/40 shadow-sm'
            : 'border-[#e4dcc8] hover:border-[#c5a059] hover:shadow-xs'
        }`}
      >
        <span className="flex items-center gap-1.5 text-xs text-ink tracking-wide font-normal truncate">
          <span className="text-ink/60 font-medium">Sort:</span>
          <span className="font-semibold text-ink">{currentOption.label}</span>
        </span>
        <svg
          className={`w-3.5 h-3.5 text-ink/60 transition-transform duration-300 ease-out shrink-0 group-hover:text-ink ${
            isOpen ? 'rotate-180 text-accent' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Luxury Dropdown Menu */}
      <div
        role="listbox"
        aria-label={ariaLabel}
        className={`absolute right-0 top-full mt-1.5 z-50 min-w-[210px] w-full max-w-[280px] bg-[#fbf9f5] border border-[#e4dcc8] shadow-[0_12px_28px_rgba(18,28,42,0.12)] rounded-sm py-1.5 transition-all duration-200 origin-top-right backdrop-blur-xs ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
            : 'opacity-0 scale-95 pointer-events-none -translate-y-1'
        }`}
      >
        <div className="px-3.5 py-1.5 border-b border-[#e4dcc8]/60 mb-1">
          <span className="text-[10px] uppercase font-semibold tracking-[0.2em] text-accent block">
            Sort Collection
          </span>
        </div>
        {SORT_OPTIONS.map(opt => {
          const isSelected = opt.id === currentOption.id;
          return (
            <button
              key={opt.id}
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelect(opt.id)}
              className={`w-full text-left px-3.5 py-2.5 sm:py-2 text-xs transition-colors flex items-center justify-between cursor-pointer min-h-[40px] sm:min-h-[36px] ${
                isSelected
                  ? 'bg-[#f2ecdf] text-ink font-semibold'
                  : 'text-ink/80 hover:bg-[#f7f2e7] hover:text-ink font-normal'
              }`}
            >
              <span className="tracking-wide">{opt.label}</span>
              {isSelected ? (
                <svg
                  className="w-3.5 h-3.5 text-[#90690a] shrink-0 ml-2 animate-fadeIn"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
