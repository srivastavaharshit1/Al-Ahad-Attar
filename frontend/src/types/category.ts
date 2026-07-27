export interface Category {
  id: number;
  name: string;
  description: string;
  image: string;
  type: string;
  active: boolean;
  desktopImageUrl?: string | null;
  mobileImageUrl?: string | null;
  hoverImageUrl?: string | null;
  homepageTitle?: string | null;
  homepageSubtitle?: string | null;
  homepageButtonText?: string | null;
  homepageButtonUrl?: string | null;
  showOnHomepage?: boolean;
  homepageDisplayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export const _CategoryModule = true; // Dummy export to prevent Vite/esbuild empty module error
