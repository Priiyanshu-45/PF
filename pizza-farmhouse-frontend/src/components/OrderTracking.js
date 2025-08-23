// src/components/OrderTracking.js
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiClock, FiLoader, FiTruck, FiCheckCircle, FiMapPin, FiPhone, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const OrderProgress = ({ currentStatus, createdAt, updatedAt }) => {
  const steps = [
    { key: 'Order Placed', label: 'Order Placed', icon: FiClock, color: 'blue', time: createdAt },
    { key: 'Preparing', label: 'Preparing', icon: FiLoader, color: 'yellow', time: currentStatus === 'Preparing' ? updatedAt : null },
    { key: 'Out for Delivery', label: 'Out for Delivery', icon: FiTruck, color: 'orange', time: currentStatus === 'Out for Delivery' ? updatedAt : null },
    { key: 'Delivered', label: 'Delivered', icon: FiCheckCircle, color: 'green', time: currentStatus === 'Delivered' ? updatedAt : null }
  ];

  const currentIndex = steps.findIndex(step => step.key === currentStatus);

  return (
    <div className="flex justify-between items-center mb-6 relative">
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <div key={step.key} className="flex flex-col items-center relative">
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isCompleted 
                  ? `bg-${step.color}-500 border-${step.color}-500 text-white` 
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
              animate={isCurrent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ repeat: isCurrent ? Infinity : 0, duration: 2 }}
            >
              <StepIcon className="w-4 h-4" />
            </motion.div>
            <span className={`mt-2 text-xs font-medium text-center ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
              {step.label}
            </span>
            {step.time && (
              <span className="text-xs text-gray-500 mt-1">
                {step.time.toDate ? step.time.toDate().toLocaleTimeString() : new Date(step.time).toLocaleTimeString()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const getEstimatedTime = (status) => {
  const times = {
    'Order Placed': '15-20 mins',
    'Preparing': '10-15 mins',
    'Out for Delivery': '5-10 mins',
    'Delivered': 'Completed'
  };
  return times[status] || 'Calculating...';
};

export default function OrderTracking({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);
  
  // Use a ref to store the previous orders to compare for updates
  const previousOrdersRef = useRef([]);

  useEffect(() => {
    if (!isOpen || !currentUser) {
      // Cleanup previous state if modal is closed or user logs out
      setOrders([]);
      previousOrdersRef.current = [];
      return;
    }

    setLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    
    // Create a query for today's orders for the current user, ordered by most recent first.
    // This ensures that we only listen to relevant data.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid),
      where('createdAt', '>=', todayTimestamp),
      orderBy('createdAt', 'desc')
    );

    // Set up the real-time listener using onSnapshot
    // This is the core of the real-time functionality.
    // It will automatically receive updates from Firestore when the data changes.
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        try {
          const ordersData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Ensure createdAt and updatedAt are always Date objects for consistent handling
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || data.createdAt)
            };
          });

          // Check for status updates and show toast notifications
          ordersData.forEach(newOrder => {
            const oldOrder = previousOrdersRef.current.find(o => o.id === newOrder.id);
            if (oldOrder && oldOrder.status !== newOrder.status) {
              toast.success(`Order #${newOrder.id.substring(0, 8)} is now ${newOrder.status}!`, {
                icon: newOrder.status === 'Delivered' ? '🎉' : '📦',
                duration: 5000
              });
            }
          });

          setOrders(ordersData);
          previousOrdersRef.current = ordersData; // Update the reference for the next comparison
          setLastUpdate(new Date());
          setConnectionStatus('connected');
          setLoading(false);
          setError(null);
        } catch (error) {
          console.error('Error processing orders:', error);
          setConnectionStatus('error');
          setError('Error processing order data');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching orders:', error);
        setConnectionStatus('error');
        setLoading(false);
        setError('Failed to load orders. Please check your connection.');
        
        if (error.code === 'permission-denied') {
          setError('Permission denied. Please log in again.');
        }
      }
    );

    // Cleanup function: This is crucial to prevent memory leaks.
    // It detaches the listener when the component unmounts or dependencies change.
    return () => unsubscribe();
  }, [isOpen, currentUser]); // Rerun effect when the modal is opened/closed or the user changes

  const ConnectionIndicator = () => (
    <div className={`flex items-center space-x-2 text-xs ${
      connectionStatus === 'connected' ? 'text-green-600' : 
      connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
      }`}></div>
      <span>
        {connectionStatus === 'connected' ? 'Live' :
         connectionStatus === 'connecting' ? 'Connecting...' : 
         'Connection Error'}
      </span>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Live Order Tracking</h2>
              <div className="flex items-center mt-2 space-x-4">
                <ConnectionIndicator />
                <span className="text-sm text-gray-500">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-grow">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-700">Loading your orders...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-6 h-full flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <FiAlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
                  <p className="text-red-800 font-medium">Connection Issue</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 h-full flex flex-col justify-center">
                <FiClock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No active orders today</h3>
                <p className="text-gray-500">Your new orders will appear here with live tracking.</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id.substring(0, 8)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {order.createdAt.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">₹{order.totalPrice}</p>
                        <p className="text-sm font-medium text-blue-600">
                          ETA: {getEstimatedTime(order.status)}
                        </p>
                      </div>
                    </div>
                    <OrderProgress 
                      currentStatus={order.status} 
                      createdAt={order.createdAt}
                      updatedAt={order.updatedAt}
                    />
                     <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <FiMapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-blue-900">Delivery Address</p>
                          <p className="text-sm text-blue-700">{order.userDetails.address}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}