export type InvoiceChannel = 'ONLINE' | 'POS';
export type InvoicePaperFormat = 'A4' | 'THERMAL_80';
export type InvoiceDeliveryChannel = 'EMAIL' | 'WHATSAPP';
export type InvoiceConsentStatus = 'GRANTED' | 'DECLINED' | 'REVOKED';
export interface InvoiceHistoryItem {
  id: number;
  invoiceKey: string;
  invoiceNumber: string;
  channel: InvoiceChannel;
  customerName: string | null;
  customerMobile: string | null;
  customerEmail: string | null;
  saleId: number | null;
  saleKey: string | null;
  orderNumber: string | null;
  total: number;
  promotionDiscount: number;
  manualDiscount: number;
  tenderMethod: string;
  emailStatus: string | null;
  emailAttempts: number;
  whatsappStatus: string | null;
  whatsappAttempts: number;
  issuedAt: string;
}

export interface BillingPage<T> {
  content: T[];
  totalElements: number;
  limit: number;
  offset: number;
}

export interface PosSaleHistoryItem {
  saleId: number;
  saleKey: string;
  invoiceNumber: string | null;
  customerName: string | null;
  customerMobile: string | null;
  customerEmail: string | null;
  subtotal: number;
  promotionDiscount: number;
  manualDiscount: number;
  payable: number;
  tenderMethod: 'CASH' | 'UPI' | 'CARD';
  amountReceived: number;
  changeReturned: number;
  completedAt: string;
}

export interface BillingSalesSummary {
  from: string;
  to: string;
  onlineCount: number;
  onlineSales: number;
  onlineDiscounts: number;
  posCount: number;
  posSales: number;
  posDiscounts: number;
  combinedCount: number;
  combinedSales: number;
  combinedDiscounts: number;
  paymentBreakdown: { method: string; count: number; sales: number; discounts: number }[];
  daily: { period: string; count: number; sales: number; discounts: number }[];
  monthly: { period: string; count: number; sales: number; discounts: number }[];
}

export interface OnlineInvoiceJob {
  id: number;
  orderId: number;
  invoiceId: number | null;
  status: string;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorSummary: string | null;
  retryRequestedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDelivery {
  id: number;
  deliveryKey: string;
  channel: InvoiceDeliveryChannel;
  status: string;
  attemptCount: number;
  destination: string;
  providerMessageId: string | null;
  lastErrorCode: string | null;
  lastErrorSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceConsent {
  channel: InvoiceDeliveryChannel;
  destination: string;
  status: InvoiceConsentStatus;
  wordingVersion: string;
  capturedAt: string;
  revokedAt: string | null;
}

export interface InvoiceConsentPolicy {
  channel: InvoiceDeliveryChannel;
  wordingVersion: string;
  wording: string;
  configured: boolean;
}

export type PosDiscountScope = 'ITEM' | 'SALE';
export type PosDiscountType = 'FIXED' | 'PERCENT';

export interface PosQuoteLineRequest {
  lineKey: string;
  productId: number;
  variantId: number;
  bottleId?: number | null;
  quantity: number;
}

export interface PosQuoteManualDiscountRequest {
  scope: PosDiscountScope;
  type: PosDiscountType;
  /** Send as decimal text so the server receives the exact user-entered amount. */
  value: string;
  lineKey?: string | null;
  reason: string;
}

export interface PosQuoteRequest {
  lines: PosQuoteLineRequest[];
  couponCode?: string | null;
  manualDiscounts: PosQuoteManualDiscountRequest[];
  freeRewards?: { promotionId: number; variantId: number }[];
  customerName?: string | null;
  customerMobile?: string | null;
  customerEmail?: string | null;
}

export interface PosQuoteLine {
  lineKey: string;
  productId: number;
  variantId: number;
  productName: string;
  variantSize: string;
  quantity: number;
  variantUnitPrice: string;
  bottleId: number | null;
  bottleName: string | null;
  bottleUnitPrice: string;
  unitPrice: string;
  lineSubtotal: string;
  promotionDiscount: string;
  lineAfterPromotions: string;
  manualDiscount: string;
  finalLineTotal: string;
  freeItem: boolean;
  freePromotionId: number | null;
  requestedVariantQuantity: number;
  variantStockAvailable: number;
  variantStockSufficient: boolean;
  requestedBottleQuantity: number | null;
  bottleStockAvailable: number | null;
  bottleStockSufficient: boolean;
  available: boolean;
}

export interface PosPromotionSummary {
  id: number;
  name: string;
  code: string | null;
  type: string;
}

export interface PosFreeRewardOption {
  promotionId: number;
  productId: number;
  variantId: number;
  productName: string;
  variant: string;
  promotion: string;
}

export interface PosManualDiscountPreview {
  scope: PosDiscountScope;
  type: PosDiscountType;
  requestedValue: string;
  appliedAmount: string;
  eligibleBalance: string;
  lineKey: string | null;
  reason: string;
}

export interface PosQuoteResponse {
  generatedAt: string;
  previewOnly: boolean;
  adminId: number;
  adminEmail: string;
  lines: PosQuoteLine[];
  subtotal: string;
  promotionItemDiscount: string;
  promotionCartDiscount: string;
  totalPromotionDiscount: string;
  manualDiscount: string;
  payableAmount: string;
  allLinesAvailable: boolean;
  couponCode: string | null;
  couponApplied: boolean;
  appliedPromotions: PosPromotionSummary[];
  availablePromotions: PosPromotionSummary[];
  lockedPromotions: PosPromotionSummary[];
  freeRewardOptions: PosFreeRewardOption[];
  manualDiscounts: PosManualDiscountPreview[];
  messages: string[];
  quoteFingerprint: string;
}

export interface PosSaleFinalizeRequest {
  quote: PosQuoteRequest;
  tender: {
    method: 'CASH' | 'UPI' | 'CARD';
    amountReceived: string;
    transactionReference?: string | null;
  };
  confirmedQuoteFingerprint: string;
}

export interface PosSaleFinalizeResponse {
  saleId: number;
  saleKey: string;
  status: string;
  invoiceId: number;
  invoiceNumber: string;
  issuedAt: string;
  quoteFingerprint: string;
  subtotal: string;
  promotionDiscount: string;
  manualDiscount: string;
  payableAmount: string;
  tenderMethod: 'CASH' | 'UPI' | 'CARD';
  amountReceived: string;
  changeReturned: string;
  amountApplied: string;
  replayed: boolean;
}

