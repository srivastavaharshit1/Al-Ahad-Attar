import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import type { Order } from '../../types';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/getImageUrl';


export const AdminOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Shipping form state
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [shipmentNotes, setShipmentNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);

  const fetchOrder = async (orderId: string) => {
    try {
      setIsLoading(true);
      // There is no admin "get single order by ID" endpoint — GET /api/orders/{id} looks up
      // by (id, requesting user's email), so it only ever resolves the admin's own orders, never
      // an arbitrary customer's. Work around it via the admin list endpoint, but request a large
      // page size so an order isn't missed just because it's outside the default 10-item page
      // (matches the same size:10000 "fetch everything" pattern already used for CSV export).
      const res = await orderService.getAllOrders({ size: 10000 });
      const foundOrder = res.content?.find((o: Order) => o.id.toString() === orderId) || (res as any).data?.content?.find((o: Order) => o.id.toString() === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
        setCourierName(foundOrder.courierName || '');
        setTrackingNumber(foundOrder.trackingNumber || '');
        setExpectedDeliveryDate(foundOrder.expectedDeliveryDate || '');
        setShipmentNotes(foundOrder.shipmentNotes || '');
      } else {
        toast.error('Order not found');
      }
    } catch (err: any) {
      toast.error('Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (action: string) => {
    if (!order) return;
    try {
      setIsUpdating(true);
      const res = await orderService.updateOrderStatus(order.id.toString(), action);
      setOrder(res.data);
      toast.success(`Order marked as ${formatOrderStatus(action)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIssueRefund = async () => {
    if (!order) return;
    try {
      setIsUpdating(true);
      const res = await orderService.initiateRefund(order.id.toString());
      setOrder(res.data);
      if (res.data.refundStatus === 'REFUNDED') {
        toast.success(`Refund processed successfully. Refund ID: ${res.data.refundId}`);
      } else if (res.data.refundStatus === 'FAILED') {
        toast.error(`Refund failed: ${res.data.refundFailureReason}`);
      } else {
        toast.success('Refund request processed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to issue refund');
    } finally {
      setIsUpdating(false);
    }
  };


  const handleUpdateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      setIsUpdating(true);
      const payload = {
        courierName,
        trackingNumber,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        shipmentNotes
      };
      const res = await orderService.updateShippingDetails(order.id.toString(), payload);
      setOrder(res.data);
      toast.success('Shipping details updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update shipping details');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading order...</div>;
  if (!order) return <div className="p-8 text-center text-error">Order not found.</div>;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'CONFIRMED': return 'badge-gold';
      case 'PACKED': return 'badge-neutral';
      case 'SHIPPED': return 'badge-neutral';
      case 'DELIVERED': return 'badge-success';
      case 'CANCELLED': return 'badge-error';
      default: return 'badge-neutral';
    }
  };

  return (
    <>
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/orders" className="text-on-surface-variant hover:text-primary rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Order #{order.orderNumber}
          </h2>
          <span className={`badge ${getStatusBadge(order.status)}`}>
            {formatOrderStatus(order.status)}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Action Buttons */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h3 className="font-headline-sm mb-4">Order Actions</h3>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => handleStatusUpdate('PACKED')} disabled={isUpdating || order.status !== 'CONFIRMED'} className="btn-primary px-4 py-2 rounded text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Mark Packed</button>
              <button onClick={() => handleStatusUpdate('SHIPPED')} disabled={isUpdating || order.status !== 'PACKED'} className="btn-primary px-4 py-2 rounded text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Mark Shipped</button>
              <button onClick={() => handleStatusUpdate('DELIVERED')} disabled={isUpdating || order.status !== 'SHIPPED'} className="btn-gold px-4 py-2 rounded text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Mark Delivered</button>
              <button onClick={() => handleStatusUpdate('CANCELLED')} disabled={isUpdating || order.status !== 'CONFIRMED'} title={order.status !== 'CONFIRMED' ? 'Only orders that are still CONFIRMED (not yet packed) can be cancelled' : undefined} className="btn-outline text-error border-error hover:bg-error hover:text-on-error px-4 py-2 rounded text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Cancel Order</button>
            </div>
          </div>

          {/* Gift Service - Packing Team Info */}
          {order.isGiftWrapped && (
            <div className="bg-accent-soft border border-accent/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-accent-hover text-[20px]">redeem</span>
                <h3 className="font-headline-sm text-on-secondary-container">Gift Service — Packing Note</h3>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-lg text-on-secondary-container">Gift Wrapped</p>
                  {order.giftMessage && (
                    <div className="mt-2">
                      <p className="text-xs text-on-secondary-container/80 uppercase tracking-wider mb-1">Gift Message</p>
                      <p className="font-body-md text-on-secondary-container italic bg-surface-container-lowest/60 p-3 rounded border border-accent/20">"{order.giftMessage}"</p>
                    </div>
                  )}
                </div>
                <span className="font-headline-sm text-on-secondary-container">{formatPrice(order.giftServicePrice || 0)}</span>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h3 className="font-headline-sm mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-surface-container rounded overflow-hidden">
                      {item.productImage && <img src={getImageUrl(item.productImage)} alt={item.productName} className="w-full h-full object-cover" />}
                    </div>
                      <div>
                        <p className="font-label-lg">{item.productName}</p>
                        <p className="text-sm text-on-surface-variant mb-1">{item.variantSize}</p>
                        {item.bottleName && (
                          <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">liquor</span>
                            {item.bottleName}
                          </p>
                        )}
                      </div>
                  </div>
                  <div className="text-right">
                    <p className="font-body-md">{formatPrice(item.unitPrice || 0)} x {item.quantity}</p>
                    {item.discountAmount && item.discountAmount > 0 ? (
                      <p className="text-xs text-on-surface-variant line-through">{formatPrice(item.originalPrice)}</p>
                    ) : null}
                    <p className="font-headline-sm">{formatPrice((item.unitPrice || 0) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right space-y-2">
              <p className="text-on-surface-variant">Subtotal: {formatPrice(order.items.reduce((acc, item) => acc + ((item.originalPrice || 0) * item.quantity), 0))}</p>
              {order.offerDiscountAmount > 0 && (
                <p className="text-tertiary">Offer Discount: -{formatPrice(order.offerDiscountAmount)}</p>
              )}
              {order.couponDiscountAmount > 0 && (
                <p className="text-primary">Coupon Discount: -{formatPrice(order.couponDiscountAmount)}</p>
              )}
              <p className="text-on-surface-variant">Shipping: {order.shippingCost === 0 ? <span className="text-tertiary">Free</span> : formatPrice(order.shippingCost)}</p>
              {order.isGiftWrapped && order.giftServicePrice != null && order.giftServicePrice > 0 && (
                <p className="text-on-secondary-container">Gift Wrapping: {formatPrice(order.giftServicePrice)}</p>
              )}
              <p className="font-headline-md mt-2 pt-2 border-t border-outline-variant/50">Total: {formatPrice(order.totalAmount)}</p>
            </div>
          </div>

          {/* Shipping Form */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h3 className="font-headline-sm mb-4">Shipping Details</h3>
            <form onSubmit={handleUpdateShipping} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-label-md text-on-surface-variant mb-1">Courier Name</label>
                <input type="text" value={courierName} onChange={e => setCourierName(e.target.value)} className="w-full bg-transparent border border-outline-variant rounded p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface" />
              </div>
              <div>
                <label className="block text-sm font-label-md text-on-surface-variant mb-1">Tracking Number</label>
                <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="w-full bg-transparent border border-outline-variant rounded p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface" />
              </div>
              <div>
                <label className="block text-sm font-label-md text-on-surface-variant mb-1">Expected Delivery Date</label>
                <input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} className="w-full bg-transparent border border-outline-variant rounded p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-label-md text-on-surface-variant mb-1">Shipment Notes</label>
                <textarea value={shipmentNotes} onChange={e => setShipmentNotes(e.target.value)} className="w-full bg-transparent border border-outline-variant rounded p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface" rows={2}></textarea>
              </div>
              <div className="md:col-span-2 text-right mt-2">
                <button type="submit" disabled={isUpdating} className="btn-primary px-6 py-2 rounded disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Save Shipping Details</button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-8">
          {/* Customer Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h3 className="font-headline-sm mb-4">Customer Details</h3>
            <div className="space-y-4">
              <div>
                <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-1">Shipping Address</p>
                <div className="text-on-surface font-body-md space-y-1">
                  <p className="font-medium">{order.shippingAddress?.fullName}</p>
                  <p>{order.shippingAddress?.addressLine1}</p>
                  <p>{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                  <p>{order.shippingAddress?.country} - {order.shippingAddress?.postalCode}</p>
                  <p>Phone: {order.shippingAddress?.phone}</p>
                </div>
              </div>
              
              {order.shippingAddress?.phone && (
                <a 
                  href={`https://wa.me/${order.shippingAddress.phone.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 px-4 rounded font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448-.002 9.884-4.436 9.886-9.884.002-5.449-4.434-9.885-9.883-9.886-5.45.002-9.884 4.436-9.886 9.885-.001 2.203.58 4.092 1.684 5.861l-1.144 4.182 4.269-1.15zm8.815-6.852c-.482-.241-2.85-1.407-3.292-1.569-.44-.162-.76-.242-1.083.241-.321.482-1.242 1.569-1.522 1.891-.281.32-.562.361-1.042.12-.482-.241-2.037-.751-3.88-2.399-1.433-1.285-2.399-2.87-2.68-3.352-.28-.482-.03-.742.21-.983.218-.218.482-.562.723-.842.241-.281.322-.482.482-.803.161-.321.082-.602-.04-.842-.121-.242-1.083-2.61-1.483-3.573-.388-.934-.783-.807-1.083-.822-.28-.014-.6-.014-.922-.014-.321 0-.842.121-1.283.602-.44.482-1.684 1.646-1.684 4.014s1.724 4.656 1.964 4.977c.241.322 3.393 5.178 8.219 7.259 4.826 2.08 4.826 1.385 5.669 1.265.842-.121 2.85-1.164 3.251-2.288.401-1.124.401-2.088.28-2.289-.121-.201-.441-.321-.922-.562z"/></svg>
                  Contact Customer on WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h3 className="font-headline-sm mb-4">Payment Information</h3>
            <div className="space-y-4">
              <div>
                <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-1">Payment Method</p>
                <p className="font-body-md text-on-surface">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-1">Payment Status</p>
                <span className={`badge ${
                  order.paymentStatus === 'PAID' ? 'badge-success' :
                  order.paymentStatus === 'FAILED' ? 'badge-error' :
                  'badge-warning'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.transactionId && (
                <div>
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-1">Transaction ID</p>
                  <p className="font-body-md text-on-surface text-sm break-all">{order.transactionId}</p>
                </div>
              )}
            </div>
            
            {/* Refund Section */}
            {order.paymentStatus === 'PAID' && order.status === 'CANCELLED' && order.refundStatus && order.refundStatus !== 'NOT_REQUIRED' && (
              <div className="mt-6 pt-6 border-t border-outline-variant/50">
                <h4 className="font-label-lg text-on-surface mb-4">Refund Management</h4>
                
                {order.refundStatus === 'REFUND_REQUIRED' && (
                  <div className="bg-[var(--warning-bg)] rounded p-4 border border-[var(--warning)]/30">
                    <p className="text-[var(--warning)] text-sm mb-3">Customer has cancelled this order. A full refund of {formatPrice(order.refundAmount || order.totalAmount)} is required and awaiting your approval.</p>
                    <button onClick={handleIssueRefund} disabled={isUpdating} className="w-full btn-gold py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      {isUpdating ? 'Processing Refund...' : 'Process Refund'}
                    </button>
                  </div>
                )}

                {order.refundStatus === 'PROCESSING' && (
                  <div className="bg-surface-container rounded p-4 border border-outline-variant text-center">
                    <p className="text-on-surface-variant font-medium flex items-center justify-center gap-2 mb-3">
                      <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                      Refund is being processed...
                    </p>
                    <button onClick={handleIssueRefund} disabled={isUpdating} className="w-full btn-outline py-2 rounded text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                      {isUpdating ? 'Checking...' : 'Check Status / Reconcile'}
                    </button>
                  </div>
                )}

                {order.refundStatus === 'REFUNDED' && (
                  <div className="bg-tertiary-container rounded p-4 border border-tertiary/30">
                    <p className="text-on-tertiary-container font-medium flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Refund Processed
                    </p>
                    <div className="text-sm text-on-tertiary-container space-y-1">
                      <p><span className="font-medium">Amount:</span> {formatPrice(order.refundAmount || 0)}</p>
                      {order.refundId && <p><span className="font-medium">Refund ID:</span> {order.refundId}</p>}
                      {order.refundCompletedAt && <p><span className="font-medium">Date:</span> {new Date(order.refundCompletedAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                )}

                {order.refundStatus === 'FAILED' && (
                  <div className="bg-error-container rounded p-4 border border-error/30">
                    <p className="text-on-error-container font-medium flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[18px]">error</span>
                      Refund Failed
                    </p>
                    {order.refundFailureReason && (
                      <p className="text-sm text-on-error-container mb-3 bg-surface-container-lowest/50 p-2 rounded">{order.refundFailureReason}</p>
                    )}
                    <button onClick={handleIssueRefund} disabled={isUpdating} className="w-full btn-outline text-error border-error hover:bg-error hover:text-on-error py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                      Retry Refund
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
