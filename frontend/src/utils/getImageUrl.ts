import { API_BASE_URL } from './constants';

export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  
  try {
    const url = new URL(API_BASE_URL);
    return `${url.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  } catch (e) {
    return path;
  }
};
