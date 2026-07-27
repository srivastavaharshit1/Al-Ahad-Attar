import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import type { Order } from '../../types';
import toast from 'react-hot-toast';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import { downloadCSV } from '../../utils/exportUtils';

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [totalPages, setTotalPages] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  useEffect(() => {
    fetchOrders();
  }, [currentPage]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params: any = { page: currentPage, size: 10 };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await orderService.getAllOrders(params);
      setOrders(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error("Failed to fetch orders. Endpoint may not exist yet.", error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    searchParams.set('page', page.toString());
    setSearchParams(searchParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchParams.set('page', '0');
    setSearchParams(searchParams);
    fetchOrders();
  };

  const handleExportCSV = async () => {
    try {
      const toastId = toast.loading('Exporting orders...');
      const params: any = { page: 0, size: 10000 };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await orderService.getAllOrders(params);
      
      const exportData = (response.content || []).map((o: any) => ({
        'Order ID': o.orderNumber,
        'Date': new Date(o.createdAt).toLocaleDateString(),
        'Customer Name': o.shippingAddress?.fullName || 'N/A',
        'Customer Email': o.shippingAddress?.email || 'N/A', // fallback if needed
        'Total Amount': o.totalAmount,
        'Shipping Cost': o.shippingCost,
        'Status': o.status,
        'Payment Status': o.paymentStatus,
        'Payment Method': o.paymentMethod,
        'Courier Name': o.courierName || '',
        'Tracking Number': o.trackingNumber || ''
      }));
      
      downloadCSV(exportData, 'Orders');
      toast.success('Orders exported successfully', { id: toastId });
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Failed to export orders');
    }
  };

  const getStatusClass = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'PACKED': return 'bg-indigo-100 text-indigo-800';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-surface-variant text-on-surface-variant';
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, orderId: number) => {
    e.stopPropagation(); // prevent row click navigation
    const newStatus = e.target.value;
    try {
      const res = await orderService.updateOrderStatus(orderId.toString(), newStatus);
      setOrders(orders.map(o => o.id === orderId ? res.data : o));
      toast.success(`Order status updated to ${formatOrderStatus(newStatus)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const newOrdersCount = orders.filter(o => o.status === 'CONFIRMED').length;
  const todaysRevenue = orders
    .filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <>
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Orders Management</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Review and process recent customer purchases.</p>
        </div>
        <button onClick={handleExportCSV} type="button" className="bg-primary text-on-primary px-6 py-3 rounded hover:bg-tertiary transition-colors font-label-md text-label-md flex items-center gap-2">
          <span className="material-symbols-outlined">download</span>
          Export Orders
        </button>
      </header>

      {/* Filters & Stats Bento */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Status Filter */}
        <div className="col-span-12 md:col-span-8 bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4">Filter by Status</h3>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="px-4 py-2 rounded-full border border-primary bg-primary text-on-primary font-label-md text-label-md">All Orders</button>
            <button type="button" className="px-4 py-2 rounded-full border border-outline text-on-surface font-label-md text-label-md hover:border-primary transition-colors">New Orders</button>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase block mb-1">Search Orders</label>
              <form onSubmit={handleSearch} className="flex items-center border-b border-outline focus-within:border-primary transition-colors">
                <button type="submit" className="material-symbols-outlined text-outline text-sm mr-2 hover:text-primary">search</button>
                <input 
                  className="w-full bg-transparent border-none focus:ring-0 p-0 pb-1 text-body-md font-body-md text-on-surface" 
                  placeholder="Search by order ID, email or name..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="col-span-12 md:col-span-4 grid grid-rows-2 gap-6">
          <div className="bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6 flex flex-col justify-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">New Orders</p>
            <p className="font-display-lg-mobile text-display-lg-mobile text-primary">{newOrdersCount}</p>
          </div>
          <div className="bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6 flex flex-col justify-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">Today's Revenue</p>
            <p className="font-display-lg-mobile text-display-lg-mobile text-on-surface">{formatPrice(todaysRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <Loader />
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">No orders found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-bright">
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Order ID</th>
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Date</th>
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Customer Name</th>
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Total</th>
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface">
                {orders.map(order => (
                  <tr key={order.id} onClick={() => navigate(`/admin/orders/${order.id}`)} className="border-b border-outline-variant hover:bg-surface-container/50 transition-colors cursor-pointer">
                    <td className="py-4 px-6 font-medium">#{order.orderNumber}</td>
                    <td className="py-4 px-6 text-on-surface-variant">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-6">{order.shippingAddress?.fullName || 'N/A'}</td>
                    <td className="py-4 px-6 font-medium">{formatPrice(order.totalAmount)}</td>
                    <td className="py-4 px-6">
                      <select 
                        value={order.status} 
                        onChange={(e) => handleStatusChange(e, order.id)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs font-medium rounded p-1 outline-none cursor-pointer border-r-4 border-transparent ${getStatusClass(order.status)}`}
                      >
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PACKED">Packed</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button type="button" className="text-primary hover:text-tertiary p-1"><span className="material-symbols-outlined">visibility</span></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="p-6 border-t border-outline-variant flex justify-center bg-surface-bright">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
      
      <div className="h-section-gap"></div>
    </>
  );
};
