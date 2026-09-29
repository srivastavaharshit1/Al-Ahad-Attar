import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { homepageService } from '../../../services/homepageService';
import { productService } from '../../../services/productService';
import type { HomepageProductSlotResponse, HomepageProductSectionKey } from '../../../types/homepage';
import type { Product } from '../../../types';
import { getImageUrl } from '../../../utils/getImageUrl';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';

// ── Section metadata ───────────────────────────────────────────────────────

const SECTIONS: {
  key: HomepageProductSectionKey;
  label: string;
  description: string;
  eligibilityNote: string;
}[] = [
  {
    key: 'ATTARS',
    label: 'Attars',
    description: 'Shown in the "Explore Our Attars" carousel.',
    eligibilityNote: 'Only products from the Attars category.',
  },
  {
    key: 'PERFUMES_BAKHOOR',
    label: 'Perfumes & Car Perfumes',
    description: 'Shown in the "Perfumes & Car Perfumes" carousel.',
    eligibilityNote: 'Perfumes or Car Perfumes.',
  },
  {
    key: 'CAR_PERFUMES_INCENSE',
    label: 'Bakhoor & Incense Sticks',
    description: 'Shown in the "Bakhoor & Incense Sticks" carousel.',
    eligibilityNote: 'Bakhoor and Incense Sticks products.',
  },
];

// ── Main component ─────────────────────────────────────────────────────────

