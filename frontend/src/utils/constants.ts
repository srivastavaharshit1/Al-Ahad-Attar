export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

export const APP_NAME = 'Al Ahad Attars';

export const ROUTES = {
  HOME: '/',
  COLLECTION: '/collection',
  ATTARS: '/attars',
  BAKHOOR: '/bakhoor',
  PRODUCT: '/product',
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
