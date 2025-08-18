import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import CountUp from "react-countup";
import { FiX, FiTrash2, FiArrowLeft, FiShoppingBag, FiBox, FiClock, FiTruck, FiCheckCircle, FiLoader } from "react-icons/fi";
import Checkout from "./Checkout";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

// A simple component to show the order's status
const OrderStatus = ({ status }) => {
  const statusColors = {
    'Order Placed': { icon: <FiBox />, bgColor: 'bg-blue-500' },
    'Preparing': { icon: <FiClock />, bgColor: 'bg-yellow-400' },
    'Out for Delivery': { icon: <FiTruck />, bgColor: 'bg-orange-500' },
    'Delivered': { icon: <FiCheckCircle />, bgColor: 'bg-green-500' },
  };
  const config = statusColors[status] || {};
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1 ${config.bgColor}`}>
      {config.icon} {status}
    </span>
  );
};

const OrderCard = ({ order }) => (
    <motion.div key={order.id} layout initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 0.3}} className="p-4 bg-gray-100 rounded-md shadow-sm">
        <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-lg">Order #{order.id.substring(0, 5)}</p>
            <OrderStatus status={order.status} />
        </div>
        <div className="text-sm space-y-1">
            {order.items.map(item => (
                <div key={item.name} className="flex justify-between">
                    <span>{item.qty} x {item.name}</span>
                    <span>₹{item.price * item.qty}</span>
                </div>
            ))}
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t">
            <p className="font-bold text-lg">Total:</p>
            <p className="font-bold text-lg">₹{order.total}</p>
        </div>
    </motion.div>
);

export default function CartModal({ isOpen, onClose, onLoginClick, isStoreOpen }) {
  const { cart, dispatch } = useCart();
  const { isGuest, currentUser } = useAuth();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('cart'); // New state for tabs
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const cartTotal = (cart || []).reduce((sum, item) => sum + item.price * item.qty, 0);

  // Real-time listener for user's orders, moved from UserProfile
  useEffect(() => {
    if (currentUser) {
      setOrdersLoading(true);
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserOrders(orders);
        setOrdersLoading(false);
      }, (error) => {
        console.error("Error fetching user orders:", error);
        toast.error("Could not fetch your orders.");
        setOrdersLoading(false);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  const handleProceedToCheckout = () => {
    if (isGuest) {
      onClose();
      onLoginClick();
    } else {
      setIsCheckingOut(true);
    }
  };

  const handleRemoveItem = (index) => dispatch({ type: "REMOVE_ITEM", index });
  const handleOrderPlaced = () => { setIsCheckingOut(false); onClose(); };
  const handleClose = () => { setIsCheckingOut(false); onClose(); setActiveTab('cart'); };

  const renderCartContent = () => {
    if ((cart || []).length === 0) {
      return <p className="text-gray-500 py-8 text-center">Your cart is empty!</p>;
    }
    return (
      <div className="space-y-4">
        {(cart || []).map((item, index) => (
          <div key={`${item.name}-${item.size || ''}-${index}`} className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover"/>
              <div>
                <p className="font-semibold">{item.name}</p>
                {item.size && <p className="text-sm text-gray-500 capitalize">{item.size}</p>}
                <p className="text-gray-600">Qty: {item.qty}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <p className="font-bold text-lg text-secondary">₹{item.price * item.qty}</p>
              <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"><FiTrash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderOrdersContent = () => {
      if (isGuest) {
          return (
            <p className="text-gray-500 py-8 text-center">Log in to view your past orders.</p>
          );
      }
      if (ordersLoading) {
          return <div className="flex justify-center items-center h-full"><FiLoader className="animate-spin text-primary" size={32} /></div>;
      }
      if (userOrders.length === 0) {
          return (
              <p className="text-gray-500 py-8 text-center">You have no orders yet.</p>
          );
      }
      return (
          <div className="space-y-4">
              {userOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
      );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col"
          >
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center gap-4">
                {isCheckingOut && (
                  <button onClick={() => setIsCheckingOut(false)} className="p-2 rounded-full hover:bg-gray-200"><FiArrowLeft size={24} /></button>
                )}
                <h2 className="text-2xl font-bold text-secondary">{isCheckingOut ? 'Complete Your Order' : 'Your Cart'}</h2>
              </div>
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200"><FiX size={24} /></button>
            </div>
            
            {!isCheckingOut && (
                <div className="flex justify-center border-b-2 border-gray-100">
                    <button 
                        onClick={() => setActiveTab('cart')} 
                        className={`py-3 px-6 font-semibold border-b-2 transition-all ${activeTab === 'cart' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                    >
                        Cart
                    </button>
                    <button 
                        onClick={() => setActiveTab('orders')} 
                        className={`py-3 px-6 font-semibold border-b-2 transition-all ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                    >
                        My Orders
                    </button>
                </div>
            )}

            <div className="flex-grow p-4 overflow-y-auto max-h-[60vh]">
              {isCheckingOut ? <Checkout onOrderPlaced={handleOrderPlaced} /> : (
                  <AnimatePresence mode="wait">
                      <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          {activeTab === 'cart' ? renderCartContent() : renderOrdersContent()}
                      </motion.div>
                  </AnimatePresence>
              )}
            </div>
            
            {!isCheckingOut && activeTab === 'cart' && (cart || []).length > 0 && (
              <div className="p-4 border-t bg-gray-50 rounded-b-xl">
                <div className="flex justify-between items-center font-bold text-2xl mb-4">
                  <span>Total:</span>
                  <span className="text-primary">
                    <CountUp start={0} end={cartTotal} duration={0.75} separator="," prefix="₹" />
                  </span>
                </div>
                <button
                  onClick={handleProceedToCheckout}
                  disabled={!isStoreOpen}
                  className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isStoreOpen ? 'Proceed to Checkout' : 'Store is Currently Closed'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}