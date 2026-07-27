import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { StoreSettingsProvider } from './context/StoreSettingsContext';
import { PromotionProvider } from './context/PromotionContext';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { ScrollToTop } from './components/ui/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <StoreSettingsProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <PromotionProvider>
                <AppRoutes />
                <Toaster position="bottom-right" toastOptions={{ className: 'font-body-md text-on-surface bg-surface-container-high' }} />
              </PromotionProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </StoreSettingsProvider>
    </BrowserRouter>
  );
}

export default App;
