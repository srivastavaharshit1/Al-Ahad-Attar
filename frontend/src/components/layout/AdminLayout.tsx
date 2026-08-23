import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminNotificationService } from '../../services/adminNotificationService';
import type { AdminNotification } from '../../services/adminNotificationService';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { path: '/admin/analytics', label: 'Analytics', icon: 'monitoring' },
  { path: '/admin/products', label: 'Products', icon: 'inventory_2' },
  { path: '/admin/categories', label: 'Categories', icon: 'category' },
  { path: '/admin/orders', label: 'Orders', icon: 'shopping_cart' },
  { path: '/admin/refunds', label: 'Refunds', icon: 'currency_exchange' },
  { path: '/admin/customers', label: 'Customers', icon: 'group' },
  { path: '/admin/inquiries', label: 'Customer Inquiries', icon: 'forum' },
  { path: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
  { path: '/admin/promotions', label: 'Promotions', icon: 'campaign' },
  { path: '/admin/gift-services', label: 'Gift Services', icon: 'redeem' },
  { path: '/admin/bottles', label: 'Bottles', icon: 'liquor' },
  { path: '/admin/homepage', label: 'Storefront UI', icon: 'web' },
  { path: '/admin/settings', label: 'Store Settings', icon: 'settings' },
  { path: '/admin/account', label: 'My Account', icon: 'account_circle' },
];

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const [notifs, count] = await Promise.all([
        adminNotificationService.getRecentNotifications(0, 10),
        adminNotificationService.getUnreadCount()
      ]);
      setNotifications(notifs.content);
      setUnreadCount(count.unreadCount);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number, orderId?: number) => {
    try {
      await adminNotificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setIsNotifOpen(false);
      if (orderId) {
        navigate(`/admin/orders/${orderId}`);
      }
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await adminNotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActivePath = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const currentPageLabel = NAV_ITEMS.find(item => isActivePath(item.path, item.end))?.label || 'Admin Console';

  const renderNavLinks = () => (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(item.path, item.end);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileNavOpen(false)}
            title={item.label}
            className={`group relative flex items-center gap-4 py-3 px-4 rounded-md transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
              active
                ? 'bg-white/[.06] text-accent'
                : 'text-inverse-on-surface/70 hover:text-inverse-on-surface hover:bg-white/[.04]'
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] bg-accent rounded-r" aria-hidden="true" />
            )}
            <span
              className="material-symbols-outlined text-[20px] shrink-0"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-label-md text-label-md truncate">{item.label}</span>
          </Link>
        );
      })}
      <Link
        to="/"
        onClick={() => setMobileNavOpen(false)}
        className="flex items-center gap-4 py-3 px-4 rounded-md text-inverse-on-surface/70 hover:text-inverse-on-surface hover:bg-white/[.04] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <span className="material-symbols-outlined text-[20px] shrink-0">home</span>
        <span className="font-label-md text-label-md truncate">Back to Store</span>
      </Link>
    </nav>
  );

  return (
    <div className="font-body-md text-body-md text-on-surface antialiased flex h-screen overflow-hidden bg-surface-bright">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/55 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SideNavBar */}
      <aside
        className={`h-screen w-64 fixed left-0 top-0 bg-ink z-40 flex flex-col transition-transform duration-300 ease-out
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Sidebar Header (Fixed) */}
        <div className="py-6 px-6 flex-shrink-0 border-b border-accent/15">
          <div className="flex items-center gap-3">
            {/* Brand monogram crest — was a random stock "Admin User Portrait" photo that had
                nothing to do with this business or its actual admin; a gold-ringed monogram is
                the honest, on-brand mark for a boutique attar house's back office. */}
            <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#1e2b3d] to-ink border border-accent/50 shadow-[0_0_0_3px_rgba(var(--accent-rgb),.08)]">
              <span className="font-headline-sm text-accent tracking-wide" style={{ fontSize: '15px' }}>AA</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-headline-sm text-headline-sm text-accent tracking-tight truncate">Al Ahad Attars</h1>
              <p className="font-label-sm text-[10px] tracking-[.2em] uppercase text-inverse-on-surface/50 mt-0.5">Boutique Admin</p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {renderNavLinks()}
        </div>

        {/* Sidebar Footer (Fixed Sign Out) */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 py-3 px-4 rounded-md text-error/90 hover:bg-error/10 hover:text-error transition-colors duration-200 w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-label-md text-label-md">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="lg:ml-64 flex-1 flex flex-col h-screen relative min-w-0">
        {/* TopAppBar Component */}
        <header className="h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-4 md:px-8 w-full z-10 sticky top-0 shrink-0">
          {/* Left: Mobile menu toggle + Title Area */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            {/* Was a second "Al Ahad Attars" wordmark repeating the sidebar's — replaced with the
                current section name so this bar actually orients you, concierge-style. */}
            <div className="min-w-0">
              <p className="hidden md:block font-label-sm text-[10px] tracking-[.2em] uppercase text-accent-hover/80">Al Ahad Attars</p>
              <h2 className="font-headline-sm text-lg text-on-surface truncate">{currentPageLabel}</h2>
            </div>
          </div>

          {/* Right: Search & Actions */}
          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <div className="relative hidden sm:block focus-within:ring-1 focus-within:ring-accent rounded-full transition-all">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
              <input
                type="text"
                placeholder="Search..."
                className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm font-body-md text-on-surface placeholder:text-outline w-40 md:w-64 focus:outline-none focus:bg-surface focus:ring-0"
              />
            </div>

            <div className="flex items-center gap-1">
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-error text-on-error text-[10px] font-bold rounded-full px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-surface rounded-md shadow-lg border border-outline-variant z-50 overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
                      <h3 className="font-headline-sm text-sm text-on-surface">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[11px] font-label-md text-accent hover:text-accent-hover transition-colors"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-on-surface-variant text-sm font-body-sm">
                          No notifications yet
                        </div>
                      ) : (
                        <ul className="divide-y divide-outline-variant">
                          {notifications.map(notif => (
                            <li
                              key={notif.id}
                              onClick={() => handleMarkAsRead(notif.id, notif.orderId)}
                              className={`p-4 cursor-pointer hover:bg-surface-container-low transition-colors ${
                                !notif.isRead ? 'bg-accent/5' : ''
                              }`}
                            >
                              <div className="flex gap-3">
                                <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                                  !notif.isRead ? 'text-accent' : 'text-on-surface-variant/70'
                                }`}>
                                  {notif.type.includes('ORDER') ? 'local_mall' : 'info'}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${!notif.isRead ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                                    {notif.message}
                                  </p>
                                  <p className="text-[11px] text-on-surface-variant/60 mt-1">
                                    {new Date(notif.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                {!notif.isRead && (
                                  <div className="w-2 h-2 bg-accent rounded-full shrink-0 mt-1.5" />
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/admin/account"
                className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <span className="material-symbols-outlined">account_circle</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-10 bg-surface-bright">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
