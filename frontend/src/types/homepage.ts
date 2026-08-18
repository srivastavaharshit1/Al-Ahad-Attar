import type { Category } from './category';
import type { ProductSummary } from './product';

export interface HomepageSectionResponse {
  id: number;
  sectionKey: string;
  title: string;
  subtitle: string;
  description: string;
  visible: boolean;
  displayOrder: number;
  maxItems: number | null;
  imageUrl?: string;
}

export interface HomepageSectionRequest {
  title: string;
  subtitle: string;
  description: string;
  visible: boolean;
  maxItems: number | null;
}

export interface HeroBannerResponse {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  badge: string;
  imageUrl: string;
  mobileImageUrl: string;
  active: boolean;
  displayOrder: number;
}

export interface HeroBannerRequest {
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  badge: string;
  active: boolean;
}

export interface PromoBannerResponse {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
  backgroundColor: string;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

export interface PromoBannerRequest {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
  backgroundColor: string;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

export interface TestimonialResponse {
  id: number;
  customerName: string;
  photoUrl: string;
  rating: number;
  review: string;
  displayOrder: number;
  active: boolean;
}

export interface TestimonialRequest {
  customerName: string;
  rating: number;
  review: string;
  active: boolean;
}

export interface WhyChooseUsItemResponse {
  id: number;
  icon: string;
  title: string;
  description: string;
  displayOrder: number;
  active: boolean;
}

export interface WhyChooseUsItemRequest {
  icon: string;
  title: string;
  description: string;
  active: boolean;
}

export interface ReorderRequest {
  id: number;
  displayOrder: number;
}

export interface NewsletterConfigResponse {
  title: string;
  subtitle: string;
  buttonText: string;
  successMessage: string;
}

export interface HomepageDataResponse {
  sections: HomepageSectionResponse[];
  heroes: HeroBannerResponse[];
  promoBanners: PromoBannerResponse[];
  categories: Category[];
  featuredProducts: ProductSummary[];
  testimonials: TestimonialResponse[];
  whyChooseUsItems: WhyChooseUsItemResponse[];
  newsletterConfig: NewsletterConfigResponse;
}
