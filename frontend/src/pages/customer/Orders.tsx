import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import type { Order } from '../../types';
import { getImageUrl } from '../../utils/getImageUrl';
import { Pagination } from '../../components/ui/Pagination';


export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<{ id: number; msg: string } | null>(null);

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

  const handleCancelOrder = async (orderId: number) => {
    try {
      setCancellingId(orderId);
      setCancelError(null);
      await orderService.cancelOrder(orderId);
      await fetchOrders();
    } catch (err: any) {
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

  const getStatusColor = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'CONFIRMED': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'PACKED': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'SHIPPED': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'DELIVERED': return 'text-green-600 bg-green-50 border-green-200';
      case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading orders...</div>;
  if (error) return <div className="text-center p-8 text-error">{error}</div>;

  return (
    <div>
      <h1 className="font-display-sm text-display-sm text-on-surface mb-8">My Orders</h1>

      {orders.length > 0 ? (
        <>
          <div className="mb-4 text-on-surface-variant font-body-md">
            Showing {orders.length} of {totalElements} orders
          </div>
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden">
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
                      <p className="font-body-md text-on-surface">{order.orderNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                    {/* Cancel button — only visible for CONFIRMED orders */}
                    {order.status === 'CONFIRMED' && (
                      <button
                        id={`cancel-order-${order.id}`}
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm border border-error text-error rounded-DEFAULT hover:bg-error hover:text-white disabled:opacity-50 transition-all duration-200 whitespace-nowrap"
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
                    <Link to={`/account/orders/${order.id}`} className="btn-outline px-4 py-2 text-sm whitespace-nowrap">
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Inline cancel error */}
                {cancelError?.id === order.id && (
                  <div className="px-6 py-3 bg-error-container/10 border-b border-error/20 flex items-center gap-2 text-sm text-error">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {cancelError.msg}
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="font-headline-sm">Status:</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-label-md uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>

                  <div className="flex overflow-x-auto gap-4 pb-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex-shrink-0 flex items-center gap-4 min-w-[250px]">
                        <div className="w-20 h-20 bg-surface-container-low rounded flex items-center justify-center overflow-hidden">
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
        <div className="bg-surface-container-lowest border border-outline-variant p-12 rounded-DEFAULT text-center">
          <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4 text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">inventory_2</span>
          </div>
          <h2 className="font-headline-md mb-2">No Orders Yet</h2>
          <p className="text-on-surface-variant font-body-md max-w-md mx-auto mb-6">
            Looks like you haven't placed any orders yet. Discover our premium collection and treat yourself.
          </p>
          <Link to="/collection" className="btn-primary px-8 py-3 inline-block">
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
};
