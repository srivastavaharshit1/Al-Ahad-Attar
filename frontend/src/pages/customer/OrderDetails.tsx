import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import type { Order } from '../../types';
import { getImageUrl } from '../../utils/getImageUrl';


// ─── Cancellation Section ────────────────────────────────────────────────────

interface CancellationSectionProps {
  order: Order;
  onCancel: () => void;
  isCancelling: boolean;
  cancelError: string | null;
}

const CancellationSection: React.FC<CancellationSectionProps> = ({
  order,
  onCancel,
  isCancelling,
  cancelError,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  switch (order.status) {
    case 'CONFIRMED':
      return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden">
          <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">cancel</span>
            <h2 className="font-headline-sm">Order Actions</h2>
          </div>
          <div className="p-6">
            {cancelError && (
              <div className="mb-4 flex items-start gap-3 bg-error-container/20 border border-error/30 rounded-lg p-4">
                <span className="material-symbols-outlined text-error text-[20px] flex-shrink-0 mt-0.5">error</span>
                <p className="text-sm text-error">{cancelError}</p>
              </div>
            )}
            {!showConfirm ? (
              <button
                id="cancel-order-btn"
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-DEFAULT border border-error text-error font-label-lg hover:bg-error hover:text-white transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                Cancel Order
              </button>
            ) : (
              <div className="bg-error-container/10 border border-error/20 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-5">
                  <span className="material-symbols-outlined text-error text-[24px] flex-shrink-0">warning</span>
                  <div>
                    <p className="font-label-lg text-on-surface mb-1">Cancel this order?</p>
                    <p className="text-sm text-on-surface-variant">
                      This action cannot be undone. The order will be marked as cancelled and your payment refund (if applicable) will be processed.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    id="confirm-cancel-btn"
                    onClick={onCancel}
                    disabled={isCancelling}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-DEFAULT bg-error text-white font-label-lg hover:bg-error/90 disabled:opacity-60 transition-all duration-200"
                  >
                    {isCancelling ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                        Yes, Cancel Order
                      </>
                    )}
                  </button>
                  <button
                    id="keep-order-btn"
                    onClick={() => setShowConfirm(false)}
                    disabled={isCancelling}
                    className="px-5 py-2.5 rounded-DEFAULT border border-outline-variant text-on-surface font-label-lg hover:bg-surface-container transition-colors"
                  >
                    Keep Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );

    case 'PACKED':
      return (
        <div className="bg-surface-container-lowest border border-indigo-200 rounded-DEFAULT overflow-hidden">
          <div className="p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <p className="font-label-lg text-indigo-800 mb-1">Order Being Prepared</p>
              <p className="text-sm text-indigo-700 leading-relaxed">
                Your order has been packed and is being prepared for shipment.
                Order cancellation is no longer available.
              </p>
            </div>
          </div>
        </div>
      );

    case 'SHIPPED':
      return (
        <div className="bg-surface-container-lowest border border-purple-200 rounded-DEFAULT overflow-hidden">
          <div className="p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🚚</span>
            </div>
            <div>
              <p className="font-label-lg text-purple-800 mb-1">Order Shipped</p>
              <p className="text-sm text-purple-700 leading-relaxed">
                This order has already been shipped and is on its way to you.
                Cancellation is no longer available.
              </p>
              {(order.courierName || order.trackingNumber) && (
                <div className="mt-3 bg-purple-50 rounded p-3 text-sm text-purple-900 space-y-1">
                  {order.courierName && <p><strong>Courier:</strong> {order.courierName}</p>}
                  {order.trackingNumber && <p><strong>Tracking:</strong> {order.trackingNumber}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 'DELIVERED':
      return (
        <div className="bg-surface-container-lowest border border-green-200 rounded-DEFAULT overflow-hidden">
          <div className="p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="font-label-lg text-green-800 mb-1">Order Delivered</p>
              <p className="text-sm text-green-700 leading-relaxed">
                Your order has been successfully delivered. Thank you for shopping with us!
              </p>
            </div>
          </div>
        </div>
      );

    case 'CANCELLED':
      return (
        <div className="bg-surface-container-lowest border border-red-200 rounded-DEFAULT overflow-hidden">
          <div className="p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">❌</span>
            </div>
            <div>
              <p className="font-label-lg text-red-800 mb-1">Order Cancelled</p>
              <p className="text-sm text-red-700 leading-relaxed">
                This order has been cancelled.
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export const OrderDetails: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);

  const fetchOrder = async (orderId: string) => {
    try {
      setIsLoading(true);
      const res = await orderService.getOrder(orderId);
      setOrder(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      setIsCancelling(true);
      setCancelError(null);
      await orderService.cancelOrder(order.id);
      // Re-fetch so the UI reflects the new CANCELLED status
      await fetchOrder(String(order.id));
    } catch (err: any) {
      setCancelError(
        err.response?.data?.message || 'Failed to cancel order. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading order details...</div>;
  if (error || !order) return <div className="text-center p-8 text-error">{error || 'Order not found'}</div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link to="/account/orders" className="w-10 h-10 bg-surface-container-low rounded-full flex items-center justify-center hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="font-display-sm text-display-sm text-on-surface">Order Details</h1>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-6 mb-8 flex flex-wrap gap-x-12 gap-y-4">
        <div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Order Number</p>
          <p className="font-body-lg text-on-surface">{order.orderNumber}</p>
        </div>
        <div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Date Placed</p>
          <p className="font-body-lg text-on-surface">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Status</p>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-label-md uppercase tracking-wider mt-1 ${
            order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
            order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' : 
            order.status === 'PACKED' ? 'bg-indigo-100 text-indigo-800' : 
            order.status === 'SHIPPED' ? 'bg-purple-100 text-purple-800' : 
            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {formatOrderStatus(order.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Gift Service */}
          {order.giftServiceName && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">redeem</span>
                <h2 className="font-headline-sm">Gift Services</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-lg">{order.giftServiceName}</p>
                    {order.giftMessage && (
                      <div className="mt-3 bg-surface-container p-3 rounded-lg border border-outline-variant/50">
                        <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Gift Message</p>
                        <p className="font-body-md text-on-surface italic">"{order.giftMessage}"</p>
                      </div>
                    )}
                  </div>
                  <span className="font-headline-sm text-primary">
                    {order.giftServicePrice ? `+${(order.giftServicePrice as any).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}` : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden">
            <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant">
              <h2 className="font-headline-sm">Items in Order</h2>
            </div>
            <div className="p-6 space-y-6">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-24 h-24 bg-surface-container-low rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.productImage ? (
                      <img src={getImageUrl(item.productImage)} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-outline">image</span>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-label-lg">{item.productName}</h3>
                        <p className="text-sm text-on-surface-variant mb-2">{item.variantSize}</p>
                        <p className="text-sm text-on-surface-variant">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-headline-sm">{formatPrice(item.unitPrice || 0)}</p>
                        {item.discountAmount && item.discountAmount > 0 ? (
                          <p className="text-xs text-on-surface-variant line-through mt-1">
                            {formatPrice(item.originalPrice)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Timeline */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden">
            <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant">
              <h2 className="font-headline-sm">Order Timeline</h2>
            </div>
            <div className="p-6">
              <div className="relative border-l border-outline-variant ml-4 space-y-8 pb-4">
                
                <div className="relative">
                  <span className={`absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest ${['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                  <div className="ml-6">
                    <p className="font-label-lg">Order Confirmed</p>
                    <p className="text-sm text-on-surface-variant">Your order has been verified and confirmed.</p>
                  </div>
                </div>

                <div className="relative">
                  <span className={`absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest ${['PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                  <div className="ml-6">
                    <p className="font-label-lg">Packed</p>
                    <p className="text-sm text-on-surface-variant">Items are packed and ready for shipping.</p>
                  </div>
                </div>
                
                <div className="relative">
                  <span className={`absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest ${['SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                  <div className="ml-6">
                    <p className="font-label-lg">Shipped</p>
                    <p className="text-sm text-on-surface-variant">Order has been handed over to the courier.</p>
                  </div>
                </div>

                <div className="relative">
                  <span className={`absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest ${order.status === 'DELIVERED' ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                  <div className="ml-6">
                    <p className="font-label-lg">Delivered</p>
                  </div>
                </div>
                
                {order.status === 'CANCELLED' && (
                  <div className="relative mt-8">
                    <span className="absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest bg-error"></span>
                    <div className="ml-6">
                      <p className="font-label-lg text-error">Cancelled</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Cancellation Section ── */}
          <CancellationSection
            order={order}
            onCancel={handleCancelOrder}
            isCancelling={isCancelling}
            cancelError={cancelError}
          />
        </div>

        <div className="space-y-8">
          {/* Summary */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden">
            <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant">
              <h2 className="font-headline-sm">Order Summary</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-on-surface-variant text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(order.items.reduce((acc, item) => acc + ((item.originalPrice || 0) * item.quantity), 0))}</span>
              </div>
              {order.offerDiscountAmount > 0 && (
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Item Discounts</span>
                  <span>-{formatPrice(order.offerDiscountAmount)}</span>
                </div>
              )}
              {order.couponDiscountAmount > 0 && (
                <div className="flex justify-between text-primary text-sm">
                  <span>Cart Discount</span>
                  <span>-{formatPrice(order.couponDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-on-surface-variant text-sm">
                <span>Shipping</span>
                <span>{order.shippingCost === 0 ? <span className="text-green-600">Free</span> : formatPrice(order.shippingCost)}</span>
              </div>
              <div className="pt-4 border-t border-outline-variant flex justify-between mt-2">
                <span className="font-headline-sm">Total</span>
                <span className="font-headline-sm">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden">
            <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant">
              <h2 className="font-headline-sm">Shipping & Payment</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Shipping Address</p>
                <div className="text-on-surface font-body-md space-y-1">
                  <p className="font-medium">{order.shippingAddress?.fullName}</p>
                  <p>{order.shippingAddress?.addressLine1}</p>
                  <p>{order.shippingAddress?.city}, {order.shippingAddress?.country}</p>
                </div>
              </div>
              
              <div>
                <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Payment Details</p>
                <div className="flex items-center gap-2 font-body-md mb-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">payment</span>
                  <span>{order.paymentMethod}</span>
                </div>
                <div className="flex items-center gap-2 font-body-md">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">info</span>
                  <span>Status: <strong className={order.paymentStatus === 'PAID' ? 'text-primary' : ''}>{order.paymentStatus}</strong></span>
                </div>
              </div>

              {/* Refund Tracking */}
              {order.refundStatus && order.refundStatus !== 'NOT_REQUIRED' && (
                <div className="bg-surface-container/30 p-4 rounded-lg border border-outline-variant/50">
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-3">Refund Status</p>
                  
                  {order.refundStatus === 'PENDING' && (
                    <div className="flex items-start gap-3 text-amber-800">
                      <span className="material-symbols-outlined text-[20px] mt-0.5">hourglass_empty</span>
                      <div>
                        <p className="font-medium">Pending Approval</p>
                        <p className="text-sm opacity-90 mt-1">Your refund of {formatPrice(order.refundAmount || order.totalAmount)} will be initiated shortly.</p>
                      </div>
                    </div>
                  )}

                  {order.refundStatus === 'PROCESSING' && (
                    <div className="flex items-start gap-3 text-blue-800">
                      <span className="material-symbols-outlined text-[20px] animate-spin mt-0.5">sync</span>
                      <div>
                        <p className="font-medium">Processing</p>
                        <p className="text-sm opacity-90 mt-1">Your refund has been initiated. Please allow 5–7 business days to reflect in your account.</p>
                      </div>
                    </div>
                  )}

                  {order.refundStatus === 'COMPLETED' && (
                    <div className="flex items-start gap-3 text-green-800">
                      <span className="material-symbols-outlined text-[20px] mt-0.5">check_circle</span>
                      <div>
                        <p className="font-medium">Completed</p>
                        <p className="text-sm opacity-90 mt-1">{formatPrice(order.refundAmount || 0)} has been refunded successfully.</p>
                        {order.refundId && <p className="text-xs opacity-75 mt-1 font-mono">ID: {order.refundId}</p>}
                        {order.refundCompletedAt && <p className="text-xs opacity-75">Date: {new Date(order.refundCompletedAt).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  )}

                  {order.refundStatus === 'FAILED' && (
                    <div className="flex items-start gap-3 text-red-800">
                      <span className="material-symbols-outlined text-[20px] mt-0.5">error</span>
                      <div>
                        <p className="font-medium">Refund Failed</p>
                        <p className="text-sm opacity-90 mt-1">There was an issue processing your refund. Please contact support.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              
              {(order.courierName || order.trackingNumber || order.expectedDeliveryDate) && (
                <div className="border-t border-outline-variant/30 pt-6">
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Shipping Details</p>
                  <div className="text-on-surface font-body-md space-y-2 bg-primary-container/10 p-4 rounded border border-primary/20">
                    {order.courierName && <p><strong>Courier:</strong> {order.courierName}</p>}
                    {order.trackingNumber && <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>}
                    {order.expectedDeliveryDate && <p><strong>Expected Delivery:</strong> {order.expectedDeliveryDate}</p>}
                    {order.shipmentNotes && <p><strong>Notes:</strong> {order.shipmentNotes}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
