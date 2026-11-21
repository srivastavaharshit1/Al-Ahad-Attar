import { CURRENCY_SYMBOL } from './constants';

export const formatPrice = (price: number): string => {
  if (isNaN(price) || price === null || price === undefined) {
    return `${CURRENCY_SYMBOL}0.00`;
  }
  return `${CURRENCY_SYMBOL}${Number(price).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
