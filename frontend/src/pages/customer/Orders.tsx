import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import type { Order } from '../../types';
import { getImageUrl } from '../../utils/getImageUrl';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';


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

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<{ id: number; msg: string } | null>(null);
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState<Order | null>(null);

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  useEffect(() => {
    fetchOrders();
  }, [currentPage]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await orderService.getOrders({ page: currentPage, size: 10 });
      setOrders(res.content || (res as any).data?.content || []);
      setTotalPages(res.totalPages || (res as any).data?.totalPages || 0);
      setTotalElements(res.totalElements || (res as any).data?.totalElements || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmCancelOrder = async () => {
    if (!cancelConfirmOrder) return;
    const orderId = cancelConfirmOrder.id;
    try {
      setCancellingId(orderId);
      setCancelError(null);
      await orderService.cancelOrder(orderId);
      setCancelConfirmOrder(null);
      await fetchOrders();
    } catch (err: any) {
      setCancelConfirmOrder(null);
      setCancelError({
        id: orderId,
        msg: err.response?.data?.message || 'Failed to cancel order.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams({ page: page.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="flex flex-col items-center text-center py-20 px-6">
        <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-accent text-2xl">error_outline</span>
        </div>
        <h2 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase">Connection Error</h2>
        <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed max-w-md">{error}</p>
        <button onClick={fetchOrders} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-2 block">My Account</span>
      <h1 className="font-display-sm text-display-sm text-on-surface mb-8">My Orders</h1>

      {orders.length > 0 ? (
        <>
          <div className="mb-4 text-on-surface-variant font-body-md leading-relaxed">
            Showing {orders.length} of {totalElements} orders
          </div>
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="card overflow-hidden">
                <div className="bg-surface-container-low px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant">
                  <div className="flex flex-wrap gap-x-8 gap-y-4">
                    <div>
                      <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Order Placed</p>
                      <p className="font-body-md text-on-surface">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Total</p>
                      <p className="font-body-md text-on-surface">{formatPrice(order.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Order #</p>
                      <p className="font-mono text-sm text-on-surface">{order.orderNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                    {/* Cancel button — only visible for CONFIRMED orders */}
                    {order.status === 'CONFIRMED' && (
                      <button
                        id={`cancel-order-${order.id}`}
                        onClick={() => setCancelConfirmOrder(order)}
                        disabled={cancellingId === order.id}
                        className="btn text-xs !px-4 !py-2 gap-1.5 border border-error !bg-transparent text-error hover:bg-error hover:text-white focus-visible:outline-error disabled:opacity-50 transition-all duration-200 whitespace-nowrap"
                      >
                        {cancellingId === order.id ? (
                          <>
                            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            Cancel Order
                          </>
                        )}
                      </button>
                    )}
                    <Link to={`/account/orders/${order.id}`} className="btn btn-outline text-xs !px-4 !py-2 whitespace-nowrap">
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Inline cancel error */}
                {cancelError?.id === order.id && (
                  <div className="px-6 py-3 bg-error-container/10 border-b border-error/20 flex items-center gap-2 text-sm text-error leading-relaxed">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {cancelError.msg}
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="font-headline-sm">Status:</h3>
                    <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>

                  <div className="flex overflow-x-auto gap-4 pb-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex-shrink-0 flex items-center gap-4 min-w-[250px]">
                        <div className="product-media w-20 h-20 bg-surface-container-low rounded flex items-center justify-center">
                          {item.productImage ? (
                            <img src={getImageUrl(item.productImage)} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-outline">image</span>
                          )}
                        </div>
                        <div>
                          <p className="font-label-lg">{item.productName}</p>
                          <p className="text-sm text-on-surface-variant">{item.variantSize}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center text-center py-20 px-6 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest">
          <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-accent text-2xl">inventory_2</span>
          </div>
          <h2 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase">No Orders Yet</h2>
          <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed max-w-md">
            Looks like you haven't placed any orders yet. Discover our premium collection and treat yourself.
          </p>
          <Link to="/collection" className="btn btn-primary inline-flex items-center">
            Start Shopping
          </Link>
        </div>
      )}

      <ConfirmationDialog
        isOpen={cancelConfirmOrder !== null}
        onClose={() => !cancellingId && setCancelConfirmOrder(null)}
        onConfirm={confirmCancelOrder}
        title="Cancel Order"
        description="Are you sure you want to cancel this order? If it was already paid for, a full refund will be initiated automatically."
        entityName={cancelConfirmOrder ? `Order #${cancelConfirmOrder.orderNumber}` : undefined}
        confirmText="Yes, Cancel Order"
        cancelText="Keep Order"
        isLoading={cancellingId !== null}
        actionType="CANCEL"
      />
    </div>
  );
};
