import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import type { Order } from '../../types';
import { getImageUrl } from '../../utils/getImageUrl';
import { Loader } from '../../components/ui/Loader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

const getStatusBadgeClass = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'CONFIRMED': return 'badge-warning';
    case 'PACKED': return 'badge-neutral';
    case 'SHIPPED': return 'badge-gold';
    case 'DELIVERED': return 'badge-success';
    case 'CANCELLED': return 'badge-error';
    default: return 'badge-neutral';
  }
};

const getPaymentBadgeClass = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'PAID': return 'badge-success';
    case 'PENDING': return 'badge-warning';
    case 'FAILED': return 'badge-error';
    case 'REFUNDED': return 'badge-neutral';
    default: return 'badge-neutral';
  }
};

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
                <p className="text-sm text-error leading-relaxed">{cancelError}</p>
              </div>
            )}
            {!showConfirm ? (
              <button
                id="cancel-order-btn"
                onClick={() => setShowConfirm(true)}
                className="btn flex items-center gap-2 rounded-DEFAULT border border-error !bg-transparent text-error hover:bg-error hover:text-white focus-visible:outline-error transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                Cancel Order
              </button>
            ) : (
              <div className="bg-error-container/10 border border-error/20 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-5">
                  <span className="material-symbols-outlined text-error text-[24px] flex-shrink-0">warning</span>
                  <div>
                    <p className="font-label-lg text-on-surface mb-1">Are you sure you want to cancel this order?</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Since the order has not yet been packed, it can still be cancelled. Your full payment will be
                      refunded to the original payment method after our team processes the refund.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    id="confirm-cancel-btn"
                    onClick={onCancel}
                    disabled={isCancelling}
                    className="btn flex items-center gap-2 rounded-DEFAULT bg-error text-white hover:bg-error/90 focus-visible:outline-error disabled:opacity-60 transition-all duration-200"
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
                    className="btn btn-outline"
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
        <div className="card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">inventory_2</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <p className="font-label-lg text-on-surface">Order Being Prepared</p>
              <span className="badge badge-neutral">Packed</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Your order has been packed and is being prepared for shipment. Order cancellation is no longer available.
            </p>
          </div>
        </div>
      );

    case 'SHIPPED':
      return (
        <div className="card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-accent text-[22px]">local_shipping</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <p className="font-label-lg text-on-surface">Order Shipped</p>
              <span className="badge badge-gold">Shipped</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              This order has already been shipped and is on its way to you. Cancellation is no longer available.
            </p>
            {(order.courierName || order.trackingNumber) && (
              <div className="mt-3 bg-surface-container p-3 rounded text-sm text-on-surface space-y-1">
                {order.courierName && <p><strong>Courier:</strong> {order.courierName}</p>}
                {order.trackingNumber && <p><strong>Tracking:</strong> <span className="font-mono">{order.trackingNumber}</span></p>}
              </div>
            )}
          </div>
        </div>
      );

    case 'DELIVERED':
      return (
        <div className="card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">check_circle</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <p className="font-label-lg text-on-surface">Order Delivered</p>
              <span className="badge badge-success">Delivered</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Your order has been successfully delivered. Thank you for shopping with us!
            </p>
          </div>
        </div>
      );

    case 'CANCELLED':
      return (
        <div className="card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-error-container/40 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-error text-[22px]">cancel</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <p className="font-label-lg text-on-surface">Order Cancelled</p>
              <span className="badge badge-error">Cancelled</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              This order has been cancelled.
            </p>
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

  if (isLoading) return <Loader />;

  if (error || !order) {
    return (
      <div className="flex flex-col items-center text-center py-20 px-6">
        <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-accent text-2xl">error_outline</span>
        </div>
        <h2 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase">Order Not Found</h2>
        <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed max-w-md">
          {error || "We couldn't find that order. It may have been removed or the link is incorrect."}
        </p>
        <Link to="/account/orders" className="btn btn-primary inline-flex items-center">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: 'My Account', href: '/account/dashboard' },
        { label: 'Orders', href: '/account/orders' },
        { label: order.orderNumber },
      ]} />

      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/account/orders"
          className="w-10 h-10 bg-surface-container-low rounded-full flex items-center justify-center hover:bg-surface-container transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Back to orders"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="font-display-sm text-display-sm text-on-surface">Order Details</h1>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-6 mb-8 flex flex-wrap gap-x-12 gap-y-4">
        <div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Order Number</p>
          <p className="font-mono text-sm text-on-surface">{order.orderNumber}</p>
        </div>
        <div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Date Placed</p>
          <p className="font-body-lg text-on-surface">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Status</p>
          <span className={`badge ${getStatusBadgeClass(order.status)} mt-1`}>
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
                        <p className="font-body-md text-on-surface italic leading-relaxed">"{order.giftMessage}"</p>
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
                  <div className="product-media w-24 h-24 bg-surface-container-low rounded flex items-center justify-center flex-shrink-0">
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
                  <span className="absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest bg-primary"></span>
                  <div className="ml-6">
                    <p className="font-label-lg">Order Confirmed</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">Your order has been verified and confirmed.</p>
                  </div>
                </div>

                {order.status === 'CANCELLED' ? (
                  // Packed/Shipped/Delivered never happened for a cancelled order — showing them
                  // as upcoming steps would be misleading, so the timeline stops at Cancelled.
                  <div className="relative">
                    <span className="absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest bg-error"></span>
                    <div className="ml-6">
                      <p className="font-label-lg text-error">Cancelled</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <span className={`absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest ${['PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                      <div className="ml-6">
                        <p className="font-label-lg">Packed</p>
                        <p className="text-sm text-on-surface-variant leading-relaxed">Items are packed and ready for shipping.</p>
                      </div>
                    </div>

                    <div className="relative">
                      <span className={`absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest ${['SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                      <div className="ml-6">
                        <p className="font-label-lg">Shipped</p>
                        <p className="text-sm text-on-surface-variant leading-relaxed">Order has been handed over to the courier.</p>
                      </div>
                    </div>

                    <div className="relative">
                      <span className={`absolute -left-2 top-1 w-4 h-4 rounded-full ring-4 ring-surface-container-lowest ${order.status === 'DELIVERED' ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                      <div className="ml-6">
                        <p className="font-label-lg">Delivered</p>
                      </div>
                    </div>
                  </>
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
            <div className="table-shell !border-0 !rounded-none">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="text-on-surface-variant">Subtotal</td>
                    <td className="text-right text-on-surface-variant">{formatPrice(order.items.reduce((acc, item) => acc + ((item.originalPrice || 0) * item.quantity), 0))}</td>
                  </tr>
                  {order.offerDiscountAmount > 0 && (
                    <tr>
                      <td className="text-on-surface-variant">Item Discounts</td>
                      <td className="text-right" style={{ color: 'var(--success)' }}>-{formatPrice(order.offerDiscountAmount)}</td>
                    </tr>
                  )}
                  {order.couponDiscountAmount > 0 && (
                    <tr>
                      <td className="text-on-surface-variant">Cart Discount</td>
                      <td className="text-right text-primary">-{formatPrice(order.couponDiscountAmount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-on-surface-variant">Shipping</td>
                    <td className="text-right text-on-surface-variant">
                      {order.shippingCost === 0 ? <span style={{ color: 'var(--success)' }}>Free</span> : formatPrice(order.shippingCost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-headline-sm text-on-surface">Total</td>
                    <td className="text-right font-headline-sm text-on-surface">{formatPrice(order.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
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
                <div className="text-on-surface font-body-md leading-relaxed space-y-1">
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
                  <span>Status:</span>
                  <span className={`badge ${getPaymentBadgeClass(order.paymentStatus)}`}>{order.paymentStatus}</span>
                </div>
              </div>

              {/* Refund Tracking */}
              {order.refundStatus && order.refundStatus !== 'NOT_REQUIRED' && (
                <div className="bg-surface-container/30 p-4 rounded-lg border border-outline-variant/50">
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-3">Refund Status</p>

                  {order.refundStatus === 'REFUND_REQUIRED' && (
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] mt-0.5" style={{ color: 'var(--warning)' }}>hourglass_empty</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-on-surface">Refund Required</p>
                          <span className="badge badge-warning">Pending</span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">Your full refund of {formatPrice(order.refundAmount || order.totalAmount)} is awaiting processing by our team.</p>
                      </div>
                    </div>
                  )}

                  {order.refundStatus === 'PROCESSING' && (
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] animate-spin text-accent mt-0.5">sync</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-on-surface">Processing</p>
                          <span className="badge badge-gold">Processing</span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">Your refund has been initiated. Please allow 5–7 business days to reflect in your account.</p>
                      </div>
                    </div>
                  )}

                  {order.refundStatus === 'REFUNDED' && (
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] mt-0.5" style={{ color: 'var(--success)' }}>check_circle</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-on-surface">Refund Processed</p>
                          <span className="badge badge-success">Refunded</span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{formatPrice(order.refundAmount || 0)} has been refunded successfully.</p>
                        {order.refundId && <p className="text-xs text-on-surface-variant mt-1 font-mono">ID: {order.refundId}</p>}
                        {order.refundCompletedAt && <p className="text-xs text-on-surface-variant">Date: {new Date(order.refundCompletedAt).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  )}

                  {order.refundStatus === 'FAILED' && (
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-on-surface">Refund Failed</p>
                          <span className="badge badge-error">Failed</span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">There was an issue processing your refund. Please contact support.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {(order.courierName || order.trackingNumber || order.expectedDeliveryDate) && (
                <div className="border-t border-outline-variant/30 pt-6">
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Shipping Details</p>
                  <div className="text-on-surface font-body-md leading-relaxed space-y-2 bg-primary-container/10 p-4 rounded border border-primary/20">
                    {order.courierName && <p><strong>Courier:</strong> {order.courierName}</p>}
                    {order.trackingNumber && <p><strong>Tracking Number:</strong> <span className="font-mono">{order.trackingNumber}</span></p>}
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
