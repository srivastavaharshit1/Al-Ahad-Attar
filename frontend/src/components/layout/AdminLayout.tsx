import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getLinkClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
    if (isActive) {
      return "flex items-center gap-4 py-3 px-4 rounded-lg text-primary dark:text-inverse-primary font-semibold border-b border-primary dark:border-inverse-primary bg-surface-container-low transition-colors duration-200 scale-95 transition-transform duration-150";
    }
    return "flex items-center gap-4 py-3 px-4 rounded-lg text-on-surface-variant dark:text-surface-variant font-medium hover:text-primary dark:hover:text-inverse-primary transition-colors duration-200 scale-95 transition-transform duration-150";
  };

  const getIconClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
    if (isActive) {
      return "material-symbols-outlined";
    }
    return "material-symbols-outlined";
  };

  const getIconStyle = (path: string) => {
    const isActive = location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
    if (isActive) {
      return { fontVariationSettings: "'FILL' 1" };
    }
    return {};
  };

  return (
    <div className="font-body-md text-body-md text-on-surface antialiased flex h-screen overflow-hidden bg-surface-bright">
      {/* SideNavBar */}
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-outline-variant dark:border-outline bg-surface dark:bg-inverse-surface z-20 flex flex-col">
        {/* Sidebar Header (Fixed) */}
        <div className="py-base px-gutter flex-shrink-0">
          <div className="mb-6 mt-4 flex flex-col items-start gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrA34uyuds7fZF8hHhHEeENfxRTXN7KdyPF9Z4Kp4zGhtFb_2j4PRu2W1E2MleH4SE6g0vIUu48hJdhQZDnC_eYyPftFUzbuJiVNNmEQ3AFkFvRcoWqu3ORqlgxDtVRoYcuRF1PxUdjiFRaK3D33QYP_upJ5aXourZP1a7Z-24EUaE_lD1e1BwKLsgosLj5nVO-EccvxAI4fZuGpgMxKfwlFtEwdy8WluAXj2H9DtCE5BYszdBnBMOmsTIg7X0bW5zkB1CTv4oBA" 
                alt="Admin User Portrait" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-semibold text-primary dark:text-inverse-primary tracking-tight">Al Ahad Attars</h1>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1">Luxury Fragrance Admin</p>
            </div>
          </div>
        </div>
          
        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-gutter pb-4">
          <nav className="space-y-2">
            <Link to="/admin" className={getLinkClass('/admin')} style={getLinkClass('/admin').includes('bg-surface-container-low') ? undefined : {}}>
              <span className={getIconClass('/admin')} style={getIconStyle('/admin')}>dashboard</span>
              <span className="font-label-md text-label-md">Dashboard</span>
            </Link>
            
            <Link to="/admin/products" className={getLinkClass('/admin/products')}>
              <span className={getIconClass('/admin/products')} style={getIconStyle('/admin/products')}>inventory_2</span>
              <span className="font-label-md text-label-md">Products</span>
            </Link>

            <Link to="/admin/categories" className={getLinkClass('/admin/categories')}>
              <span className={getIconClass('/admin/categories')} style={getIconStyle('/admin/categories')}>category</span>
              <span className="font-label-md text-label-md">Categories</span>
            </Link>
            
            <Link to="/admin/orders" className={getLinkClass('/admin/orders')}>
              <span className={getIconClass('/admin/orders')} style={getIconStyle('/admin/orders')}>shopping_cart</span>
              <span className="font-label-md text-label-md">Orders</span>
            </Link>
            
            <Link to="/admin/customers" className={getLinkClass('/admin/customers')}>
              <span className={getIconClass('/admin/customers')} style={getIconStyle('/admin/customers')}>group</span>
              <span className="font-label-md text-label-md">Customers</span>
            </Link>

            <Link to="/admin/inquiries" className={getLinkClass('/admin/inquiries')}>
              <span className={getIconClass('/admin/inquiries')} style={getIconStyle('/admin/inquiries')}>forum</span>
              <span className="font-label-md text-label-md">Customer Inquiries</span>
            </Link>

            <Link to="/admin/reviews" className={getLinkClass('/admin/reviews')}>
              <span className={getIconClass('/admin/reviews')} style={getIconStyle('/admin/reviews')}>reviews</span>
              <span className="font-label-md text-label-md">Reviews</span>
            </Link>

            <Link to="/admin/settings" className={getLinkClass('/admin/settings')}>
              <span className={getIconClass('/admin/settings')} style={getIconStyle('/admin/settings')}>settings</span>
              <span className="font-label-md text-label-md">Store Settings</span>
            </Link>

            <Link to="/admin/promotions" className={getLinkClass('/admin/promotions')}>
              <span className={getIconClass('/admin/promotions')} style={getIconStyle('/admin/promotions')}>campaign</span>
              <span className="font-label-md text-label-md">Promotions</span>
            </Link>

            <Link to="/admin/gift-services" className={getLinkClass('/admin/gift-services')}>
              <span className={getIconClass('/admin/gift-services')} style={getIconStyle('/admin/gift-services')}>redeem</span>
              <span className="font-label-md text-label-md">Gift Services</span>
            </Link>

            <Link to="/admin/homepage" className={getLinkClass('/admin/homepage')}>
              <span className={getIconClass('/admin/homepage')} style={getIconStyle('/admin/homepage')}>web</span>
              <span className="font-label-md text-label-md">Storefront UI</span>
            </Link>

            <Link to="/" className={getLinkClass('/')}>
              <span className={getIconClass('/')} style={getIconStyle('/')}>home</span>
              <span className="font-label-md text-label-md">Back to Store</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer (Fixed Sign Out) */}
        <div className="p-gutter border-t border-outline-variant flex-shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-4 py-3 px-4 rounded-lg text-error hover:bg-error-container/20 transition-colors duration-200 w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="ml-64 flex-1 flex flex-col h-screen relative">
        {/* TopAppBar Component */}
        <header className="docked full-width top-0 h-16 bg-surface dark:bg-inverse-surface border-b border-outline-variant dark:border-outline flex justify-between items-center px-gutter w-full z-10 sticky">
          {/* Left: Brand / Title Area */}
          <div className="flex items-center gap-4">
            <div className="font-headline-md text-headline-md text-primary dark:text-inverse-primary">Al Ahad Attars</div>
            <div className="h-6 w-[1px] bg-outline-variant mx-2"></div>
            <h2 className="font-body-lg text-body-lg text-on-surface-variant">Admin Console</h2>
          </div>
          
          {/* Right: Search & Actions */}
          <div className="flex items-center gap-6">
            <div className="relative focus-within:ring-1 focus-within:ring-primary rounded-full transition-all">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm font-body-md text-on-surface placeholder:text-outline w-64 focus:outline-none focus:bg-surface focus:ring-0"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-all">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-all">
                <span className="material-symbols-outlined">account_circle</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-margin-desktop bg-surface-bright">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
