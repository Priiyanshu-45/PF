import React, { useState } from 'react';
import { FiMenu, FiX, FiShoppingCart, FiUser, FiBell, FiMapPin } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const PromotionsBanner = ({ promo }) => {
  if (!promo) return null;
  
  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2"
    >
      <div className="container mx-auto flex items-center justify-center text-sm">
        <FiBell className="mr-2 text-base" />
        <span className="font-medium">{promo.title}</span>
        {promo.description && (
          <span className="ml-2 text-xs opacity-90 hidden sm:inline">
            - {promo.description}
          </span>
        )}
      </div>
    </motion.div>
  );
};

const CategoryNavigation = ({ categories, onCategoryClick }) => {
  if (!categories || categories.length === 0) return null;
  
  return (
    <div className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex space-x-1 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-300 hover:text-orange-400 hover:bg-gray-700 rounded-lg transition-colors min-w-fit flex-shrink-0"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const MobileMenu = ({ isOpen, onClose, onCartClick, onProfileClick, onTrackingClick, currentUser }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-80 z-40"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          className="fixed top-0 left-0 h-full w-80 bg-gray-800 border-r border-gray-700 shadow-2xl z-50 p-6"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-200">Pizza Farmhouse</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>
          
          <nav className="space-y-4">
            <button
              onClick={() => { onCartClick(); onClose(); }}
              className="w-full flex items-center p-4 rounded-lg hover:bg-gray-700 transition-colors text-gray-200"
            >
              <FiShoppingCart size={20} className="mr-3" />
              <span>My Cart</span>
            </button>
            
            {currentUser && (
              <button
                onClick={() => { onTrackingClick(); onClose(); }}
                className="w-full flex items-center p-4 rounded-lg hover:bg-gray-700 transition-colors text-gray-200"
              >
                <FiMapPin size={20} className="mr-3" />
                <span>Track My Orders</span>
              </button>
            )}
            
            <button
              onClick={() => { onProfileClick(); onClose(); }}
              className="w-full flex items-center p-4 rounded-lg hover:bg-gray-700 transition-colors text-gray-200"
            >
              <FiUser size={20} className="mr-3" />
              <span>{currentUser ? 'My Profile' : 'Login'}</span>
            </button>
            
            <a
              href="tel:+919876543210"
              className="w-full flex items-center p-4 rounded-lg hover:bg-gray-700 transition-colors text-gray-200"
            >
              <span className="mr-3">📞</span>
              <span>Call Restaurant</span>
            </a>
          </nav>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default function Header({ 
  onCartClick, 
  onProfileClick,
  onTrackingClick,
  activeBanner, 
  categories = [],
  onCategoryClick
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cart } = useCart();
  const { currentUser } = useAuth();
  
  const cartItemCount = cart?.reduce((sum, item) => sum + item.qty, 0) || 0;

  const handleCategoryClick = (categoryId) => {
    onCategoryClick(categoryId);
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

  return (
    <div className="sticky top-0 z-30 bg-gray-800 shadow-lg">
      <PromotionsBanner promo={activeBanner} />
      
      {/* Main Header */}
      <div className="bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-300"
            >
              <FiMenu size={24} />
            </button>

            {/* Logo */}
            <div className="flex-1 lg:flex-initial">
              <h1 className="text-xl lg:text-2xl font-bold text-orange-400 text-center lg:text-left">
                🍕 Pizza Farmhouse
              </h1>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              {/* Track Orders Button - Desktop Only */}
              {currentUser && (
                <button
                  onClick={onTrackingClick}
                  className="hidden lg:block p-2 rounded-lg hover:bg-gray-700 text-gray-300 relative"
                  title="Track My Orders"
                >
                  <FiMapPin size={20} />
                </button>
              )}

              {/* Cart Button with Badge */}
              <button
                onClick={onCartClick}
                className="relative p-2 rounded-lg hover:bg-gray-700 text-gray-300"
              >
                <FiShoppingCart size={24} />
                {cartItemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold min-w-[24px]"
                  >
                    {cartItemCount}
                  </motion.span>
                )}
              </button>

              {/* Profile Button - Desktop Only */}
              <button
                onClick={onProfileClick}
                className="hidden lg:block p-2 rounded-lg hover:bg-gray-700 text-gray-300"
              >
                <FiUser size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <CategoryNavigation categories={categories} onCategoryClick={handleCategoryClick} />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onCartClick={onCartClick}
        onProfileClick={onProfileClick}
        onTrackingClick={onTrackingClick}
        currentUser={currentUser}
      />
    </div>
  );
}
