// src/admin/OrderManagement.js
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiTruck, FiClock, FiCheckCircle, FiAlertCircle, FiVolumeX, FiVolume2 } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'Order Placed', label: 'Order Placed', icon: FiClock, color: 'bg-blue-600 text-blue-100' },
  { value: 'Preparing', label: 'Preparing', icon: FiClock, color: 'bg-yellow-600 text-yellow-100' },
  { value: 'Out for Delivery', label: 'Out for Delivery', icon: FiTruck, color: 'bg-orange-600 text-orange-100' },
  { value: 'Delivered', label: 'Delivered', icon: FiCheckCircle, color: 'bg-green-600 text-green-100' }
];

const getNextStatusOptions = (currentStatus) => {
  const currentIndex = statusOptions.findIndex(s => s.value === currentStatus);
  if (currentStatus === 'Delivered') return [];
  // Return the next logical step.
  return statusOptions.slice(currentIndex + 1, currentIndex + 2);
};

const OrderCard = ({ order, onStatusUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    const orderRef = doc(db, 'orders', order.id);
    
    try {
      // **IMPROVEMENT**: Always update the `updatedAt` timestamp on any status change.
      // This ensures users see the most recent update time.
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp() // Use server timestamp for accuracy
      };

      await updateDoc(orderRef, updateData);
      toast.success(`Order status updated to ${newStatus}`);
      
      onStatusUpdate(order.id, newStatus);
      
      // Auto-delete delivered orders after a delay to clean up the dashboard
      if (newStatus === 'Delivered') {
        setTimeout(async () => {
          try {
            await deleteDoc(orderRef);
          } catch (error) {
            console.error('Error auto-removing delivered order:', error);
          }
        }, 30000); // Increased delay to 30 seconds
      }

    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
    }
    setIsUpdating(false);
  };

  const currentStatus = statusOptions.find(s => s.value === order.status);
  const StatusIcon = currentStatus?.icon || FiClock;
  const nextOptions = getNextStatusOptions(order.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-sm"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-200">Order #{order.id.substring(0, 8)}</h3>
          <p className="text-sm text-gray-400">
            {order.createdAt?.toDate().toLocaleString()}
          </p>
          {order.userDetails && (
            <div className="mt-2 text-sm text-gray-300">
              <p><strong>Customer:</strong> {order.userDetails.name}</p>
              <p><strong>Phone:</strong> {order.userDetails.phone}</p>
            </div>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentStatus?.color}`}>
          <StatusIcon size={12} className="inline mr-1" />
          {order.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {order.items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm bg-gray-700 p-2 rounded">
            <span className="text-gray-300">{item.qty}x {item.name}</span>
            <span className="font-medium text-gray-200">₹{item.price * item.qty}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-gray-200 pt-2 border-t border-gray-600">
          <span>Total:</span>
          <span>₹{order.totalPrice}</span>
        </div>
      </div>

      {nextOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextOptions.map((status) => (
            <button
              key={status.value}
              onClick={() => handleStatusChange(status.value)}
              disabled={isUpdating}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status.value === 'Delivered' 
                  ? 'bg-green-600 text-green-100 hover:bg-green-700'
                  : 'bg-orange-600 text-orange-100 hover:bg-orange-700'
              } disabled:opacity-50`}
            >
              {isUpdating ? 'Updating...' : `Mark as ${status.label}`}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};


export default function OrderManagement() {
    // ... (The rest of your OrderManagement component remains the same)
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio('/assets/new-order-sound.mp3');
  }, []);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', today),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const isInitialLoad = orders.length === 0;

      const ordersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => order.status !== 'Delivered'); // Filter out delivered orders from the live view

      // Play sound for new orders only after the initial load
      if (!isInitialLoad && snapshot.docChanges().some(change => change.type === 'added')) {
        if (soundEnabled) {
          audioRef.current.play().catch(console.error);
        }
        toast.success(`🎉 New order received!`);
      }

      setOrders(ordersList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [soundEnabled]); // Re-subscribe if sound setting changes (though not necessary for logic)

  const handleStatusUpdate = (orderId, newStatus) => {
    // Optimistically update the UI. The listener will sync it anyway.
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ).filter(order => order.status !== 'Delivered') // Remove if delivered
    );
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);
  
    return (
        <div className="bg-gray-900 min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-200">Live Order Management</h2>
                    {/* ... other elements ... */}
                </div>
                {/* ... filters ... */}
                {loading ? (
                    <div className="text-center py-12">
                        <FiRefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
                        <p className="mt-2 text-gray-400">Loading live orders...</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredOrders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}