export const ProductSectionsTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<HomepageProductSectionKey>('ATTARS');
  const [slotsBySection, setSlotsBySection] = useState<Record<HomepageProductSectionKey, HomepageProductSlotResponse[]>>({
    ATTARS: [],
    PERFUMES_BAKHOOR: [],
    CAR_PERFUMES_INCENSE: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmSlot, setDeleteConfirmSlot] = useState<{ id: number; productName: string } | null>(null);

  // Product search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load slots for all sections once on mount
  useEffect(() => {
    loadAllSections();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadAllSections = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.all(
        SECTIONS.map(s => homepageService.getProductSlots(s.key))
      );
      setSlotsBySection({
        ATTARS: results[0],
        PERFUMES_BAKHOOR: results[1],
        CAR_PERFUMES_INCENSE: results[2],
      });
    } catch {
      toast.error('Failed to load homepage product slots');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSection = async (section: HomepageProductSectionKey) => {
    try {
      const slots = await homepageService.getProductSlots(section);
      setSlotsBySection(prev => ({ ...prev, [section]: slots }));
    } catch {
      toast.error('Failed to refresh section');
    }
  };

  // ── Search ──────────────────────────────────────────────────────────────

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!q.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await productService.getProducts({ search: q, active: true, size: 100 });
        
        // Filter locally based on the active tab's eligibility rules
        const filtered = ((res.content || []) as Product[]).filter(product => {
          const catName = product.category?.name?.toUpperCase() || (product as any).categoryName?.toUpperCase() || '';
          const isAttarCat = catName.includes('ATTAR');
          const isPerfumeCat = catName.includes('PERFUME');
          const isBakhoorCat = catName.includes('BAKHOOR');

          switch (activeSection) {
            case 'ATTARS': {
              const hasAttarVariant = product.variants?.some(v => v.productType === 'ATTAR');
              return isAttarCat || (isPerfumeCat && hasAttarVariant);
            }
            case 'PERFUMES_BAKHOOR': {
              const hasPerfumeVariant = product.variants?.some(v => v.productType === 'PERFUME');
              return isPerfumeCat || (isAttarCat && hasPerfumeVariant);
            }
            case 'CAR_PERFUMES_INCENSE': {
              return isBakhoorCat;
            }
            default: return true;
          }
        });
        
        setSearchResults(filtered.slice(0, 20)); // Keep dropdown manageable
        setShowDropdown(true);
      } catch {
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleError = (err: any, fallbackMessage: string) => {
    try {
      if (!err || !err.response) {
        toast.error('Network or server error. Please try again.');
        return;
      }
      
      const status = err.response.status;
      const backendMsg = err.response.data?.message;

      if (status === 401) {
        toast.error('Your session may have expired. Please sign in again.');
      } else if (status === 403) {
        toast.error('You do not have permission to perform this action.');
      } else if ((status === 409 || status === 400) && typeof backendMsg === 'string' && backendMsg.trim() !== '') {
        toast.error(backendMsg);
      } else {
        toast.error(fallbackMessage);
      }
    } catch (e) {
      toast.error(fallbackMessage);
    }
  };

  const handleAddProduct = async (product: Product) => {
    setShowDropdown(false);
    setSearchQuery('');
    setSearchResults([]);

    setIsSaving(true);
    try {
      await homepageService.addProductSlot(activeSection, { productId: product.id });
      toast.success(`"${product.name}" added to ${SECTIONS.find(s => s.key === activeSection)?.label}`);
      await loadSection(activeSection);
    } catch (err: any) {
      handleError(err, 'Failed to add product');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Slot actions ────────────────────────────────────────────────────────

  const handleRemove = (slotId: number, productName: string) => {
    setDeleteConfirmSlot({ id: slotId, productName });
  };

  const confirmRemove = async () => {
    if (!deleteConfirmSlot) return;
    setIsSaving(true);
    try {
      await homepageService.removeProductSlot(deleteConfirmSlot.id);
      toast.success('Product removed from section');
      await loadSection(activeSection);
    } catch (err: any) {
      handleError(err, 'Failed to remove product');
    } finally {
      setIsSaving(false);
      setDeleteConfirmSlot(null);
    }
  };

  const handleToggleEnabled = async (slot: HomepageProductSlotResponse) => {
    setIsSaving(true);
    try {
      await homepageService.setSlotEnabled(slot.id, !slot.enabled);
      await loadSection(activeSection);
    } catch (err: any) {
      handleError(err, 'Failed to update slot');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    const slots = [...slotsBySection[activeSection]];
    if (index === 0) return;
    [slots[index - 1], slots[index]] = [slots[index], slots[index - 1]];
    await saveOrder(slots);
  };

  const handleMoveDown = async (index: number) => {
    const slots = [...slotsBySection[activeSection]];
    if (index === slots.length - 1) return;
    [slots[index], slots[index + 1]] = [slots[index + 1], slots[index]];
    await saveOrder(slots);
  };

  const saveOrder = async (reordered: HomepageProductSlotResponse[]) => {
    setIsSaving(true);
    // Optimistic update
    setSlotsBySection(prev => ({ ...prev, [activeSection]: reordered }));
    try {
      const entries = reordered.map((s, idx) => ({ slotId: s.id, displayOrder: idx + 1 }));
      await homepageService.reorderProductSlots(activeSection, entries);
      await loadSection(activeSection);
    } catch (err: any) {
      handleError(err, 'Failed to save order');
      await loadSection(activeSection); // Revert
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const currentSlots = slotsBySection[activeSection];
  const currentSection = SECTIONS.find(s => s.key === activeSection)!;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">
          Homepage Product Carousels
        </h2>
        <p className="font-body-sm text-on-surface-variant text-sm">
          Select which products appear in each carousel section on the homepage. Customers see them in the order shown here.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-outline-variant overflow-x-auto">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            id={`product-section-tab-${s.key.toLowerCase()}`}
            onClick={() => setActiveSection(s.key)}
            aria-current={activeSection === s.key ? 'page' : undefined}
            className={`px-4 py-2.5 font-label-sm text-label-sm uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
              activeSection === s.key
                ? 'text-accent border-accent font-semibold'
                : 'text-on-surface-variant border-transparent hover:text-accent hover:border-accent/40'
            }`}
          >
            {s.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-normal ${
              slotsBySection[s.key].length > 0
                ? 'bg-accent/10 text-accent'
                : 'bg-outline-variant/30 text-on-surface-variant'
            }`}>
              {slotsBySection[s.key].filter(sl => sl.enabled).length}
            </span>
          </button>
        ))}
      </div>

      {/* Section info */}
      <div className="bg-surface-container-low rounded-lg p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-accent text-xl mt-0.5">info</span>
        <div>
          <p className="font-body-sm text-on-surface text-sm">{currentSection.description}</p>
          <p className="font-body-sm text-on-surface-variant text-xs mt-1">
            <strong>Eligible products:</strong> {currentSection.eligibilityNote}
          </p>
        </div>
      </div>

      {/* Product search */}
      <div ref={searchRef} className="relative">
        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">
          Add Product
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-xl">
            search
          </span>
          <input
            id="product-section-search"
            type="text"
            placeholder="Search by product name…"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-accent text-xl animate-spin">
              progress_activity
            </span>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full max-h-72 overflow-y-auto bg-surface border border-outline-variant rounded-lg shadow-xl">
            {searchResults.map(product => {
              const alreadyAdded = currentSlots.some(s => s.product.id === product.id);
              return (
                <button
                  key={product.id}
                  id={`search-result-product-${product.id}`}
                  disabled={alreadyAdded || isSaving}
                  onClick={() => !alreadyAdded && handleAddProduct(product)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-outline-variant/30 last:border-b-0 ${
                    alreadyAdded
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-surface-container-low cursor-pointer'
                  }`}
                >
                  {(product as any).thumbnail ? (
                    <img
                      src={getImageUrl((product as any).thumbnail)}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded shrink-0 bg-surface-container"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-surface-container rounded shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">image</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-sm text-on-surface truncate">{product.name}</p>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      {product.category?.name || '—'}
                      {(product as any).subcategory ? ` · ${(product as any).subcategory}` : ''}
                    </p>
                  </div>
                  {alreadyAdded && (
                    <span className="text-xs text-accent shrink-0">Already added</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {showDropdown && !isSearching && searchQuery && searchResults.length === 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-surface border border-outline-variant rounded-lg shadow-xl p-4 text-center">
            <p className="font-body-sm text-on-surface-variant text-sm">No products found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Slot list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
            {currentSection.label} ({currentSlots.length} products)
          </h3>
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              Saving…
            </span>
          )}
        </div>

        {currentSlots.length === 0 ? (
          <div className="border-2 border-dashed border-outline-variant rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">grid_view</span>
            <p className="font-body-md text-on-surface-variant">
              No products added yet. Use the search above to add products.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentSlots.map((slot, index) => (
              <div
                key={slot.id}
                id={`slot-row-${slot.id}`}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  slot.enabled
                    ? 'border-outline-variant bg-surface-container-lowest'
                    : 'border-outline-variant/40 bg-surface-container opacity-60'
                }`}
              >
                {/* Drag handle visual indicator (order number) */}
                <span className="text-xs text-on-surface-variant font-mono w-5 text-center shrink-0">
                  {index + 1}
                </span>

                {/* Product image */}
                {slot.product.thumbnail ? (
                  <img
                    src={getImageUrl(slot.product.thumbnail)}
                    alt={slot.product.name}
                    className="w-12 h-12 object-cover rounded bg-surface-container shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-surface-container rounded shrink-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant/40 text-xl">image</span>
                  </div>
                )}

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-sm text-on-surface truncate">{slot.product.name}</p>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    {slot.product.categoryName || '—'}
                    {(slot.product as any).subcategory ? ` · ${(slot.product as any).subcategory}` : ''}
                    {slot.product.minimumPrice ? ` · ₹${slot.product.minimumPrice}` : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Move up/down */}
                  <button
                    id={`slot-up-${slot.id}`}
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || isSaving}
                    aria-label="Move up"
                    className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  </button>
                  <button
                    id={`slot-down-${slot.id}`}
                    onClick={() => handleMoveDown(index)}
                    disabled={index === currentSlots.length - 1 || isSaving}
                    aria-label="Move down"
                    className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                  </button>

                  {/* Enable/disable toggle */}
                  <button
                    id={`slot-toggle-${slot.id}`}
                    onClick={() => handleToggleEnabled(slot)}
                    disabled={isSaving}
                    aria-pressed={slot.enabled}
                    aria-label={slot.enabled ? 'Hide product from carousel' : 'Show product in carousel'}
                    title={slot.enabled ? 'Visible — click to hide' : 'Hidden — click to show'}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                      slot.enabled
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {slot.enabled ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>

                  {/* Remove */}
                  <button
                    id={`slot-remove-${slot.id}`}
                    onClick={() => handleRemove(slot.id, slot.product.name)}
                    disabled={isSaving}
                    aria-label={`Remove ${slot.product.name} from section`}
                    className="w-8 h-8 flex items-center justify-center rounded text-error hover:bg-error/10 transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={deleteConfirmSlot !== null}
        onClose={() => !isSaving && setDeleteConfirmSlot(null)}
        onConfirm={confirmRemove}
        title="Remove Product?"
        description={`Are you sure you want to remove ${deleteConfirmSlot?.productName} from this homepage section? This will not delete the product from your store.`}
        confirmText="Remove"
        actionType="DELETE"
        dangerMode={true}
        isLoading={isSaving}
      />
    </div>
  );
};
