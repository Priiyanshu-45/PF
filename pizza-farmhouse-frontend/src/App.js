// src/App.js - FINAL PRODUCTION VERSION
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';

// Import components
import Menu from './components/Menu';
import CartModal from './components/CartModal';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import LoginPopup from './components/LoginPopup';
import UserProfile from './components/UserProfile';
import AdminLogin from './components/AdminLogin';
import OrderTracking from './components/OrderTracking';

function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-2"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
}

const PromotionsPopup = ({ promotion, storeStatus, onClose }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    if (!storeStatus?.open) {
      setIsPopupOpen(true);
      return;
    }

    const promoSeenInSession = sessionStorage.getItem('promoSeen');
    if (promotion?.enabled && !promoSeenInSession) {
      const timer = setTimeout(() => setIsPopupOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [promotion, storeStatus]);

  const handleClose = () => {
    setIsPopupOpen(false);
    if (promotion?.enabled && storeStatus?.open) {
      sessionStorage.setItem('promoSeen', 'true');
      onClose(promotion);
    }
  };
  
  if (!isPopupOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 border border-gray-600 rounded-lg max-w-md w-full p-6 relative"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
        
        {!storeStatus.open ? (
          <>
            <h3 className="text-xl font-bold text-red-400 mb-4">🏪 Store Closed</h3>
            <p className="text-gray-300 leading-relaxed">
              {storeStatus.message || "We're currently not accepting orders. Please check back later!"}
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-orange-400 mb-4">🎉 Special Offer!</h3>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-200">{promotion.title}</h4>
              {promotion.description && (
                <p className="text-gray-300 leading-relaxed">{promotion.description}</p>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

function CustomerApp() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [promotionsData, setPromotionsData] = useState({ 
    promotion: null, 
    storeStatus: { open: true } 
  });
  const [activeBanner, setActiveBanner] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [hasShownWelcomePopup, setHasShownWelcomePopup] = useState(false);
  
  const { currentUser, userProfile, isGuest } = useAuth();

  // Show login popup on page refresh/visit
  useEffect(() => {
    const popupDismissed = sessionStorage.getItem('loginPopupDismissed');
    
    if (isGuest && !popupDismissed && !hasShownWelcomePopup) {
      const timer = setTimeout(() => {
        setShowLoginPopup(true);
        setHasShownWelcomePopup(true);
      }, 3000); // Show after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isGuest, hasShownWelcomePopup]);

  // Load promotions
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "promotions", "main"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPromotionsData(data);
        
        const promoSeenInSession = sessionStorage.getItem('promoSeen');
        if(data.promotion?.enabled && promoSeenInSession) {
          setActiveBanner(data.promotion);
        }
      }
    }, (error) => {
      console.error('Error loading promotions:', error);
    });
    return () => unsub();
  }, []);

  const handlePopupClose = (promo) => {
    setActiveBanner(promo);
  };

  const handleCategoryClick = (categoryId) => {
    // Smooth scroll to category
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const headerHeight = 140;
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleLoginSuccess = (userData) => {
    toast.success(`Welcome ${userData.name}! 🎉`);
    setShowLoginPopup(false);
    sessionStorage.removeItem('loginPopupDismissed');
  };

  const handleDismissLoginPopup = () => {
    setShowLoginPopup(false);
    sessionStorage.setItem('loginPopupDismissed', 'true');
  };

  const handleTrackingClick = () => {
    if (isGuest) {
      toast.info('Please login to track your orders');
      setShowLoginPopup(true);
    } else {
      setIsTrackingOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <PromotionsPopup 
        promotion={promotionsData.promotion} 
        storeStatus={promotionsData.storeStatus} 
        onClose={handlePopupClose} 
      />
      
      <Header
        onCartClick={() => setIsCartOpen(true)}
        onProfileClick={() => {
          if (isGuest) {
            setShowLoginPopup(true);
          } else {
            setIsProfileOpen(true);
          }
        }}
        onTrackingClick={handleTrackingClick}
        activeBanner={activeBanner}
        categories={categories}
        onCategoryClick={handleCategoryClick}
      />
      
      <Menu 
        onCategoriesLoad={setCategories}
      />
      
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onLoginClick={() => {
          setIsCartOpen(false);
          setShowLoginPopup(true);
        }}
        isStoreOpen={promotionsData.storeStatus?.open}
      />

      <LoginPopup
        isOpen={showLoginPopup}
        onClose={handleDismissLoginPopup}
        onLogin={handleLoginSuccess}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {isProfileOpen && (
        <UserProfile
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Enhanced Order Tracking Modal */}
      <OrderTracking
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
      />

      {/* Enhanced Toast Configuration */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#374151',
            color: '#f3f4f6',
            border: '1px solid #6b7280',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            style: {
              background: '#065f46',
              color: '#d1fae5',
              border: '1px solid #059669',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#d1fae5',
            },
          },
          error: {
            style: {
              background: '#7f1d1d',
              color: '#fecaca',
              border: '1px solid #dc2626',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fecaca',
            },
          },
          loading: {
            style: {
              background: '#1f2937',
              color: '#f3f4f6',
              border: '1px solid #374151',
            },
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App bg-gray-900 min-h-screen">
            <Routes>
              <Route path="/" element={<CustomerApp />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
