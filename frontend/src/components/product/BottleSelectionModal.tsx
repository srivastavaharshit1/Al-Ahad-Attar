import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bottleService } from '../../services/bottleService';
import type { Bottle } from '../../services/bottleService';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface BottleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bottle: Bottle | null) => void;
  selectedSize?: string;
  productType?: 'ATTAR' | 'PERFUME' | '';
}

export const BottleSelectionModal: React.FC<BottleSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedSize,
  productType,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
      bottleService.getActive(productType)
        .then((data) => {
          let filtered = data || [];
          if (selectedSize) {
            filtered = filtered.filter((b: Bottle) => !b.capacity || b.capacity === selectedSize);
          }
          filtered.sort((a: Bottle, b: Bottle) => (a.price || 0) - (b.price || 0));
          setBottles(filtered);
          if (filtered.length > 0) {
            // Pre-select the first one with price 0 AND in stock if exists, or just the first one in stock
            const freeBottle = filtered.find((b) => b.price === 0 && (b.stockQuantity || 0) > 0);
            if (freeBottle) {
              setSelectedId(freeBottle.id);
            } else {
              const inStockBottle = filtered.find((b) => (b.stockQuantity || 0) > 0);
              setSelectedId(inStockBottle ? inStockBottle.id : null);
            }
          }
        })
        .catch(() => toast.error('Failed to load bottle options'))
        .finally(() => setIsLoading(false));

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, selectedSize, productType]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fade-up">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottle-modal-title"
        className="bg-white w-full max-w-2xl rounded-[3px] shadow-[0_25px_60px_rgba(18,28,42,0.3)] overflow-hidden flex flex-col max-h-[90vh] border border-[#e4dcc8]"
      >
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e4dcc8] bg-[#fbf9f5]">
          <div>
            <span className="text-accent text-[9px] font-label-md uppercase tracking-[0.25em] font-medium block mb-1">
              CUSTOMIZE PRESENTATION
            </span>
            <h2 id="bottle-modal-title" className="text-2xl font-headline-lg font-normal text-ink tracking-wide">Select Your Bottle</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-accent hover:bg-accent/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#fbf9f5]/50">
          <p className="text-on-surface-variant text-xs sm:text-sm mb-6 text-center max-w-md mx-auto font-light leading-relaxed">
            Choose a bespoke bottle design for your {productType === 'PERFUME' ? 'Perfume' : 'Attar'}. We offer fine crystal flacons and luxury glass selections.
          </p>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#e4dcc8]/40 animate-pulse h-48 rounded-[2px]"></div>
              ))}
            </div>
          ) : bottles.length === 0 ? (
            <div className="text-center text-on-surface-variant py-8 font-light text-sm">
              Standard luxury bottle included.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {bottles.map(bottle => (
                <div 
                  key={bottle.id}
                  onClick={() => {
                    if ((bottle.stockQuantity || 0) > 0) {
                      setSelectedId(bottle.id);
                    }
                  }}
                  className={`
                    relative bg-white border rounded-[2px] p-3.5 sm:p-4 transition-all duration-300 flex flex-col items-center text-center h-full justify-between
                    ${bottle.stockQuantity === 0 ? 'opacity-50 cursor-not-allowed border-[#e4dcc8]/40' : 'cursor-pointer hover:shadow-md'}
                    ${selectedId === bottle.id ? 'border-accent bg-accent/5 ring-1 ring-accent' : ((bottle.stockQuantity || 0) > 0 ? 'border-[#e4dcc8] hover:border-accent/60' : '')}
                  `}
                >
                  {selectedId === bottle.id && (
                    <div className="absolute top-2 right-2 bg-accent text-ink p-1 rounded-full shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}

                  <div className="w-full aspect-square bg-[#fbf9f5] rounded-[1px] mb-3 flex items-center justify-center p-2 border border-[#e4dcc8]/40 relative overflow-hidden">
                    {bottle.imageUrl ? (
                      <img 
                        src={getImageUrl(bottle.imageUrl)} 
                        alt={bottle.name} 
                        className="max-w-full max-h-full object-contain drop-shadow"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.bottle-fallback');
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`bottle-fallback w-full h-full flex flex-col items-center justify-center text-accent/60 ${bottle.imageUrl ? 'hidden' : ''}`}>
                      <span className="material-symbols-outlined text-3xl mb-0.5 opacity-60">science</span>
                      <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-light">Artisanal Flacon</span>
                    </div>
                  </div>
                  
                  <div className="w-full flex flex-col items-center flex-1">
                    <h3 className="font-headline-md text-ink text-xs sm:text-sm mb-1 line-clamp-1 font-normal tracking-wide">{bottle.name}</h3>
                    {bottle.capacity && (
                      <span className="inline-block text-[9.5px] sm:text-[10px] uppercase tracking-wider text-accent font-medium bg-accent/10 px-2 py-0.5 rounded-[1px] mb-1.5 border border-accent/20">
                        {bottle.capacity}
                      </span>
                    )}
                    {bottle.description && (
                      <p className="text-[10.5px] sm:text-[11px] text-on-surface-variant/80 mt-1 line-clamp-2 leading-relaxed font-light">
                        {bottle.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#e4dcc8]/40 w-full flex flex-col items-center">
                    <div className="text-accent font-semibold text-xs tracking-wider uppercase">
                      {bottle.price === 0 ? 'Included' : `+${formatPrice(bottle.price)}`}
                    </div>
                    {bottle.stockQuantity === 0 && (
                      <div className="text-error font-medium text-[9px] mt-1 bg-error-container/40 px-2 py-0.5 rounded-[1px] uppercase tracking-wider">
                        Sold Out
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#e4dcc8] bg-white flex justify-end gap-3 items-center">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold tracking-[0.16em] uppercase text-ink/70 hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedId ? bottles.find(b => b.id === selectedId) || null : null)}
            disabled={!selectedId || bottles.length === 0}
            className="px-8 py-3 bg-ink text-white rounded-[2px] hover:bg-accent hover:text-ink transition-all duration-300 font-semibold text-xs uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Confirm & Add to Cart
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
