import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '../../utils/getImageUrl';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [current, setCurrent] = useState(initialIndex);
  const dialogRef = useRef<HTMLDivElement>(null);

  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/95 backdrop-blur-sm flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close image viewer"
        className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X size={22} />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full font-body-sm tracking-wide">
          {current + 1} / {images.length}
        </div>
      )}

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={prev}
          aria-label="Previous image"
          className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronLeft size={26} />
        </button>
      )}

      {/* Main Image */}
      <div ref={dialogRef} className="max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        <img
          src={getImageUrl(images[current])}
          alt={`Image ${current + 1} of ${images.length}`}
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
          draggable={false}
        />
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={next}
          aria-label="Next image"
          className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronRight size={26} />
        </button>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              aria-label={`View image ${idx + 1}`}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                idx === current ? 'border-accent scale-110' : 'border-white/30 hover:border-white/60'
              }`}
            >
              <img
                src={getImageUrl(url)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
