import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import CountUp from "react-countup";
import { FiX, FiTrash2, FiArrowLeft, FiShoppingBag, FiBox, FiClock, FiTruck, FiCheckCircle, FiLoader, FiPlus } from "react-icons/fi";
import Checkout from "./Checkout";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

const OrderStatus = ({ status }) => {
  const statusColors = {
    'Order Placed': { icon: FiClock, bgColor: 'bg-blue-600 text-blue-100' },
    'Preparing': { icon: FiLoader, bgColor: 'bg-yellow-600 text-yellow-100' },
    'Out for Delivery': { icon: FiTruck, bgColor: 'bg-orange-600 text-orange-100' },
    'Delivered': { icon: FiCheckCircle, bgColor: 'bg-green-600 text-green-100' },
  };
  const config = statusColors[status] || statusColors['Order Placed'];
  const StatusIcon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor}`}>
      <StatusIcon size={16} className="mr-1" />
      {status}
    </span>
  );
};

const OrderCard = ({ order }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    // Handle Firestore timestamp
    if (date.toDate) {
      return date.toDate().toLocaleString();
    }
    
    // Handle regular date
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    
    // Handle date string
    return new Date(date).toLocaleString();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-200">
            Order #{order.id ? order.id.substring(0, 8) : 'N/A'}
          </h4>
          <p className="text-sm text-gray-400">
            {formatDate(order.createdAt)}
          </p>
          {order.userDetails?.customMessage && (
            <p className="text-xs text-orange-400 mt-1">
              📝 {order.userDetails.customMessage}
            </p>
          )}
        </div>
        <OrderStatus status={order.status || 'Order Placed'} />
      </div>
      
      <div className="space-y-1 mb-3">
        {(order.items || []).map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-300">
              {item.qty || 1}x {item.name || 'Unknown Item'} {item.size ? `(${item.size})` : ''}
              {item.crust && ` - ${item.crust.name}`}
              {item.addons && item.addons.length > 0 && (
                <span className="text-gray-400 block text-xs">
                  + {item.addons.map(addon => addon.name).join(', ')}
                </span>
              )}
            </span>
            <span className="font-medium text-gray-200">
              ₹{(item.price || 0) * (item.qty || 1)}
            </span>
          </div>
        ))}
      </div>
      
      <div className="border-t border-gray-600 pt-3">
        <div className="flex justify-between font-bold text-gray-200">
          <span>Total:</span>
          <span>₹{order.totalPrice || 0}</span>
        </div>
        
        {/* Real-time status indicator */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">
            Last updated: {formatDate(order.updatedAt || order.createdAt)}
          </span>
          <span className="text-xs text-green-400">● Live</span>
        </div>
      </div>
    </div>
  );
};

// Get all drinks from menu data
const getAllDrinks = (menuData) => {
  const drinkCategories = menuData?.filter(cat => 
    cat.category?.toLowerCase().includes('drink') || 
    cat.category?.toLowerCase().includes('beverage')
  ) || [];
  
  let allDrinks = [];
  
  drinkCategories.forEach(cat => {
    if (cat.items) {
      cat.items.forEach(item => {
        if (item.available !== false) {
          allDrinks.push({
            id: item.id || item.name,
            name: item.name,
            price: item.price,
            image: item.image || '🥤'
          });
        }
      });
    }
  });
  
  // If no drinks category found, add default drinks
  if (allDrinks.length === 0) {
    allDrinks = [
      { id: 'cold-drink', name: 'Cold Drink', price: 30, image: '🥤' },
      { id: 'virgin-mojito', name: 'Virgin Mojito', price: 100, image: '🍃' },
      { id: 'lassi', name: 'Fresh Lassi', price: 80, image: '🥛' },
      { id: 'lemonade', name: 'Fresh Lemonade', price: 60, image: '🍋' },
      { id: 'mango-shake', name: 'Mango Shake', price: 120, image: '🥭' },
      { id: 'chocolate-shake', name: 'Chocolate Shake', price: 120, image: '🍫' }
    ];
  }
  
  return allDrinks;
};

const DrinksUpsellModal = ({ isOpen, onClose, onAddDrink, allDrinks, onProceedWithoutDrinks }) => {
  const [selectedDrinks, setSelectedDrinks] = useState([]);

  const handleDrinkToggle = (drink) => {
    setSelectedDrinks(prev => {
      const exists = prev.find(d => d.id === drink.id);
      if (exists) {
        return prev.filter(d => d.id !== drink.id);
      } else {
        return [...prev, { ...drink, qty: 1 }];
      }
    });
  };

  const handleAddSelectedDrinks = () => {
    selectedDrinks.forEach(drink => onAddDrink(drink));
    setSelectedDrinks([]);
  };

  const handleClose = () => {
    setSelectedDrinks([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 border border-gray-600 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-600">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-200 mb-2">🥤 Add Refreshing Drinks?</h3>
                  <p className="text-gray-400 text-sm">Perfect combo with your order! Select as many as you want.</p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allDrinks.map(drink => (
                  <label
                    key={drink.id}
                    className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${
                      selectedDrinks.some(d => d.id === drink.id)
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDrinks.some(d => d.id === drink.id)}
                      onChange={() => handleDrinkToggle(drink)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-1">{drink.image}</div>
                      <div className="text-sm font-medium text-gray-200">{drink.name}</div>
                      <div className="text-orange-400 font-bold">₹{drink.price}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-600">
              <div className="flex space-x-3">
                <button
                  onClick={onProceedWithoutDrinks}
                  className="flex-1 bg-gray-700 text-gray-300 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Skip Drinks
                </button>
                {selectedDrinks.length > 0 && (
                  <button
                    onClick={handleAddSelectedDrinks}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Add {selectedDrinks.length} Drink{selectedDrinks.length > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function CartModal({ isOpen, onClose, onLoginClick, isStoreOpen }) {
  const { cart, dispatch } = useCart();
  const { isGuest, currentUser } = useAuth();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('cart');
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showDrinksUpsell, setShowDrinksUpsell] = useState(false);
  const [menuData, setMenuData] = useState([]);

  const cartTotal = (cart || []).reduce((sum, item) => {
    const itemTotal = item.totalPrice || (item.price * item.qty);
    const addonsTotal = (item.addons || []).reduce((addonSum, addon) => addonSum + addon.price, 0) * item.qty;
    return sum + itemTotal + addonsTotal;
  }, 0);

  // Load menu data for drinks
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "menu"), (snapshot) => {
      const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenuData(categories);
    });
    return () => unsubscribe();
  }, []);

  // FIXED: Real-time listener for user's orders with proper error handling
  useEffect(() => {
    if (currentUser && !isGuest) {
      console.log('Setting up real-time listener for user:', currentUser.uid);
      setOrdersLoading(true);
      
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('Orders snapshot received, docs:', snapshot.docs.length);
          
          const orders = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            const order = {
              id: doc.id,
              ...data,
              // Ensure proper date handling
              createdAt: data.createdAt || new Date(),
              updatedAt: data.updatedAt || new Date()
            };
            orders.push(order);
            console.log('Order processed:', order.id, order.status);
          });
          
          setUserOrders(orders);
          setOrdersLoading(false);
          
          console.log('Total orders set:', orders.length);
        }, 
        (error) => {
          console.error("Error fetching user orders:", error);
          toast.error("Could not fetch your orders. Please refresh.");
          setOrdersLoading(false);
        }
      );
      
      return () => {
        console.log('Cleaning up orders listener');
        unsubscribe();
      };
    } else {
      console.log('User not logged in, clearing orders');
      setUserOrders([]);
      setOrdersLoading(false);
    }
  }, [currentUser, isGuest]);

  const handleProceedToCheckout = () => {
    if (isGuest) {
      onClose();
      onLoginClick();
    } else {
      // Check if user has drinks in cart
      const hasDrinks = cart.some(item => 
        item.name.toLowerCase().includes('drink') || 
        item.name.toLowerCase().includes('mojito') || 
        item.name.toLowerCase().includes('lassi') ||
        item.name.toLowerCase().includes('lemonade') ||
        item.name.toLowerCase().includes('shake') ||
        item.name.toLowerCase().includes('coffee')
      );
      
      if (!hasDrinks && cart.length > 0) {
        setShowDrinksUpsell(true);
      } else {
        setIsCheckingOut(true);
      }
    }
  };

  const handleAddDrink = (drink) => {
    const drinkItem = {
      id: drink.id,
      name: drink.name,
      price: drink.price,
      qty: drink.qty || 1,
      image: drink.image,
      totalPrice: drink.price * (drink.qty || 1)
    };
    
    dispatch({ type: "ADD_ITEM", item: drinkItem });
    toast.success(`${drink.name} added to cart!`);
  };

  const handleProceedWithoutDrinks = () => {
    setShowDrinksUpsell(false);
    setIsCheckingOut(true);
  };

  const handleRemoveItem = (index) => dispatch({ type: "REMOVE_ITEM", index });
  
  const handleOrderPlaced = () => { 
    setIsCheckingOut(false); 
    setActiveTab('orders'); // Switch to orders tab to show the new order
    toast.success('🎉 Order placed! Track it in the Orders tab.');
  };
  
  const handleClose = () => { setIsCheckingOut(false); onClose(); setActiveTab('cart'); };

  const renderCartContent = () => {
    if ((cart || []).length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛍️</div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">Your cart is empty!</h3>
          <p className="text-gray-400">Add some delicious items to get started</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {(cart || []).map((item, index) => (
          <div key={index} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-200">{item.name}</h4>
                {item.size && <p className="text-sm text-gray-400">{item.size}</p>}
                {item.addons && item.addons.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Extras: {item.addons.map(addon => addon.name).join(', ')}
                  </div>
                )}
                <p className="text-sm text-gray-400">Qty: {item.qty}</p>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-orange-400">
                  ₹{item.totalPrice || (item.price * item.qty)}
                </p>
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="mt-2 text-red-400 hover:text-red-300 p-1"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderOrdersContent = () => {
    if (isGuest) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">Login Required</h3>
          <p className="text-gray-400">Log in to track your orders in real-time.</p>
          <button
            onClick={() => {
              onClose();
              onLoginClick();
            }}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Login Now
          </button>
        </div>
      );
    }
    
    if (ordersLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your orders...</p>
        </div>
      );
    }
    
    if (userOrders.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">No orders yet</h3>
          <p className="text-gray-400">Your orders will appear here for real-time tracking</p>
          <p className="text-xs text-gray-500 mt-2">🔄 Updates automatically</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-400">
            {userOrders.length} order{userOrders.length !== 1 ? 's' : ''} found
          </p>
          <span className="text-xs text-green-400 flex items-center">
            ● Live updates
          </span>
        </div>
        
        {userOrders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    );
  };

  const allDrinks = getAllDrinks(menuData);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 border border-gray-600 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-600">
                {isCheckingOut && (
                  <button
                    onClick={() => setIsCheckingOut(false)}
                    className="text-gray-400 hover:text-gray-200 mr-4"
                  >
                    <FiArrowLeft size={20} />
                  </button>
                )}
                
                <h2 className="text-xl font-bold text-gray-200">
                  {isCheckingOut ? 'Complete Your Order' : 'Your Cart'}
                </h2>
                
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Tabs */}
              {!isCheckingOut && (
                <div className="border-b border-gray-600">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('cart')}
                      className={`flex-1 py-3 text-sm font-medium ${
                        activeTab === 'cart'
                          ? 'text-orange-400 border-b-2 border-orange-400'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Cart ({(cart || []).length})
                    </button>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={`flex-1 py-3 text-sm font-medium ${
                        activeTab === 'orders'
                          ? 'text-orange-400 border-b-2 border-orange-400'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Track Orders ({userOrders.length})
                    </button>
                  </div>
                </div>
              )}
              
              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {isCheckingOut ? (
                  <Checkout onOrderPlaced={handleOrderPlaced} />
                ) : (
                  activeTab === 'cart' ? renderCartContent() : renderOrdersContent()
                )}
              </div>
              
              {/* Footer */}
              {!isCheckingOut && activeTab === 'cart' && (cart || []).length > 0 && (
                <div className="border-t border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium text-gray-200">Total:</span>
                    <span className="text-2xl font-bold text-orange-400">
                      ₹<CountUp end={cartTotal} duration={0.5} />
                    </span>
                  </div>
                  
                  <button
                    onClick={handleProceedToCheckout}
                    disabled={!isStoreOpen}
                    className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {!isStoreOpen ? 'Store Closed' : isGuest ? 'Login to Order' : 'Proceed to Checkout'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DrinksUpsellModal
        isOpen={showDrinksUpsell}
        onClose={() => setShowDrinksUpsell(false)}
        onAddDrink={handleAddDrink}
        allDrinks={allDrinks}
        onProceedWithoutDrinks={handleProceedWithoutDrinks}
      />
    </>
  );
}
