export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

export const APP_NAME = 'Al Ahad Attars';

export const ROUTES = {
  HOME: '/',
  COLLECTION: '/collections',
  ATTARS: '/category/attars',
  BAKHOOR: '/category/bakhoor',
  PERFUMES: '/category/perfumes',
  PRODUCT: '/product',
  GIFT_SETS: '/gift-sets',
  CART: '/cart',
  CHECKOUT: '/checkout',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  ORDERS: '/orders',
  ABOUT: '/about',
  CONTACT: '/contact',
  OFFERS: '/offers',
  ADMIN: {
    DASHBOARD: '/admin',
    PRODUCTS: '/admin/products',
    NEW_PRODUCT: '/admin/products/new',
    ORDERS: '/admin/orders',
    CUSTOMERS: '/admin/customers'
  }
};
