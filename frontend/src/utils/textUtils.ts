/**
 * Utility to sanitize text strings and fix common UTF-8 mojibake decoding artifacts
 * without altering the original meaning of content fetched from backend APIs.
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/â‚¹/g, '₹')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â€™/g, '’')
    .replace(/â€˜/g, '‘')
    .replace(/â€œ/g, '“')
    .replace(/â€\x9d/g, '”')
    .replace(/â€\x99/g, '’')
    .replace(/â€/g, '”');
};

