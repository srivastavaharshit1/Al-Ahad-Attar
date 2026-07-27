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
          <Star size={size} className="text-gray-300 absolute top-0 left-0" />
          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
            <Star size={size} className="text-yellow-400 fill-current" />
          </div>
        </div>
      );
    }

    return (
      <Star
        key={index}
        size={size}
        className={`cursor-${readonly ? 'default' : 'pointer'} transition-colors duration-200 ${
          isHovered || isFilled ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
        onMouseEnter={() => !readonly && setHoverRating(index)}
        onMouseLeave={() => !readonly && setHoverRating(0)}
        onClick={() => !readonly && onChange?.(index)}
      />
    );
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: maxRating }, (_, i) => i + 1).map(renderStar)}
      </div>
      {showText && <span className="ml-1 text-sm text-gray-600 font-medium">{rating.toFixed(1)}</span>}
    </div>
  );
};
