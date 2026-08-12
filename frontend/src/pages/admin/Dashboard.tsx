import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService, type DashboardStats } from '../../services/dashboardService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import type { Order } from '../../types';
import { useInView } from '../../hooks/useInView';
import { Loader } from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { ref: kpiRef, inView: kpiInView } = useInView<HTMLDivElement>();

  useEffect(() => {
    // StrictMode (dev only) mounts this effect twice; the first invocation's in-flight
    // request gets cancelled on the immediate remount. Without this guard, that
    // cancellation surfaces as a spurious error toast even though the second (real)
    // request goes on to succeed and populate the correct data.
    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const statsRes = await dashboardService.getStats();
        if (cancelled) return;

        if (statsRes.data) {
          setStats(statsRes.data);
          setRecentOrders(statsRes.data.recentOrders || []);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to fetch dashboard data.", error);
        toast.error('Failed to load dashboard data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Real month-over-month revenue trend derived from stats.monthlyRevenue (the same data
  // already powering the chart below) — replaces a previously hardcoded, fabricated "+12.5%".
  // Returns null when there isn't enough data to compute a real number, rather than a fallback.
  const revenueTrend = (() => {
    const months = stats?.monthlyRevenue;
    if (!months || months.length < 2) return null;
    const current = months[months.length - 1].revenue;
    const previous = months[months.length - 2].revenue;
    if (!previous) return null;
    const pct = ((current - previous) / previous) * 100;
    return { pct, up: pct >= 0 };
  })();

  const getStatusBadgeClass = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'CONFIRMED': return 'badge-neutral';
      case 'PACKED': return 'badge-warning';
      case 'SHIPPED': return 'badge-gold';
      case 'DELIVERED': return 'badge-success';
      case 'CANCELLED': return 'badge-error';
      default: return 'badge-neutral';
    }
  };

  if (isLoading && !stats) {
    return <Loader />;
  }

  return (
    <>
      {/* KPI Cards Grid */}
      <div ref={kpiRef} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        {/* Total Revenue */}
        <div className={`kpi-card flex flex-col justify-between reveal ${kpiInView ? 'in-view stagger-1' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Revenue</p>
              <h3 className="font-headline-lg text-headline-lg text-ink mt-1">₹{stats?.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-accent-hover">payments</span>
            </div>
          </div>
          {revenueTrend ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                {revenueTrend.up ? 'trending_up' : 'trending_down'}
              </span>
              <span className="text-on-surface-variant font-medium">
                {revenueTrend.up ? '+' : ''}{revenueTrend.pct.toFixed(1)}%
              </span>
              <span className="text-on-surface-variant">vs last month</span>
            </div>
          ) : (
            <div className="text-sm text-on-surface-variant">All-time total</div>
          )}
        </div>

        {/* Today's Revenue */}
        <div className={`kpi-card flex flex-col justify-between reveal ${kpiInView ? 'in-view stagger-2' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Today's Revenue</p>
              <h3 className="font-headline-lg text-headline-lg text-ink mt-1">₹{stats?.todaysRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">today</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-on-surface-variant">Real-time today</span>
          </div>
        </div>

        {/* Orders */}
        <div className={`kpi-card flex flex-col justify-between reveal ${kpiInView ? 'in-view stagger-3' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Orders</p>
              <h3 className="font-headline-lg text-headline-lg text-ink mt-1">{stats?.totalOrders || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">shopping_bag</span>
            </div>
          </div>
          <div className="text-sm text-on-surface-variant">All-time total</div>
        </div>

        {/* Customers */}
        <div className={`kpi-card flex flex-col justify-between reveal ${kpiInView ? 'in-view stagger-1' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Customers</p>
              <h3 className="font-headline-lg text-headline-lg text-ink mt-1">{stats?.totalCustomers || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">group</span>
            </div>
          </div>
          <div className="text-sm text-on-surface-variant">All-time total</div>
        </div>

        {/* Products */}
        <div className={`kpi-card flex flex-col justify-between reveal ${kpiInView ? 'in-view stagger-2' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Products</p>
              <h3 className="font-headline-lg text-headline-lg text-ink mt-1">{stats?.totalProducts || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-on-surface-variant">{stats?.totalCategories || 0} active categories</span>
          </div>
        </div>
      </div>

      {/* Order Status Summary */}
      <div className="card mb-10 p-8">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Order Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
            <span className="badge badge-neutral mb-2">Confirmed</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.confirmedOrders || 0}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
            <span className="badge badge-warning mb-2">Packed</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.packedOrders || 0}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
            <span className="badge badge-gold mb-2">Shipped</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.shippedOrders || 0}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
            <span className="badge badge-success mb-2">Delivered</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.deliveredOrders || 0}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
            <span className="badge badge-error mb-2">Cancelled</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.cancelledOrders || 0}</p>
          </div>
        </div>
      </div>

      {/* Refund Management Summary */}
      <div className="card mb-10 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline-md text-headline-md text-on-surface">Refunds</h3>
          <Link to="/admin/refunds" className="font-label-md text-label-md text-primary hover:text-tertiary flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded">
            Manage Refunds
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/refunds?status=REFUND_REQUIRED" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center transition-colors hover:border-accent-hover/50 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
            <span className="badge badge-warning mb-2">Refund Required</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.pendingRefunds || 0}</p>
          </Link>
          <Link to="/admin/refunds?status=REFUNDED" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center block focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
            <span className="badge badge-success mb-2">Refunded</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.completedRefunds || 0}</p>
          </Link>
          <Link to="/admin/refunds?status=FAILED" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center transition-colors hover:border-error/40 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
            <span className="badge badge-error mb-2">Failed</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">{stats?.failedRefunds || 0}</p>
          </Link>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
            <span className="badge badge-neutral mb-2">Amount Refunded</span>
            <p className="font-headline-sm text-headline-sm text-ink mt-1">₹{stats?.totalRefunded?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Chart Area */}
        <div className="card lg:col-span-2 p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline-md text-headline-md text-on-surface">Revenue Overview</h3>
            <select className="bg-surface border border-outline-variant rounded-md px-3 py-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:border-accent-hover/60 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 focus:border-accent">
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
                     className="w-full bg-accent-soft hover:bg-accent transition-colors rounded-t-md relative group flex-1">
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
        <div className="card p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline-md text-headline-md text-on-surface">Recent Orders</h3>
            <Link
              to="/admin/orders"
              className="font-label-sm text-label-sm text-accent-hover hover:text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm transition-colors"
            >
              View All
            </Link>
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
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">shopping_bag</span>
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
                    <span className={`badge ${getStatusBadgeClass(order.status)} mt-1`}>
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
