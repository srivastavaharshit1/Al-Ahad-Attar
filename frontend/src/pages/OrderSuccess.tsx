import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { formatOrderStatus } from '../utils/formatOrderStatus';
import type { Order } from '../types';

export const OrderSuccess: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      orderService.getOrder(id)
        .then(res => {
          setOrder(res.data);
        })
        .catch(err => {
          console.error("Failed to load order", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-4">Order Not Found</h1>
        <p className="font-body-md text-on-surface-variant mb-6 max-w-sm leading-relaxed">
          We couldn't locate this order. It may have been removed, or the link you followed is incorrect.
        </p>
        <Link
          to="/"
          className="link-underline font-label-md text-[11px] uppercase tracking-[0.2em] text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const statusBadgeClass = order.status === 'CONFIRMED' ? 'badge-success' : 'badge-warning';

  return (
    <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-24 text-center bg-background">
      <div className="w-20 h-20 rounded-full border border-accent flex items-center justify-center mx-auto mb-8">
        <span className="material-symbols-outlined text-4xl text-accent">check_circle</span>
      </div>

      <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.4em] mb-4 block">Order Confirmed</span>
      <h1 className="font-headline-lg text-headline-lg md:text-5xl text-on-surface mb-4">Thank You for Your Order</h1>
      <p className="font-body-md text-body-md text-on-surface-variant mb-10 max-w-xl mx-auto leading-relaxed">
        Your payment has been received successfully. Your order is awaiting confirmation.
      </p>

      <div className="card p-8 md:p-10 mb-10 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="field-label">Order Number</h3>
            <p className="font-mono text-[0.8125rem] tracking-[0.02em] text-on-surface">{order.orderNumber}</p>
          </div>
          <div>
            <h3 className="field-label">Payment Status</h3>
            <span className="badge badge-success">Paid</span>
          </div>
          <div>
            <h3 className="field-label">Order Status</h3>
            <span className={`badge ${statusBadgeClass}`}>{formatOrderStatus(order.status)}</span>
          </div>
          <div>
            <h3 className="field-label">Next Steps</h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              {order.status === 'CONFIRMED'
                ? 'Your order is confirmed and is being processed.'
                : 'Our team is verifying your order. You will receive further updates shortly.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to={`/account/orders/${order.id}`} className="btn btn-primary">
          View Order Status
        </Link>
        <Link to="/" className="btn btn-outline">
          Continue Shopping
        </Link>
      </div>
    </main>
  );
};
