import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import { useWishlist } from '../../hooks/useWishlist';
import { Loader } from '../../components/ui/Loader';
import type { User, Address, Order } from '../../types';

export const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { productIds: wishlistIds } = useWishlist();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [profileRes, addressRes, orderRes] = await Promise.all([
          profileService.getProfile(),
          profileService.getAddresses().catch(() => ({ data: [] })),
          orderService.getOrders().catch(() => ({ data: [] })) // Fallback to empty if order fails
        ]);
        setProfile(profileRes.data);
        setAddresses(addressRes.data);
        setOrders((orderRes as any).content || (orderRes as any).data?.content || []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

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

  if (isLoading) return <Loader />;

  if (!profile) {
    return (
      <div className="flex flex-col items-center text-center py-20 px-6">
        <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-accent text-2xl">error_outline</span>
        </div>
        <h2 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase">Session Expired</h2>
        <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed max-w-md">
          We couldn't load your profile. Please sign in again to view your account.
        </p>
        <Link to="/login" className="btn btn-primary inline-flex items-center">
          Back to Login
        </Link>
      </div>
    );
  }

  const defaultAddress = addresses.find(a => a.defaultAddress) || addresses[0];
  const recentOrder = orders[0];

  return (
    <div>
      <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-2 block">My Account</span>
      <h1 className="font-display-sm text-display-sm text-on-surface mb-8">Account Dashboard</h1>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="kpi-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined">shopping_bag</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Total Orders</p>
            <p className="font-headline-md text-headline-md text-on-surface">{orders.length}</p>
          </div>
        </div>

        <div className="kpi-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined">favorite</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Wishlist Items</p>
            <p className="font-headline-md text-headline-md text-on-surface">{wishlistIds.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Profile Summary */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Profile Details</h3>
            <Link to="/account/profile" className="link-underline font-label-md text-primary rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Edit</Link>
          </div>
          <div className="space-y-2 text-on-surface-variant font-body-md leading-relaxed">
            <p className="font-medium text-on-surface">{profile.firstName} {profile.lastName}</p>
            <p>{profile.email}</p>
            <p>{profile.phone}</p>
          </div>
        </div>

        {/* Default Address */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Default Address</h3>
            <Link to="/account/addresses" className="link-underline font-label-md text-primary rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Manage</Link>
          </div>
          {defaultAddress ? (
            <div className="space-y-1 text-on-surface-variant font-body-md leading-relaxed">
              <p className="font-medium text-on-surface">{defaultAddress.fullName}</p>
              <p>{defaultAddress.addressLine1}</p>
              {defaultAddress.addressLine2 && <p>{defaultAddress.addressLine2}</p>}
              <p>{defaultAddress.city}, {defaultAddress.country}</p>
              <p>Phone: {defaultAddress.phone}</p>
            </div>
          ) : (
            <p className="text-on-surface-variant font-body-md leading-relaxed italic">No default address set.</p>
          )}
        </div>
      </div>

      {/* Recent Order */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">Recent Order</h2>
          <Link to="/account/orders" className="link-underline font-label-md text-primary rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">View All</Link>
        </div>

        {recentOrder ? (
          <div className="card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="font-mono text-sm font-medium tracking-wide text-on-surface">Order #{recentOrder.orderNumber}</p>
              <p className="text-on-surface-variant font-body-sm leading-relaxed mt-1">
                Placed on {new Date(recentOrder.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`badge ${getStatusBadgeClass(recentOrder.status)}`}>
                {formatOrderStatus(recentOrder.status)}
              </span>
              <p className="font-headline-sm text-on-surface">{formatPrice(recentOrder.totalAmount)}</p>
            </div>
            <Link to={`/account/orders/${recentOrder.id}`} className="btn btn-outline whitespace-nowrap">
              View Details
            </Link>
          </div>
        ) : (
          <div className="card p-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-accent flex items-center justify-center">
              <span className="material-symbols-outlined text-accent">inventory_2</span>
            </div>
            <p className="text-on-surface-variant font-body-md leading-relaxed mb-6">
              No orders yet — your first fragrance journey awaits.
            </p>
            <Link to="/collection" className="btn btn-primary inline-flex items-center">
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
