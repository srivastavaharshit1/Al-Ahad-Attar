export interface Offer {
  id: number;
  name: string;
  description: string;
  offerType: string;
  discountType: string;
  discountValue: number;
  priority: number;
  startDate: string;
  endDate: string;
  active: boolean;
  targetId?: number;
}
