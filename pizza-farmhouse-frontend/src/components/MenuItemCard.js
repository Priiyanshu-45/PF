import React, { useState, useRef, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { FiPlus, FiMinus, FiShoppingCart, FiHeart, FiInfo, FiX } from 'react-icons/fi';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const LazyImage = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`${className} bg-gray-700 relative overflow-hidden rounded-lg`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse bg-gray-600 w-full h-full rounded-lg" />
        </div>
      )}
      
      <img
        src={src || '/placeholder-food.jpg'}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <span className="text-4xl">🍕</span>
        </div>
      )}
    </div>
  );
};

const DescriptionModal = ({ isOpen, onClose, item }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 border border-gray-600 rounded-lg max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-gray-200">{item.name}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 p-1"
            >
              <FiX size={20} />
            </button>
          </div>
          <p className="text-gray-300 leading-relaxed">{item.description}</p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Get available addons based on item category from menu data
const getAvailableAddons = (category, allMenuData) => {
  const categoryName = category?.category?.toLowerCase() || '';
  
  // Find addon categories
  const addonCategories = allMenuData?.filter(cat => {
    const catName = cat.category?.toLowerCase() || '';
    return catName.includes('addon') || 
           catName.includes('add-on') || 
           catName.includes('extra cheese') ||
           catName.includes('topping') ||
           catName === 'addons' ||
           catName === 'extra cheese_add-ons' ||
           catName === 'pizza topping';
  }) || [];

  let availableAddons = [];

  if (categoryName.includes('pizza')) {
    // For pizza, get all pizza-related addons but separate crust types
    const crustTypes = [];
    const toppings = [];
    
    addonCategories.forEach(cat => {
      if (cat.items) {
        cat.items.forEach(item => {
          if (item.name) {
            const itemName = item.name.toLowerCase();
            if (itemName.includes('crust') || itemName.includes('thin') || itemName.includes('thick')) {
              crustTypes.push({
                name: item.name,
                price: item.price || 0,
                type: 'crust'
              });
            } else {
              toppings.push({
                name: item.name,
                price: item.price || 50,
                type: 'topping'
              });
            }
          }
        });
      }
    });
    
    availableAddons = [...crustTypes, ...toppings];
  } else if (categoryName.includes('burger')) {
    // For burgers, get cheese addons
    addonCategories.forEach(cat => {
      if (cat.items) {
        cat.items.forEach(item => {
          if (item.name && item.name.toLowerCase().includes('cheese')) {
            availableAddons.push({
              name: item.name,
              price: item.price || 20,
              type: 'topping'
            });
          }
        });
      }
    });
  }

  return availableAddons;
};

function MenuItemCard({ item, category, allMenuData }) {
  const { dispatch } = useCart();
  const [selectedSize, setSelectedSize] = useState(
    item.sizes ? Object.keys(item.sizes)[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedCrust, setSelectedCrust] = useState(null); // For single crust selection
  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  
  const hasSizes = item.sizes && Object.keys(item.sizes).length > 0;
  const unitPrice = hasSizes ? item.sizes[selectedSize] : item.price;
  const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const crustPrice = selectedCrust ? selectedCrust.price : 0;
  const totalPrice = (unitPrice + addonsPrice + crustPrice) * quantity;

  const availableAddons = getAvailableAddons(category, allMenuData);
  const crustOptions = availableAddons.filter(addon => addon.type === 'crust');
  const toppingOptions = availableAddons.filter(addon => addon.type === 'topping');

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const handleAddonToggle = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.name === addon.name);
      if (exists) {
        return prev.filter(a => a.name !== addon.name);
      } else {
        return [...prev, addon];
      }
    });
  };

  const handleCrustChange = (crust) => {
    setSelectedCrust(crust);
  };

  const handleAddToCart = useCallback(() => {
    if (hasSizes && !selectedSize) {
      toast.error("Please select a size.");
      return;
    }

    const cartItem = {
      ...item,
      size: selectedSize,
      price: unitPrice,
      qty: quantity,
      addons: selectedAddons,
      crust: selectedCrust,
      totalPrice: totalPrice
    };
    
    dispatch({ type: "ADD_ITEM", item: cartItem });
    toast.success(`${quantity}x ${item.name} added to cart!`);
    setQuantity(1);
    setSelectedAddons([]);
    setSelectedCrust(null);
  }, [item, selectedSize, unitPrice, quantity, selectedAddons, selectedCrust, totalPrice, dispatch, hasSizes]);

  const handleQuickAdd = useCallback(() => {
    const quickItem = {
      ...item,
      size: hasSizes ? Object.keys(item.sizes)[0] : null,
      price: hasSizes ? item.sizes[Object.keys(item.sizes)] : item.price,
      qty: 1,
      addons: [],
      crust: null,
      totalPrice: hasSizes ? item.sizes[Object.keys(item.sizes)] : item.price
    };
    
    dispatch({ type: "ADD_ITEM", item: quickItem });
    toast.success(`${item.name} added to cart!`);
  }, [item, dispatch, hasSizes]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={cardVariants}
      className="w-full"
    >
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
        {/* Mobile-first layout */}
        <div className="flex sm:flex-col">
          {/* Image Section */}
          <div className="relative w-24 h-24 sm:w-full sm:h-48 flex-shrink-0">
            <LazyImage
              src={item.image}
              alt={item.name}
              className="w-full h-full"
            />
            
            {/* Favorite Button */}
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur rounded-full shadow-sm hover:bg-black/70 transition-colors"
            >
              <FiHeart
                size={14}
                className={`${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-300'}`}
              />
            </button>

            {/* Quick Add Button - Desktop Only */}
            <button
              onClick={handleQuickAdd}
              className="hidden sm:flex absolute bottom-2 right-2 p-2 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors items-center justify-center"
            >
              <FiPlus size={16} />
            </button>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 sm:p-5">
            {/* Title and Price Row */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-200 text-sm sm:text-lg leading-tight">
                  {item.name}
                </h3>
                <div className="mt-1">
                  <p className="text-xl sm:text-2xl font-bold text-orange-400">
                    ₹{totalPrice}
                  </p>
                  {(quantity > 1 || selectedAddons.length > 0 || selectedCrust) && (
                    <p className="text-xs text-gray-400">
                      ₹{unitPrice} base 
                      {selectedAddons.length > 0 && ` + ₹${addonsPrice} toppings`}
                      {selectedCrust && ` + ₹${crustPrice} crust`}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Description Button */}
              {item.description && (
                <button
                  onClick={() => setShowDescription(true)}
                  className="ml-2 p-1.5 text-gray-400 hover:text-gray-200 rounded-full hover:bg-gray-700"
                >
                  <FiInfo size={16} />
                </button>
              )}
            </div>

            {/* Description Preview */}
            {item.description && (
              <p className="text-xs sm:text-sm text-gray-400 mb-4 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Size Selection */}
            {hasSizes && (
              <div className="mb-4">
                <p className="text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Select Size:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(item.sizes).map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg border-2 transition-colors font-medium ${
                        selectedSize === size
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Crust Selection - Radio buttons for single selection */}
            {crustOptions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Select Crust:
                </p>
                <div className="space-y-2">
                  {crustOptions.map(crust => (
                    <label key={crust.name} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="crust"
                        checked={selectedCrust?.name === crust.name}
                        onChange={() => handleCrustChange(crust)}
                        className="text-orange-500 bg-gray-700 border-gray-600 focus:ring-orange-500"
                      />
                      <span className="text-xs text-gray-300">
                        {crust.name} {crust.price > 0 && `(+₹${crust.price})`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Toppings - Checkboxes for multiple selection */}
            {toppingOptions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Add Toppings:
                </p>
                <div className="space-y-2">
                  {toppingOptions.map(topping => (
                    <label key={topping.name} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedAddons.some(a => a.name === topping.name)}
                        onChange={() => handleAddonToggle(topping)}
                        className="rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-xs text-gray-300">
                        {topping.name} (+₹{topping.price})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Add Button */}
            <div className="flex items-center justify-between sm:flex-col sm:items-stretch sm:space-y-3">
              {/* Quantity Selector */}
              <div className="flex items-center border border-gray-600 bg-gray-700 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-600 transition-colors text-gray-300"
                >
                  <FiMinus size={16} />
                </button>
                <span className="px-3 py-2 font-medium min-w-[3rem] text-center text-gray-200">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-gray-600 transition-colors text-gray-300"
                >
                  <FiPlus size={16} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className="flex items-center justify-center px-4 py-2.5 sm:px-6 sm:py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm sm:text-base ml-2 sm:ml-0"
              >
                <FiShoppingCart size={16} className="mr-2" />
                <span className="hidden sm:inline">Add to Cart</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Description Modal */}
      <DescriptionModal
        isOpen={showDescription}
        onClose={() => setShowDescription(false)}
        item={item}
      />
    </motion.div>
  );
}

export default React.memo(MenuItemCard);
