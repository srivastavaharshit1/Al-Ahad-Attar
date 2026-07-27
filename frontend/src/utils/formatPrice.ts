import { CURRENCY_SYMBOL } from './constants';

export const formatPrice = (price: number): string => {
  return `${CURRENCY_SYMBOL}${price.toFixed(2)}`;
};
