import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService, type DashboardStats } from '../../services/dashboardService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import type { Order } from '../../types';

export const Dashboard: React.FC = () => {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const statsRes = await dashboardService.getStats();
        
        if (statsRes.data) {
          setStats(statsRes.data);
          setRecentOrders(statsRes.data.recentOrders || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data.", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusClass = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'PACKED': return 'bg-indigo-100 text-indigo-800';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-surface-dim text-on-surface-variant';
    }
  };

  return (
    <>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        {/* Total Revenue */}
        <div className="bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Revenue</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">₹{stats?.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">payments</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-[16px] text-tertiary">trending_up</span>
            <span className="text-tertiary font-medium">+12.5%</span>
            <span className="text-on-surface-variant">vs last month</span>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Today's Revenue</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">₹{stats?.todaysRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">today</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-on-surface-variant">Real-time today</span>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Orders</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">{stats?.totalOrders || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">shopping_bag</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-[16px] text-tertiary">trending_up</span>
            <span className="text-tertiary font-medium">+8.2%</span>
            <span className="text-on-surface-variant">vs last month</span>
          </div>
        </div>

        {/* Customers */}
        <div className="bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Customers</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">{stats?.totalCustomers || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant">group</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-[16px] text-tertiary">trending_up</span>
            <span className="text-tertiary font-medium">+4.1%</span>
            <span className="text-on-surface-variant">vs last month</span>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Products</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1">{stats?.totalProducts || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary">inventory_2</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-on-surface-variant">{stats?.totalCategories || 0} active categories</span>
          </div>
        </div>
      </div>

      {/* Order Status Summary */}
      <div className="mb-10 bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-8">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Order Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <h4 className="font-label-sm uppercase tracking-wider text-blue-800 mb-2">Confirmed</h4>
            <p className="font-display-sm text-blue-900">{stats?.confirmedOrders || 0}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
            <h4 className="font-label-sm uppercase tracking-wider text-indigo-800 mb-2">Packed</h4>
            <p className="font-display-sm text-indigo-900">{stats?.packedOrders || 0}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <h4 className="font-label-sm uppercase tracking-wider text-purple-800 mb-2">Shipped</h4>
            <p className="font-display-sm text-purple-900">{stats?.shippedOrders || 0}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <h4 className="font-label-sm uppercase tracking-wider text-green-800 mb-2">Delivered</h4>
            <p className="font-display-sm text-green-900">{stats?.deliveredOrders || 0}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <h4 className="font-label-sm uppercase tracking-wider text-red-800 mb-2">Cancelled</h4>
            <p className="font-display-sm text-red-900">{stats?.cancelledOrders || 0}</p>
          </div>
        </div>
      </div>

      {/* Refund Management Summary */}
      <div className="mb-10 bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-8">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Refund Requests</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center hover:bg-amber-100 transition-colors">
            <h4 className="font-label-sm uppercase tracking-wider text-amber-800 mb-2">Pending Action</h4>
            <p className="font-display-sm text-amber-900">{stats?.pendingRefunds || 0}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <h4 className="font-label-sm uppercase tracking-wider text-green-800 mb-2">Completed</h4>
            <p className="font-display-sm text-green-900">{stats?.completedRefunds || 0}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center hover:bg-red-100 transition-colors">
            <h4 className="font-label-sm uppercase tracking-wider text-red-800 mb-2">Failed</h4>
            <p className="font-display-sm text-red-900">{stats?.failedRefunds || 0}</p>
          </div>
          <div className="bg-surface-dim border border-outline-variant rounded-lg p-4 text-center">
            <h4 className="font-label-sm uppercase tracking-wider text-on-surface-variant mb-2">Amount Refunded</h4>
            <p className="font-headline-lg text-on-surface mt-1">₹{stats?.totalRefunded?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline-md text-headline-md text-on-surface">Revenue Overview</h3>
            <select className="bg-surface border border-outline-variant rounded-md px-3 py-1 font-label-sm text-label-sm text-on-surface-variant focus:outline-none focus:border-primary">
              <option>This Year</option>
              <option>Last Year</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          {/* Real Chart */}
          <div className="w-full h-72 border-b border-l border-outline-variant/50 relative flex items-end px-4 gap-4">
            {stats?.monthlyRevenue?.map((data, index) => {
              const maxRevenue = Math.max(...(stats.monthlyRevenue.map(d => d.revenue) || [0]), 1000);
              const heightPercentage = Math.max((data.revenue / maxRevenue) * 100, 5); // min 5% height for visibility
              
              return (
                <div key={index} 
                     style={{ height: `${heightPercentage}%` }}
                     className="w-full bg-primary-container/70 hover:bg-primary transition-colors rounded-t-md relative group flex-1">
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 font-label-sm text-label-sm bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded transition-opacity z-10 whitespace-nowrap">
                    ₹{data.revenue.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 font-label-sm text-label-sm text-on-surface-variant px-4">
            {stats?.monthlyRevenue?.map((data, index) => (
              <span key={index} className="flex-1 text-center">{data.month}</span>
            ))}
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="bg-white/90 backdrop-blur-[10px] border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline-md text-headline-md text-on-surface">Recent Orders</h3>
            <Link to="/admin/orders" className="font-label-sm text-label-sm text-primary hover:underline">View All</Link>
          </div>
          
          {isLoading ? (
            <div className="py-8 text-center text-on-surface-variant">Loading orders...</div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant">No recent orders found.</div>
          ) : (
            <ul className="flex flex-col gap-6">
              {recentOrders.map(order => (
                <li key={order.id} className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[20px]">shopping_bag</span>
                    </div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">#{order.orderNumber}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {order.shippingAddress?.fullName || 'N/A'} • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-body-md text-body-md text-on-surface font-medium">{formatPrice(order.totalAmount)}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider mt-1 ${getStatusClass(order.status)}`}>
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};
