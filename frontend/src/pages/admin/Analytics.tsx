import React, { useState, useEffect } from 'react';
import { dashboardService, type AnalyticsData } from '../../services/dashboardService';
import { formatPrice } from '../../utils/formatPrice';
import { Loader } from '../../components/ui/Loader';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await dashboardService.getAnalytics();
        if (res.data) setData(res.data);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
        setError('Failed to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <p className="font-body-md text-body-md text-error">{error || 'Could not load analytics.'}</p>
      </div>
    );
  }

  const maxProductRevenue = Math.max(1, ...data.topProducts.map(p => p.revenue));
  const maxCategoryRevenue = Math.max(1, ...data.topCategories.map(c => c.revenue));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-ink mb-2">Analytics</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Best sellers, category performance, and inventory health at a glance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card p-6">
          <h2 className="font-headline-md text-headline-md text-ink mb-1">Top Selling Products</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">By revenue, all-time (paid orders only)</p>
          {data.topProducts.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant py-8 text-center">No sales data yet.</p>
          ) : (
            <ul className="space-y-4">
              {data.topProducts.map((p, i) => (
                <li key={p.productName + i}>
                  <div className="flex justify-between items-baseline mb-1.5 gap-4">
                    <span className="font-body-md text-body-md text-on-surface truncate">
                      <span className="text-on-surface-variant mr-2">{i + 1}.</span>{p.productName}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{p.unitsSold} sold</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent progress-fill"
                        style={{ width: `${(p.revenue / maxProductRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium shrink-0 w-20 text-right">{formatPrice(p.revenue)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Categories */}
        <div className="card p-6">
          <h2 className="font-headline-md text-headline-md text-ink mb-1">Top Categories</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">By revenue, all-time (paid orders only)</p>
          {data.topCategories.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant py-8 text-center">No sales data yet.</p>
          ) : (
            <ul className="space-y-4">
              {data.topCategories.map((c, i) => (
                <li key={c.categoryName + i}>
                  <div className="flex justify-between items-baseline mb-1.5 gap-4">
                    <span className="font-body-md text-body-md text-on-surface truncate">
                      <span className="text-on-surface-variant mr-2">{i + 1}.</span>{c.categoryName}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{c.orderCount} orders</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full rounded-full bg-tertiary progress-fill"
                        style={{ width: `${(c.revenue / maxCategoryRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium shrink-0 w-20 text-right">{formatPrice(c.revenue)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Low Stock */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline-md text-headline-md text-ink">Low Stock Alert</h2>
          <span className="badge badge-warning">Below {data.lowStockThreshold} units</span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Variants that may need restocking soon</p>
        {data.lowStockItems.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant py-8 text-center">Nothing is running low right now.</p>
        ) : (
          <div className="table-shell overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Stock Remaining</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map((item, i) => (
                  <tr key={item.productName + item.size + i}>
                    <td data-label="Product">{item.productName}</td>
                    <td data-label="Size">{item.size}</td>
                    <td data-label="Stock Remaining">
                      <span className={`badge ${item.stock === 0 ? 'badge-error' : 'badge-warning'}`}>
                        {item.stock} left
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
