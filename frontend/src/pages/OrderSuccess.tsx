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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="font-display-md text-on-surface mb-4">Order Not Found</h1>
        <Link to="/" className="text-primary hover:underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
        <span className="material-symbols-outlined text-4xl text-primary">check_circle</span>
      </div>
      
      <h1 className="font-display-lg text-on-surface mb-4">Thank you for your order!</h1>
      <p className="font-body-lg text-on-surface-variant mb-8">
        Your payment has been received successfully. Your order is awaiting confirmation.
      </p>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 mb-8 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Order Number</h3>
            <p className="font-headline-sm text-on-surface">{order.orderNumber}</p>
          </div>
          <div>
            <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Payment Status</h3>
            <p className="font-headline-sm text-primary">Paid</p>
          </div>
          <div>
            <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Order Status</h3>
            <p className="font-headline-sm text-on-surface inline-block px-3 py-1 bg-surface-variant rounded">
              {formatOrderStatus(order.status)}
            </p>
          </div>
          <div>
            <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Next Steps</h3>
            <p className="font-body-md text-on-surface-variant">
              {order.status === 'CONFIRMED' 
                ? 'Your order is confirmed and is being processed.' 
                : 'Our team is verifying your order. You will receive further updates shortly.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Link to={`/account/orders/${order.id}`} className="btn-primary px-8 py-3 rounded-DEFAULT transition-colors">
          View Order Status
        </Link>
        <Link to="/" className="btn-outline px-8 py-3 rounded-DEFAULT transition-colors">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};
