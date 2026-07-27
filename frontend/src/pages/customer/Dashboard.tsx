import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { orderService } from '../../services/orderService';
import { formatPrice } from '../../utils/formatPrice';
import { formatOrderStatus } from '../../utils/formatOrderStatus';
import { useWishlist } from '../../hooks/useWishlist';
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

  if (isLoading) return <div className="text-center p-8">Loading dashboard...</div>;
  if (!profile) return <div className="text-center p-8 text-error">Failed to load profile. Please login again.</div>;

  const defaultAddress = addresses.find(a => a.defaultAddress) || addresses[0];
  const recentOrder = orders[0];

  return (
    <div>
      <h1 className="font-display-sm text-display-sm text-on-surface mb-8">Account Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Profile Summary */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-DEFAULT">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-headline-sm">Profile Details</h3>
            <Link to="/account/profile" className="text-primary font-label-md hover:underline">Edit</Link>
          </div>
          <div className="space-y-2 text-on-surface-variant font-body-md">
            <p className="font-medium text-on-surface">{profile.firstName} {profile.lastName}</p>
            <p>{profile.email}</p>
            <p>{profile.phone}</p>
          </div>
        </div>

        {/* Default Address */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-DEFAULT">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-headline-sm">Default Address</h3>
            <Link to="/account/addresses" className="text-primary font-label-md hover:underline">Manage</Link>
          </div>
          {defaultAddress ? (
            <div className="space-y-1 text-on-surface-variant font-body-md">
              <p className="font-medium text-on-surface">{defaultAddress.fullName}</p>
              <p>{defaultAddress.addressLine1}</p>
              {defaultAddress.addressLine2 && <p>{defaultAddress.addressLine2}</p>}
              <p>{defaultAddress.city}, {defaultAddress.country}</p>
              <p>Phone: {defaultAddress.phone}</p>
            </div>
          ) : (
            <p className="text-on-surface-variant italic">No default address set.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stats Cards */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-DEFAULT flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined">shopping_bag</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Total Orders</p>
            <p className="font-headline-md text-headline-md">{orders.length}</p>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-DEFAULT flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined">favorite</span>
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Wishlist Items</p>
            <p className="font-headline-md text-headline-md">{wishlistIds.length}</p>
          </div>
        </div>
      </div>

      {/* Recent Order */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-md text-headline-md">Recent Order</h2>
          <Link to="/account/orders" className="text-primary font-label-md hover:underline">View All</Link>
        </div>
        
        {recentOrder ? (
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-DEFAULT flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="font-label-lg font-medium">Order #{recentOrder.orderNumber}</p>
              <p className="text-on-surface-variant font-body-sm mt-1">
                Placed on {new Date(recentOrder.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-label-md uppercase tracking-wider border ${getStatusColor(recentOrder.status)}`}>
                {formatOrderStatus(recentOrder.status)}
              </span>
              <p className="font-headline-sm">{formatPrice(recentOrder.totalAmount)}</p>
            </div>
            <Link to={`/account/orders/${recentOrder.id}`} className="btn-outline px-4 py-2 text-sm whitespace-nowrap">
              View Details
            </Link>
          </div>
        ) : (
          <p className="text-on-surface-variant italic">No recent orders found.</p>
        )}
      </div>
    </div>
  );
};
