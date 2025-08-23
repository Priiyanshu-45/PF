// src/components/CartModal.js
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
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-200">
            Order #{order.orderNumber || (order.id ? order.id.substring(0, 8) : 'N/A')}
          </h4>
          <p className="text-sm text-gray-400">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatus status={order.status || 'Order Placed'} />
      </div>
      
      <div className="space-y-1 mb-3">
        {(order.items || []).map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-300">{item.qty || 1}x {item.name || 'Unknown'}</span>
            <span className="font-medium text-gray-200">
              ₹{item.totalItemPrice || ((item.price || 0) * (item.qty || 1))}
            </span>
          </div>
        ))}
      </div>
      
      <div className="border-t border-gray-600 pt-3">
        <div className="flex justify-between font-bold text-gray-200">
          <span>Total:</span>
          <span>₹{order.totalPrice || 0}</span>
        </div>
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

export default function CartModal({ isOpen, onClose, onLoginClick, isStoreOpen }) {
  const { cart, dispatch } = useCart();
  const { isGuest, currentUser } = useAuth();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('cart');
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const cartTotal = (cart || []).reduce((sum, item) => {
    const itemTotal = item.totalPrice || (item.price * item.qty);
    const addonsTotal = (item.addons || []).reduce((addonSum, addon) => addonSum + addon.price, 0) * item.qty;
    const crustTotal = item.crust ? item.crust.price * item.qty : 0;
    return sum + itemTotal + addonsTotal + crustTotal;
  }, 0);

  // Enhanced real-time listener with better error handling and efficiency
  useEffect(() => {
    // Only fetch orders if the user is logged in and the modal is open
    if (!isOpen || !currentUser || isGuest) {
      setUserOrders([]);
      setOrdersLoading(false);
      return;
    }

    // Only set up listener when orders tab is active or when checking out for efficiency
    if (activeTab !== 'orders' && !isCheckingOut) {
      return;
    }

    setOrdersLoading(true);
    
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserOrders(orders);
        setOrdersLoading(false);
      }, 
      (error) => {
        console.error("Error fetching user orders:", error);
        toast.error("Could not fetch your orders.");
        setOrdersLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [isOpen, currentUser, isGuest, activeTab, isCheckingOut]);

  const handleProceedToCheckout = () => {
    if (isGuest) {
      onClose();
      onLoginClick();
    } else {
      setIsCheckingOut(true);
    }
  };

  const handleRemoveItem = (index) => dispatch({ type: "REMOVE_ITEM", index });
  
  const handleOrderPlaced = () => { 
    setIsCheckingOut(false); 
    setActiveTab('orders');
    // Don't show toast here as Checkout component already shows it
  };
  
  const handleClose = () => { 
    setIsCheckingOut(false); 
    setActiveTab('cart');
    onClose(); 
  };

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
                {item.size && <p className="text-sm text-gray-400">Size: {item.size}</p>}
                {item.crust && <p className="text-sm text-gray-400">Crust: {item.crust.name}</p>}
                {item.addons && item.addons.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Extras: {item.addons.map(addon => addon.name).join(', ')}
                  </div>
                )}
                <p className="text-sm text-gray-400">Qty: {item.qty}</p>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-orange-400">
                  ₹{(item.totalPrice || (item.price * item.qty)).toFixed(2)}
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
          <FiLoader className="animate-spin text-orange-500 mx-auto" size={32} />
          <p className="mt-4 text-gray-400">Loading your orders...</p>
        </div>
      );
    }
    
    if (userOrders.length === 0) {
      return (
        <div className="text-center py-12">
          <FiBox size={48} className="mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-200">No orders found</h3>
          <p className="text-gray-400">Your live orders will appear here.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {userOrders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-800 border border-gray-600 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600 flex-shrink-0">
              {isCheckingOut && (
                <button 
                  onClick={() => setIsCheckingOut(false)} 
                  className="text-gray-400 hover:text-gray-200 mr-4"
                >
                  <FiArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-xl font-bold text-gray-200 flex-grow">
                {isCheckingOut ? 'Complete Your Order' : 'Your Cart & Orders'}
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
              <div className="border-b border-gray-600 flex-shrink-0">
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
            <div className="p-6 overflow-y-auto flex-grow">
              {isCheckingOut ? (
                <Checkout onOrderPlaced={handleOrderPlaced} />
              ) : (
                activeTab === 'cart' ? renderCartContent() : renderOrdersContent()
              )}
            </div>
            
            {/* Footer */}
            {!isCheckingOut && activeTab === 'cart' && (cart || []).length > 0 && (
              <div className="border-t border-gray-600 p-6 flex-shrink-0">
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
  );
}
