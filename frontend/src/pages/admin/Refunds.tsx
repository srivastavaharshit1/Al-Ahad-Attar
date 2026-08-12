import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { dashboardService, type DashboardStats } from '../../services/dashboardService';
import { formatPrice } from '../../utils/formatPrice';
import type { Order, RefundStatus } from '../../types';
import toast from 'react-hot-toast';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';

const STATUS_FILTERS: { value: RefundStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'REFUND_REQUIRED', label: 'Refund Required' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'FAILED', label: 'Failed' },
];

const getRefundBadgeClass = (status?: string | null) => {
  switch (status) {
    case 'REFUND_REQUIRED': return 'badge-warning';
    case 'PROCESSING': return 'badge-gold';
    case 'REFUNDED': return 'badge-success';
    case 'FAILED': return 'badge-error';
    default: return 'badge-neutral';
  }
};

const refundLabel = (status?: string | null) => {
  switch (status) {
    case 'REFUND_REQUIRED': return 'Refund Required';
    case 'PROCESSING': return 'Processing';
    case 'REFUNDED': return 'Refunded';
    case 'FAILED': return 'Failed';
    default: return status || '—';
  }
};

export const Refunds: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [refunds, setRefunds] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '0', 10);
  const statusFilter = (searchParams.get('status') || '') as RefundStatus | '';

  useEffect(() => {
    fetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  useEffect(() => {
    dashboardService.getStats().then(res => setStats(res.data)).catch(() => { /* summary cards are a nice-to-have; the table itself doesn't depend on this */ });
  }, []);

  const fetchRefunds = async () => {
    try {
      setIsLoading(true);
      const params: any = { page: currentPage, size: 10, sort: 'updatedAt,desc' };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const response = await orderService.getRefunds(params);
      setRefunds(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error('Failed to fetch refunds', error);
      setRefunds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    searchParams.set('page', page.toString());
    setSearchParams(searchParams);
  };

  const handleStatusFilter = (status: RefundStatus | '') => {
    if (status) {
      searchParams.set('status', status);
    } else {
      searchParams.delete('status');
    }
    searchParams.set('page', '0');
    setSearchParams(searchParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchParams.set('page', '0');
    setSearchParams(searchParams);
    fetchRefunds();
  };

  const handleProcessRefund = async () => {
    if (!confirmOrder) return;
    const orderId = confirmOrder.id;
    try {
      setProcessingId(orderId);
      const res = await orderService.initiateRefund(orderId);
      setRefunds(refunds.map(o => (o.id === orderId ? res.data : o)));
      if (res.data.refundStatus === 'REFUNDED') {
        toast.success(`Refund processed. Refund ID: ${res.data.refundId}`);
      } else if (res.data.refundStatus === 'FAILED') {
        toast.error(`Refund failed: ${res.data.refundFailureReason || 'Unknown error'}`);
      } else {
        toast.success('Refund request processed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setProcessingId(null);
      setConfirmOrder(null);
    }
  };

  return (
    <>
      <header className="mb-12">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Refund Management</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Every order that has required a refund. Cancelling never triggers Razorpay automatically —
          process each refund here once you've reviewed it.
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button type="button" onClick={() => handleStatusFilter('REFUND_REQUIRED')} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center transition-colors hover:border-accent-hover/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
          <span className="badge badge-warning mb-2">Refund Required</span>
          <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.pendingRefunds ?? '—'}</p>
        </button>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
          <span className="badge badge-gold mb-2">Processing</span>
          <p className="font-headline-sm text-headline-sm text-ink mt-1">
            {refunds.filter(o => o.refundStatus === 'PROCESSING').length}
          </p>
        </div>
        <button type="button" onClick={() => handleStatusFilter('REFUNDED')} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
          <span className="badge badge-success mb-2">Refunded</span>
          <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.completedRefunds ?? '—'}</p>
        </button>
        <button type="button" onClick={() => handleStatusFilter('FAILED')} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center transition-colors hover:border-error/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
          <span className="badge badge-error mb-2">Failed — needs attention</span>
          <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.failedRefunds ?? '—'}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value || 'ALL'}
                type="button"
                onClick={() => handleStatusFilter(f.value)}
                className={`px-4 py-2 rounded-full border font-label-md text-label-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  statusFilter === f.value
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline text-on-surface hover:border-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex items-center border-b border-outline focus-within:border-primary transition-colors min-w-[240px]">
            <button type="submit" className="material-symbols-outlined text-outline text-sm mr-2 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded">search</button>
            <input
              className="w-full bg-transparent border-none focus:ring-0 p-0 pb-1 text-body-md font-body-md text-on-surface"
              placeholder="Search by order number, customer name or email..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="table-shell">
        <div className="overflow-x-auto">
          {isLoading ? (
            <Loader />
          ) : refunds.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">No refunds found for this filter.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Cancelled</th>
                  <th>Amount</th>
                  <th>Payment ID</th>
                  <th>Refund Status</th>
                  <th><span className="flex justify-end">Actions</span></th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface">
                {refunds.map(order => (
                  <tr key={order.id}>
                    <td className="font-medium" data-label="Order">#{order.orderNumber}</td>
                    <td data-label="Customer">{order.shippingAddress?.fullName || 'N/A'}</td>
                    <td data-label="Cancelled">
                      <span className="text-on-surface-variant">
                        {order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="font-medium" data-label="Amount">{formatPrice(order.refundAmount || order.totalAmount)}</td>
                    <td data-label="Payment ID">
                      <span className="text-xs text-on-surface-variant font-mono break-all">{order.transactionId || '—'}</span>
                    </td>
                    <td data-label="Refund Status">
                      <span className={`badge ${getRefundBadgeClass(order.refundStatus)}`}>{refundLabel(order.refundStatus)}</span>
                      {order.refundStatus === 'REFUNDED' && order.refundId && (
                        <p className="text-xs text-on-surface-variant font-mono mt-1 break-all">{order.refundId}</p>
                      )}
                      {order.refundStatus === 'FAILED' && order.refundFailureReason && (
                        <p className="text-xs text-error mt-1 max-w-[220px]">{order.refundFailureReason}</p>
                      )}
                    </td>
                    <td className="text-right" data-label="Actions">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="text-primary hover:text-tertiary p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                          title="View order"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </Link>
                        {(order.refundStatus === 'REFUND_REQUIRED' || order.refundStatus === 'FAILED') && (
                          <button
                            type="button"
                            onClick={() => setConfirmOrder(order)}
                            disabled={processingId === order.id}
                            className="btn-gold px-3 py-1.5 rounded text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                          >
                            {processingId === order.id
                              ? 'Processing...'
                              : order.refundStatus === 'FAILED' ? 'Retry Refund' : 'Process Refund'}
                          </button>
                        )}
                        {order.refundStatus === 'PROCESSING' && (
                          <button
                            type="button"
                            onClick={() => setConfirmOrder(order)}
                            disabled={processingId === order.id}
                            className="btn-outline px-3 py-1.5 rounded text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                          >
                            {processingId === order.id ? 'Checking...' : 'Check Status'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="p-6 border-t border-outline-variant flex justify-center bg-surface-alt">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={!!confirmOrder}
        onClose={() => setConfirmOrder(null)}
        onConfirm={handleProcessRefund}
        title={confirmOrder?.refundStatus === 'PROCESSING' ? 'Check refund status?' : 'Process this refund?'}
        description={
          confirmOrder?.refundStatus === 'PROCESSING'
            ? `This refund was already started and may still be in flight with Razorpay. We'll check the actual status before doing anything else — no new refund will be created unless it's genuinely safe.`
            : `This will refund the full amount of ${confirmOrder ? formatPrice(confirmOrder.refundAmount || confirmOrder.totalAmount) : ''} for order #${confirmOrder?.orderNumber} to the customer's original payment method via Razorpay. This cannot be undone.`
        }
        entityName={confirmOrder ? `Order #${confirmOrder.orderNumber}` : undefined}
        confirmText={confirmOrder?.refundStatus === 'PROCESSING' ? 'Check Status' : 'Process Refund'}
        dangerMode={false}
        isLoading={processingId === confirmOrder?.id}
        actionType="OTHER"
      />

      <div className="h-section-gap"></div>
    </>
  );
};
