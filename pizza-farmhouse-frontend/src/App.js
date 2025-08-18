// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiBell } from 'react-icons/fi';

// Import all your components
import Menu from './components/Menu';
import CartModal from './components/CartModal';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import UserProfile from './components/UserProfile';
import AdminLogin from './components/AdminLogin';
import StarBorder from './components/StarBorder';

function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Authenticating...</p></div>;
  }
  return isAdmin ? children : <Navigate to="/admin" />;
}

// REFACTORED: PromotionsPopup to handle a single promotion object
const PromotionsPopup = ({ promotion, storeStatus, onClose }) => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    useEffect(() => {
        // If the store is closed, always show the popup.
        if (!storeStatus?.open) {
            setIsPopupOpen(true);
            return;
        }

        // Check if the promotion is enabled and hasn't been seen in this session.
        const promoSeenInSession = sessionStorage.getItem('promoSeen');
        if (promotion?.enabled && !promoSeenInSession) {
            setIsPopupOpen(true);
        }
    }, [promotion, storeStatus]);

    const handleClose = () => {
        setIsPopupOpen(false);
        // If it was a promotion popup (not a store closed message), mark it as seen.
        if (promotion?.enabled && storeStatus?.open) {
            sessionStorage.setItem('promoSeen', 'true');
            onClose(promotion); // Pass the promotion to the parent to set as a banner.
        }
    };
    
    if (!isPopupOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md relative"
                >
                    <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200"><FiX size={24} /></button>
                    {!storeStatus.open ? (
                        <>
                            <h2 className="text-3xl font-bold text-primary mb-2">Store Closed</h2>
                            <p className="text-gray-600 text-lg">{storeStatus.message || "We're currently not accepting orders. Please check back later!"}</p>
                        </>
                    ) : (
                        <StarBorder as={motion.div} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="rounded-xl" color="#F97316" speed="5s">
                            <div className="p-6">
                                <div className="flex justify-center items-center gap-2 mb-2">
                                    <FiBell className="text-primary" size={28} />
                                    <h2 className="text-3xl font-bold text-secondary">Special Offer!</h2>
                                </div>
                                {/* CHANGED: Display title and description from the single promotion object */}
                                <p className="text-gray-700 text-lg font-semibold">{promotion.title}</p>
                                {promotion.description && (
                                    <p className="text-gray-500 text-sm mt-2">{promotion.description}</p>
                                )}
                            </div>
                        </StarBorder>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};


function CustomerApp() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // CHANGED: State to hold the new promotions data structure
  const [promotionsData, setPromotionsData] = useState({ promotion: null, storeStatus: { open: true } });
  const [activeBanner, setActiveBanner] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "promotions", "main"), (doc) => {
      if (doc.exists()) {
          const data = doc.data();
          setPromotionsData(data);
          
          // Logic to show banner on page reload if the pop-up was already seen
          const promoSeenInSession = sessionStorage.getItem('promoSeen');
          if(data.promotion?.enabled && promoSeenInSession) {
            setActiveBanner(data.promotion);
          }
      }
    });
    return () => unsub();
  }, []);

  const handlePopupClose = (promo) => {
      setActiveBanner(promo);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* CHANGED: Pass props according to the new component signature */}
      <PromotionsPopup 
        promotion={promotionsData.promotion}
        storeStatus={promotionsData.storeStatus}
        onClose={handlePopupClose} 
      />
      <Header onCartClick={() => setIsCartOpen(true)} onProfileClick={() => setIsProfileOpen(true)} activeBanner={activeBanner} />
      <main className="container mx-auto p-4 md:p-8">
        <Menu />
      </main>
      <CartModal 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onLoginClick={() => setIsLoginModalOpen(true)}
        isStoreOpen={promotionsData.storeStatus?.open}
      />
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
      <UserProfile 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
        <Router>
          <Routes>
            <Route path="/*" element={<CustomerApp />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
            />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;