// src/components/Header.js
import React from 'react';
import CartButton from './CartButton';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { FiUser, FiLogOut, FiBell } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const PromotionsBanner = ({ promo }) => {
    // This component now only contains the motion.div
    // It's a cleaner pattern for AnimatePresence.
    return (
        <motion.div
            key="promo-banner" // A key helps AnimatePresence track the element
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: '100px', opacity: 1 }} // Animate to a fixed max-height
            exit={{ maxHeight: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 flex items-center justify-center gap-4 overflow-hidden" // CRITICAL: overflow-hidden is added
        >
            <FiBell className="text-green-500 flex-shrink-0" size={20} />
            <div className="text-center">
                <p className="font-semibold text-sm md:text-base">{promo.title}</p>
                {promo.description && (
                    <p className="text-xs md:text-sm text-green-600">{promo.description}</p>
                )}
            </div>
        </motion.div>
    );
};

export default function Header({ onCartClick, onProfileClick, activeBanner }) {
  const { currentUser } = useAuth();
  
  return (
    // The header remains the single sticky container for the banner and the nav bar
    // FIX: Removed `bg-white` from this outer container.
    <header className="sticky top-0 z-40 bg-white">
      <AnimatePresence>
          {/* Only render the banner if activeBanner exists */}
          {activeBanner ? <PromotionsBanner promo={activeBanner} /> : null}
      </AnimatePresence>
      
      {/* Main navigation bar */}
      <div className="shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl" role="img" aria-label="pizza">🍕</span>
            <h1 className="text-xl font-extrabold text-secondary tracking-tighter">
              Pizza Farmhouse
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <CartButton onClick={onCartClick} />
            {currentUser && (
              <>
                <button onClick={onProfileClick} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary">
                  <FiUser /> My Profile
                </button>
                <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-800">
                  <FiLogOut /> Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}