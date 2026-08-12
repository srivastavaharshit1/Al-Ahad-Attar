import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

export interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  defaultCountry?: CountryCode;
  id?: string;
}

interface CountryOption {
  iso2: CountryCode;
  name: string;
  dialCode: string;
}

const flagEmoji = (iso2: string): string =>
  iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

const regionNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

const countryName = (iso2: string): string => regionNames?.of(iso2) ?? iso2;

let countryListCache: CountryOption[] | null = null;
const getCountryList = (): CountryOption[] => {
  if (countryListCache) return countryListCache;
  countryListCache = getCountries()
    .map((iso2) => ({ iso2, name: countryName(iso2), dialCode: getCountryCallingCode(iso2) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return countryListCache;
};

/**
 * Professional international phone input: searchable country selector with flags (default
 * India), digit-only national-number field, and libphonenumber-js-backed validation with
 * user-friendly messages. Emits the full E.164 string (e.g. "+919876543210") via onChange,
 * matching exactly what the backend's `phone` field already expects — a drop-in replacement
 * for a plain `Input` on any phone field, no API shape changes required.
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = 'Phone Number',
  value,
  onChange,
  error,
  required,
  disabled,
  className = '',
  defaultCountry = 'IN',
  id,
}) => {
  const countries = useMemo(() => getCountryList(), []);
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [nationalDigits, setNationalDigits] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localError, setLocalError] = useState('');
  const [touched, setTouched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Tracks the last value *this component* emitted, so re-syncing from the `value` prop only
  // happens for genuinely external changes (initial load, form reset) — not every keystroke,
  // which would otherwise fight the user mid-type (classic controlled-input feedback loop).
  const lastEmitted = useRef<string>('');

  useEffect(() => {
    if (value === lastEmitted.current) return;
    if (!value) {
      setNationalDigits('');
      return;
    }
    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country) {
      setCountry(parsed.country);
      setNationalDigits(parsed.nationalNumber);
    } else {
      setNationalDigits(value.replace(/\D/g, ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) searchInputRef.current?.focus();
  }, [isOpen]);

  const selectedCountry = countries.find((c) => c.iso2 === country);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.iso2.toLowerCase().includes(q)
    );
  }, [countries, search]);

  const emitChange = (nextCountry: CountryCode, nextDigits: string) => {
    if (!nextDigits) {
      lastEmitted.current = '';
      onChange('');
      setLocalError('');
      return;
    }
    const candidate = `+${getCountryCallingCode(nextCountry)}${nextDigits}`;
    const parsed = parsePhoneNumberFromString(candidate, nextCountry);
    if (parsed?.isValid()) {
      lastEmitted.current = parsed.number;
      onChange(parsed.number);
      setLocalError('');
    } else {
      lastEmitted.current = candidate;
      onChange(candidate);
      setLocalError(touched ? `Please enter a valid phone number for ${countryName(nextCountry)}` : '');
    }
  };

  const handleDigitsChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 15);
    setNationalDigits(digitsOnly);
    emitChange(country, digitsOnly);
  };

  const handleCountrySelect = (iso2: CountryCode) => {
    setCountry(iso2);
    setIsOpen(false);
    setSearch('');
    emitChange(iso2, nationalDigits);
  };

  const handleBlur = () => {
    setTouched(true);
    if (nationalDigits) {
      const candidate = `+${getCountryCallingCode(country)}${nationalDigits}`;
      const parsed = parsePhoneNumberFromString(candidate, country);
      setLocalError(parsed?.isValid() ? '' : `Please enter a valid phone number for ${countryName(country)}`);
    }
  };

  const displayError = error || localError;
  const inputId = id || 'phone-' + (label || 'input').toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && ' *'}
        </label>
      )}

      <div
        className={`field-input relative flex items-stretch p-0 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15 ${
          displayError ? 'is-error' : ''
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          disabled={disabled}
          className="flex items-center gap-1.5 pl-3.5 pr-2.5 border-r border-outline-variant shrink-0 hover:bg-surface-container-high transition-colors rounded-l-md disabled:cursor-not-allowed"
          aria-label="Select country calling code"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="text-base leading-none" aria-hidden="true">
            {flagEmoji(country)}
          </span>
          <span className="text-sm text-on-surface tabular-nums">+{selectedCountry?.dialCode}</span>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">
            expand_more
          </span>
        </button>

        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={nationalDigits}
          onChange={(e) => handleDigitsChange(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="98765 43210"
          className="flex-1 min-w-0 bg-transparent border-none outline-none px-3 py-[0.875rem] text-[15px] text-on-surface disabled:cursor-not-allowed"
        />

        {isOpen && (
          <div
            role="listbox"
            className="absolute top-full left-0 mt-1.5 w-80 max-w-[90vw] max-h-80 bg-surface border border-outline-variant rounded-lg shadow-lg z-50 flex flex-col overflow-hidden"
          >
            <div className="p-2 border-b border-outline-variant shrink-0">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code..."
                className="field-input w-full py-2 px-3 text-sm"
              />
            </div>
            <div className="overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <div className="px-4 py-3 text-sm text-on-surface-variant">No countries found</div>
              ) : (
                filteredCountries.map((c) => (
                  <button
                    key={c.iso2}
                    type="button"
                    role="option"
                    aria-selected={c.iso2 === country}
                    onClick={() => handleCountrySelect(c.iso2)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-surface-container-high transition-colors ${
                      c.iso2 === country ? 'bg-accent-soft text-accent-hover font-semibold' : 'text-on-surface'
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden="true">
                      {flagEmoji(c.iso2)}
                    </span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-on-surface-variant tabular-nums">+{c.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {displayError && <span className="text-error text-xs mt-1.5">{displayError}</span>}
    </div>
  );
};
