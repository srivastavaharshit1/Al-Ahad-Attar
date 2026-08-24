import React, { useEffect, useState } from 'react';
import { bottleService } from '../../services/bottleService';
import type { Bottle } from '../../services/bottleService';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface BottleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bottle: Bottle | null) => void;
  selectedSize?: string;
}

export const BottleSelectionModal: React.FC<BottleSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedSize,
}) => {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      bottleService.getActive()
        .then((data) => {
          let filtered = data || [];
          if (selectedSize) {
            filtered = filtered.filter((b: Bottle) => !b.capacity || b.capacity === selectedSize);
          }
          setBottles(filtered);
          if (filtered.length > 0) {
            // Pre-select the first one with price 0 if exists, or just the first one
            const freeBottle = filtered.find((b: Bottle) => b.price === 0);
            setSelectedId(freeBottle ? freeBottle.id : filtered[0].id);
          }
        })
        .catch(() => toast.error('Failed to load bottle options'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, selectedSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-light text-gray-900">Select Your Bottle</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          <p className="text-gray-600 mb-6 text-center max-w-md mx-auto">
            Choose a bottle design for your Attar. We offer a variety of premium crystal cuts and standard glass options.
          </p>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-200 animate-pulse h-48 rounded-lg"></div>
              ))}
            </div>
          ) : bottles.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No bottles available at the moment.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {bottles.map(bottle => (
                <div 
                  key={bottle.id}
                  onClick={() => setSelectedId(bottle.id)}
                  className={`
                    relative bg-white border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 flex flex-col items-center text-center
                    ${selectedId === bottle.id ? 'border-[#b89445] shadow-md ring-1 ring-[#b89445]' : 'border-gray-200 hover:border-[#b89445]/50 hover:shadow-sm'}
                  `}
                >
                  {selectedId === bottle.id && (
                    <div className="absolute top-2 right-2 bg-[#b89445] text-white p-1 rounded-full shadow-sm">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}

                  <div className="w-full aspect-square bg-gray-50 rounded-lg mb-4 flex items-center justify-center p-2">
                    {bottle.imageUrl ? (
                      <img src={getImageUrl(bottle.imageUrl)} alt={bottle.name} className="max-w-full max-h-full object-contain drop-shadow-md" />
                    ) : (
                      <div className="text-gray-300">No Image</div>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-gray-900 text-sm mb-1 leading-tight">{bottle.name}</h3>
                  <div className="text-[#b89445] font-medium text-sm mt-auto">
                    {bottle.price === 0 ? 'Included' : `+${formatPrice(bottle.price)}`}
                  </div>
                  {bottle.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                      {bottle.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-white flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedId ? bottles.find(b => b.id === selectedId) || null : null)}
            disabled={!selectedId || bottles.length === 0}
            className="px-8 py-2.5 bg-[#b89445] text-white rounded hover:bg-[#a08035] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Confirm & Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
