import { API_BASE_URL } from './constants';

export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  
  try {
    const base = API_BASE_URL.startsWith('http')
      ? API_BASE_URL
      : (typeof window !== 'undefined' ? window.location.origin : '');
    if (!base) {
      return path.startsWith('/') ? path : `/${path}`;
    }
    const url = new URL(base);
    return `${url.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  } catch {
    return path;
  }
};
