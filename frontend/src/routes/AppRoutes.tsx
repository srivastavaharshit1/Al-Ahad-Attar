import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { CheckoutLayout } from '../components/layout/CheckoutLayout';
import { AdminLayout } from '../components/layout/AdminLayout';
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { PublicOnlyRoute } from '../components/auth/PublicOnlyRoute';

// Loading fallback component
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-surface-bright">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Lazy load pages
const Home = React.lazy(() => import('../pages/Home').then(m => ({ default: m.Home })));
const Collection = React.lazy(() => import('../pages/Collection').then(m => ({ default: m.Collection })));
const Product = React.lazy(() => import('../pages/Product').then(m => ({ default: m.Product })));
const Cart = React.lazy(() => import('../pages/Cart').then(m => ({ default: m.Cart })));
const Checkout = React.lazy(() => import('../pages/Checkout').then(m => ({ default: m.Checkout })));
const OrderSuccess = React.lazy(() => import('../pages/OrderSuccess').then(m => ({ default: m.OrderSuccess })));
const Login = React.lazy(() => import('../pages/Login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('../pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = React.lazy(() => import('../pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import('../pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const About = React.lazy(() => import('../pages/About').then(m => ({ default: m.About })));
const Contact = React.lazy(() => import('../pages/Contact').then(m => ({ default: m.Contact })));
const Wishlist = React.lazy(() => import('../pages/customer/Wishlist').then(m => ({ default: m.Wishlist })));
const Search = React.lazy(() => import('../pages/Search').then(m => ({ default: m.Search })));
const Offers = React.lazy(() => import('../pages/Offers').then(m => ({ default: m.Offers })));
const PrivacyPolicy = React.lazy(() => import('../pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const Terms = React.lazy(() => import('../pages/Terms').then(m => ({ default: m.Terms })));
const ReturnPolicy = React.lazy(() => import('../pages/ReturnPolicy').then(m => ({ default: m.ReturnPolicy })));

// Customer Pages
const Dashboard = React.lazy(() => import('../pages/customer/Dashboard').then(m => ({ default: m.Dashboard })));
const Profile = React.lazy(() => import('../pages/customer/Profile').then(m => ({ default: m.Profile })));
const Addresses = React.lazy(() => import('../pages/customer/Addresses').then(m => ({ default: m.Addresses })));
const Orders = React.lazy(() => import('../pages/customer/Orders').then(m => ({ default: m.Orders })));
const OrderDetails = React.lazy(() => import('../pages/customer/OrderDetails').then(m => ({ default: m.OrderDetails })));

// Admin pages
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminProducts = React.lazy(() => import('../pages/admin/Products').then(m => ({ default: m.Products })));
const AdminAddProduct = React.lazy(() => import('../pages/admin/AddProduct').then(m => ({ default: m.AddProduct })));
const AdminEditProduct = React.lazy(() => import('../pages/admin/EditProduct').then(m => ({ default: m.EditProduct })));
const AdminOrders = React.lazy(() => import('../pages/admin/Orders').then(m => ({ default: m.Orders })));
const AdminOrderDetails = React.lazy(() => import('../pages/admin/OrderDetails').then(m => ({ default: m.AdminOrderDetails })));
const AdminRefunds = React.lazy(() => import('../pages/admin/Refunds').then(m => ({ default: m.Refunds })));
const AdminCustomers = React.lazy(() => import('../pages/admin/Customers').then(m => ({ default: m.Customers })));
const AdminPromotions = React.lazy(() => import('../pages/admin/Promotions').then(m => ({ default: m.Promotions })));
const AdminCategories = React.lazy(() => import('../pages/admin/Categories').then(m => ({ default: m.Categories })));
const AdminSubCategories = React.lazy(() => import('../pages/admin/SubCategories').then(m => ({ default: m.SubCategories })));
const AdminHomepage = React.lazy(() => import('../pages/admin/Homepage').then(m => ({ default: m.Homepage })));
const AdminSettings = React.lazy(() => import('../pages/admin/Settings').then(m => ({ default: m.Settings })));
const AdminAnalytics = React.lazy(() => import('../pages/admin/Analytics').then(m => ({ default: m.Analytics })));
const AdminContactMessages = React.lazy(() => import('../pages/admin/ContactMessages').then(m => ({ default: m.ContactMessages })));
const AdminGiftServices = React.lazy(() => import('../pages/admin/GiftServices').then(m => ({ default: m.GiftServices })));
const AdminReviews = React.lazy(() => import('../pages/admin/Reviews').then(m => ({ default: m.Reviews })));
const NotFound = React.lazy(() => import('../pages/NotFound').then(m => ({ default: m.NotFound })));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="collections" element={<Collection />} />
          <Route path="collection" element={<Navigate to="/collections" replace />} />
          <Route path="category/attars" element={<Collection category="attars" />} />
          <Route path="category/bakhoor" element={<Collection category="bakhoor" />} />
          <Route path="category/perfumes" element={<Collection category="perfumes" />} />
          <Route path="product/:id" element={<Product />} />
          <Route path="cart" element={<Cart />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="search" element={<Search />} />
          <Route path="offers" element={<Offers />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-and-conditions" element={<Terms />} />
          <Route path="refund-policy" element={<ReturnPolicy />} />
          <Route path="shipping-policy" element={<ReturnPolicy />} />
          
          <Route path="*" element={<NotFound />} />
        </Route>
        
        <Route path="/account" element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetails />} />
        </Route>
        
        <Route element={<CheckoutLayout />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success/:id" element={<OrderSuccess />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
          <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminAddProduct />} />
          <Route path="products/:id/edit" element={<AdminEditProduct />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetails />} />
          <Route path="refunds" element={<AdminRefunds />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="subcategories" element={<AdminSubCategories />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="inquiries" element={<AdminContactMessages />} />
          <Route path="homepage" element={<AdminHomepage />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="gift-services" element={<AdminGiftServices />} />
          <Route path="reviews" element={<AdminReviews />} />
          {/* Reuses the customer-facing Profile component as-is: /api/profile and
              /api/profile/change-password are role-agnostic (based on the JWT's identity, not
              role), and the component has no customer-specific assumptions, so it renders fine
              inside AdminLayout without duplicating the form. */}
          <Route path="account" element={<Profile />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
