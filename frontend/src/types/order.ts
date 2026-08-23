export type OrderStatus = 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

// REFUND_REQUIRED: cancellation accepted, awaiting admin action (admin controls the actual
// Razorpay call — cancelling never auto-refunds). REFUNDED: Razorpay confirmed completion.
export type RefundStatus = 'NOT_REQUIRED' | 'REFUND_REQUIRED' | 'PROCESSING' | 'REFUNDED' | 'FAILED';

export interface OrderItem {
  id: number;
  variantId: number;
  productName: string;
  variantSize: string;
  productImage: string;

  originalPrice: number;
  discountAmount: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  
  bottleId?: number | null;
  bottleName?: string | null;
  bottlePrice?: number | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  transactionId?: string;
  shippingCost: number;
  offerDiscountAmount: number;
  couponDiscountAmount: number;
  courierName?: string;
  trackingNumber?: string;
  expectedDeliveryDate?: string;
  shipmentNotes?: string;
  notes?: string;
  // Gift service snapshot
  giftServiceId?: number | null;
  giftServiceName?: string | null;
  giftServicePrice?: number | null;
  giftMessage?: string | null;
  items: OrderItem[];
  shippingAddress: any;
  // Refund fields
  refundStatus?: RefundStatus | null;
  refundId?: string | null;
  refundAmount?: number | null;
  refundInitiatedAt?: string | null;
  refundCompletedAt?: string | null;
  refundFailureReason?: string | null;
  refundInitiatedBy?: string | null;
}


export interface OrderRequest {
  shippingAddressId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  notes?: string;
  couponCode?: string;
  simulatePaymentFailure?: boolean;
  giftServiceId?: number | null;
  giftMessage?: string | null;
  items: any[];
}

export interface PaymentOrderResponse {
  razorpayOrderId: string;
  status: string;
  message: string;
  devMode?: boolean;
}
