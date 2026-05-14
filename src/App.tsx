import { BrowserRouter, Routes, Route, Navigate, useOutletContext, useParams } from 'react-router-dom';
import { Website } from './pages/website/Website';
import { LandingPage } from './pages/website/LandingPage';
import { ShopPage } from './pages/website/ShopPage';
import { GiftCardsPage } from './pages/website/GiftCardsPage';
import { ProductDetails } from './pages/website/ProductDetails';
import { CustomerAuth } from './pages/website/CustomerAuth';
import { Checkout } from './pages/website/Checkout';
import { Profile } from './pages/website/Profile';
import { MyOrders } from './pages/website/MyOrders';
import { Favorites } from './pages/website/Favorites';
import { TrackOrder } from './pages/website/TrackOrder';
import { StoreSettingsProvider } from './context/StoreSettingsContext';

// Wrapper to handle shared layout and props
function WebsiteWrapper() {
  return <Website />;
}

// Helper to provide common props to sub-routes
function withProps(Component: any, extraProps = {}) {
  return function ComponentWithProps() {
    const { handleNavigate, handleOpenCart } = useOutletContext<{ 
      handleNavigate: any, 
      handleOpenCart: any 
    }>();
    const params = useParams();
    
    return (
      <Component 
        onNavigate={handleNavigate} 
        onOpenCart={handleOpenCart}
        onBack={() => handleNavigate('home')}
        onSuccess={() => handleNavigate('home')}
        onSwitchMode={(mode: string) => handleNavigate(mode)}
        productId={params.id}
        {...extraProps} 
      />
    );
  };
}

// Auth wrappers
const LoginWrapper = withProps(CustomerAuth, { mode: 'login' });
const SignupWrapper = withProps(CustomerAuth, { mode: 'signup' });
const ProductWrapper = withProps(ProductDetails);
const ShopWrapper = withProps(ShopPage);
const GiftCardsWrapper = withProps(GiftCardsPage);
const CheckoutWrapper = withProps(Checkout);
const ProfileWrapper = withProps(Profile);
const OrdersWrapper = withProps(MyOrders);
const FavoritesWrapper = withProps(Favorites);
const TrackWrapper = withProps(TrackOrder);
const LandingWrapper = withProps(LandingPage);

export default function App() {
  return (
    <StoreSettingsProvider>
      <BrowserRouter>
        <Routes>
          {/* Website Routes with Shared Layout */}
          <Route element={<WebsiteWrapper />}>
            <Route path="/" element={<LandingWrapper />} />
            <Route path="/shop" element={<ShopWrapper />} />
            <Route path="/gift-cards" element={<GiftCardsWrapper />} />
            <Route path="/product/:id" element={<ProductWrapper />} />
            <Route path="/checkout" element={<CheckoutWrapper />} />
            <Route path="/profile" element={<ProfileWrapper />} />
            <Route path="/orders" element={<OrdersWrapper />} />
            <Route path="/favorites" element={<FavoritesWrapper />} />
            <Route path="/track" element={<TrackWrapper />} />
            <Route path="/login" element={<LoginWrapper />} />
            <Route path="/signup" element={<SignupWrapper />} />
          </Route>

          {/* Catch-all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreSettingsProvider>
  );
}
