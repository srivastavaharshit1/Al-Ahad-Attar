import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AnnouncementBar } from './AnnouncementBar';
import { useAuth } from '../../hooks/useAuth';

export const CustomerLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const navItems = [
    { name: 'Dashboard', path: '/account/dashboard', icon: 'dashboard' },
    { name: 'Profile Details', path: '/account/profile', icon: 'person' },
    { name: 'My Addresses', path: '/account/addresses', icon: 'location_on' },
    { name: 'My Orders', path: '/account/orders', icon: 'shopping_bag' },
    { name: 'Wishlist', path: '/wishlist', icon: 'favorite' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-surface-bright">
      <AnnouncementBar />
      <Navbar />
      
      <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Sidebar Navigation */}
          <aside className="md:col-span-1">
            <div className="card p-6 md:sticky md:top-24">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">
                My Account
              </h2>
              <nav className="flex flex-col gap-1.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg font-label-md text-sm tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        isActive
                          ? 'bg-accent-soft text-accent-hover font-semibold'
                          : 'text-on-surface hover:bg-surface-container-low hover:text-accent'
                      }`
                    }
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    {item.name}
                  </NavLink>
                ))}

                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg font-label-md text-sm tracking-wide text-error hover:bg-error-container/20 transition-colors mt-4 text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error">
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Sign Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="md:col-span-3">
            <Outlet />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};
