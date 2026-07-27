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
      
      <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-section-gap">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <aside className="md:col-span-1">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-6 sticky top-24">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">
                My Account
              </h2>
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-DEFAULT font-label-md transition-colors ${
                        isActive 
                          ? 'bg-primary-container text-on-primary-container font-medium' 
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`
                    }
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    {item.name}
                  </NavLink>
                ))}
                
                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-DEFAULT font-label-md text-error hover:bg-error-container/20 transition-colors mt-4 text-left w-full">
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
