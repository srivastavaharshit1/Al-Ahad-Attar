export const formatCurrency = (amount: number, currencyCode: string = 'INR', locale: string = 'en-IN'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
