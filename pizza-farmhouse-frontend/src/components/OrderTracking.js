import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiClock, FiLoader, FiTruck, FiCheckCircle, FiMapPin, FiPhone, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

const OrderProgress = ({ currentStatus, createdAt }) => {
  const steps = [
    { key: 'Order Placed', label: 'Order Placed', icon: FiClock, color: 'blue', time: createdAt },
    { key: 'Preparing', label: 'Preparing', icon: FiLoader, color: 'yellow' },
    { key: 'Out for Delivery', label: 'Out for Delivery', icon: FiTruck, color: 'orange' },
    { key: 'Delivered', label: 'Delivered', icon: FiCheckCircle, color: 'green' }
  ];

  const currentIndex = steps.findIndex(step => step.key === currentStatus);

  return (
    <div className="relative mb-6">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.key} className="flex flex-col items-center relative">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ 
                  scale: isCurrent ? 1.2 : isActive ? 1.1 : 1,
                  backgroundColor: isActive 
                    ? step.color === 'blue' ? '#3B82F6' :
                      step.color === 'yellow' ? '#F59E0B' :
                      step.color === 'orange' ? '#F97316' : '#10B981'
                    : '#374151'
                }}
                transition={{ duration: 0.3 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 relative ${
                  isActive 
                    ? `border-${step.color}-500 text-white shadow-lg`
                    : 'border-gray-600 text-gray-400 bg-gray-700'
                }`}
              >
                <StepIcon size={18} className={isCurrent ? 'animate-pulse' : ''} />
                {isCurrent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -inset-1 rounded-full border-2 border-orange-400 animate-ping"
                  />
                )}
              </motion.div>
              <span className={`text-xs mt-2 text-center font-medium ${
                isActive ? `text-${step.color}-400` : 'text-gray-400'
              }`}>
                {step.label}
              </span>
              {isActive && (
                <span className="text-xs text-gray-500 mt-1">
                  {step.time ? step.time.toLocaleTimeString() : 'In Progress'}
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Animated Progress Line */}
      <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-600 -z-10">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-blue-500 via-yellow-500 via-orange-500 to-green-500"
        />
      </div>
    </div>
  );
};

const OrderCard = ({ order }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const createdDate = formatDate(order.createdAt);
  const getStatusColor = (status) => {
    switch (status) {
      case 'Order Placed': return 'text-blue-400 bg-blue-900/20 border-blue-700';
      case 'Preparing': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'Out for Delivery': return 'text-orange-400 bg-orange-900/20 border-orange-700';
      case 'Delivered': return 'text-green-400 bg-green-900/20 border-green-700';
      default: return 'text-gray-400 bg-gray-700/20 border-gray-600';
    }
  };

  const getEstimatedTime = (status) => {
    switch (status) {
      case 'Order Placed': return '15-20 minutes';
      case 'Preparing': return '10-15 minutes';
      case 'Out for Delivery': return '5-10 minutes';
      case 'Delivered': return 'Completed';
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6 shadow-lg hover:shadow-xl transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-200">
            Order #{order.id.substring(0, 8)}
          </h3>
          <p className="text-sm text-gray-400">{createdDate.toLocaleString()}</p>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 border ${getStatusColor(order.status)}`}>
            {order.status || 'Order Placed'}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-orange-400">₹{order.totalPrice}</p>
          <span className="text-xs text-green-400 flex items-center justify-end mt-1">
            <FiRefreshCw size={12} className="mr-1 animate-spin" />
            Live tracking
          </span>
          <p className="text-xs text-gray-400 mt-1">
            ETA: {getEstimatedTime(order.status)}
          </p>
        </div>
      </div>

      {/* Order Progress */}
      <OrderProgress currentStatus={order.status || 'Order Placed'} createdAt={createdDate} />

      {/* Order Items */}
      <div className="mt-6">
        <h4 className="font-medium text-gray-300 mb-3 flex items-center">
          🍕 Items Ordered ({order.items?.length || 0})
        </h4>
        <div className="space-y-2">
          {(order.items || []).map((item, index) => (
            <div key={index} className="flex justify-between text-sm bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex-1">
                <span className="text-gray-300 font-medium">
                  {item.qty}x {item.name} {item.size ? `(${item.size})` : ''}
                </span>
                {item.crust && (
                  <p className="text-xs text-blue-400">Crust: {item.crust.name}</p>
                )}
                {item.addons && item.addons.length > 0 && (
                  <p className="text-xs text-green-400">
                    + {item.addons.map(addon => addon.name).join(', ')}
                  </p>
                )}
              </div>
              <span className="text-gray-200 font-bold">₹{item.price * item.qty}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Details */}
      {order.userDetails && (
        <div className="mt-4 p-4 bg-gray-700 rounded-lg border-l-4 border-orange-500">
          <h5 className="font-medium text-gray-200 mb-2">📍 Delivery Information</h5>
          <div className="space-y-1 text-sm">
            <div className="flex items-center text-gray-300">
              <FiMapPin size={14} className="mr-2 text-orange-400 flex-shrink-0" />
              <span>{order.userDetails.address}</span>
            </div>
            <div className="flex items-center text-gray-300">
              <FiPhone size={14} className="mr-2 text-green-400 flex-shrink-0" />
              <span>{order.userDetails.phone}</span>
            </div>
            {order.userDetails.isUniversity && order.userDetails.universityGate && (
              <div className="text-orange-400 text-xs mt-2 bg-orange-900/20 p-2 rounded">
                🎓 University delivery - {order.userDetails.universityGate}
              </div>
            )}
            {order.userDetails.customMessage && (
              <div className="text-blue-400 text-xs mt-2 bg-blue-900/20 p-2 rounded">
                💬 {order.userDetails.customMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function OrderTracking({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!currentUser || !isOpen) {
      setOrders([]);
      setLoading(false);
      return;
    }

    console.log('Setting up enhanced order tracking for user:', currentUser.uid);
    setLoading(true);

    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid),
      where('createdAt', '>=', today),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('Enhanced order tracking snapshot received, docs:', snapshot.docs.length);
        
        const ordersList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          ordersList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date()
          });
        });
        
        setOrders(ordersList);
        setLoading(false);
        setLastUpdate(new Date());
        
        // Show toast for status updates
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const order = change.doc.data();
            toast.success(`Order #${change.doc.id.substring(0, 8)} status updated: ${order.status}`);
          }
        });
        
        console.log('Enhanced orders loaded:', ordersList.length);
      },
      (error) => {
        console.error("Error in enhanced order tracking:", error);
        toast.error("Failed to load order tracking");
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up enhanced order tracking listener');
      unsubscribe();
    };
  }, [currentUser, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enhanced Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-200 flex items-center">
                  📍 Live Order Tracking
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Real-time updates • Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading your orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🍕</div>
                  <h3 className="text-lg font-medium text-gray-200 mb-2">No orders today</h3>
                  <p className="text-gray-400">Your orders from today will appear here with live tracking</p>
                  <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
                    <p className="text-sm text-blue-300">
                      💡 Tip: Orders are tracked in real-time with live status updates!
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-6 flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                    <div>
                      <p className="text-gray-300 font-medium">
                        {orders.length} order{orders.length !== 1 ? 's' : ''} today
                      </p>
                      <p className="text-xs text-gray-400">All times are live and automatically updated</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400 font-medium">Live Updates Active</span>
                    </div>
                  </div>
                  
                  {orders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
