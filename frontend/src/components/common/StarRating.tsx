import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  readonly?: boolean;
  onChange?: (rating: number) => void;
  showText?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 20,
  readonly = true,
  onChange,
  showText = false
}) => {
  const [hoverRating, setHoverRating] = React.useState<number>(0);

  const renderStar = (index: number) => {
    const isHovered = !readonly && hoverRating >= index;
    const isFilled = rating >= index;
    const isHalf = !readonly ? false : (!Number.isInteger(rating) && Math.ceil(rating) === index);

    if (isHalf) {
      return (
        <div key={index} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="text-outline-variant absolute top-0 left-0" />
          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
            <Star size={size} className="text-accent fill-current" />
          </div>
        </div>
      );
    }

    if (readonly) {
      return (
        <Star
          key={index}
          size={size}
          className={`transition-colors duration-200 ${isFilled ? 'text-accent fill-current' : 'text-outline-variant'}`}
        />
      );
    }

    return (
      <button
        key={index}
        type="button"
        aria-label={`Rate ${index} out of ${maxRating} stars`}
        aria-pressed={rating === index}
        className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        onMouseEnter={() => setHoverRating(index)}
        onMouseLeave={() => setHoverRating(0)}
        onFocus={() => setHoverRating(index)}
        onBlur={() => setHoverRating(0)}
        onClick={() => onChange?.(index)}
      >
        <Star
          size={size}
          className={`transition-colors duration-200 ${
            isHovered || isFilled ? 'text-accent fill-current' : 'text-outline-variant'
          }`}
        />
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, i) => i + 1).map(renderStar)}
      </div>
      {showText && <span className="ml-1 text-sm text-on-surface-variant font-medium">{rating.toFixed(1)}</span>}
    </div>
  );
};
