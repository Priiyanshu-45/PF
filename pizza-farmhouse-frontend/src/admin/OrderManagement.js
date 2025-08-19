import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiTruck, FiClock, FiCheckCircle, FiAlertCircle, FiVolumeX, FiVolume2 } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'Order Placed', label: 'Order Placed', icon: FiClock, color: 'bg-blue-600 text-blue-100' },
  { value: 'Preparing', label: 'Preparing', icon: FiClock, color: 'bg-yellow-600 text-yellow-100' },
  { value: 'Out for Delivery', label: 'Out for Delivery', icon: FiTruck, color: 'bg-orange-600 text-orange-100' },
  { value: 'Delivered', label: 'Delivered', icon: FiCheckCircle, color: 'bg-green-600 text-green-100' }
];

const getNextStatusOptions = (currentStatus) => {
  const currentIndex = statusOptions.findIndex(s => s.value === currentStatus);
  
  if (currentStatus === 'Delivered') {
    return []; // No more status changes for delivered orders
  }
  
  // Only allow next logical step
  return statusOptions.slice(currentIndex + 1, currentIndex + 2);
};

const OrderCard = ({ order, onStatusUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      if (newStatus === 'Delivered') {
        // When marking as delivered, update status then delete after 5 seconds
        await updateDoc(doc(db, 'orders', order.id), {
          status: newStatus,
          updatedAt: new Date(),
          deliveredAt: new Date()
        });
        
        toast.success('Order marked as delivered');
        
        // Auto-remove delivered order after 5 seconds
        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, 'orders', order.id));
            console.log('Delivered order auto-removed:', order.id);
          } catch (error) {
            console.error('Error auto-removing delivered order:', error);
          }
        }, 5000);
        
      } else {
        await updateDoc(doc(db, 'orders', order.id), {
          status: newStatus,
          updatedAt: new Date()
        });
        toast.success(`Order status updated to ${newStatus}`);
      }
      
      onStatusUpdate(order.id, newStatus);
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-200">Order #{order.id.substring(0, 8)}</h3>
          <p className="text-sm text-gray-400">
            {order.createdAt?.toDate ? 
              order.createdAt.toDate().toLocaleString() : 
              new Date(order.createdAt).toLocaleString()
            }
          </p>
          {order.userDetails && (
            <div className="mt-2 text-sm text-gray-300">
              <p><strong>Customer:</strong> {order.userDetails.name}</p>
              <p><strong>Phone:</strong> {order.userDetails.phone}</p>
              {order.userDetails.address && (
                <p><strong>Address:</strong> {order.userDetails.address}</p>
              )}
              {order.userDetails.isUniversity && order.userDetails.universityGate && (
                <p className="text-orange-400">
                  🎓 University delivery - {order.userDetails.universityGate}
                </p>
              )}
              {order.userDetails.customMessage && (
                <p className="text-blue-400">
                  💬 <strong>Special Instructions:</strong> {order.userDetails.customMessage}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentStatus?.color}`}>
            <StatusIcon size={12} className="inline mr-1" />
            {order.status}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <h4 className="font-medium text-gray-300">Items:</h4>
        {order.items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm bg-gray-700 p-2 rounded">
            <span className="text-gray-300">
              {item.qty}x {item.name} {item.size ? `(${item.size})` : ''}
              {item.crust && ` - ${item.crust.name}`}
              {item.addons && item.addons.length > 0 && (
                <span className="text-gray-400 text-xs block">
                  + {item.addons.map(addon => addon.name).join(', ')}
                </span>
              )}
            </span>
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status.value === 'Delivered' 
                  ? 'bg-green-600 text-green-100 hover:bg-green-700'
                  : 'bg-orange-600 text-orange-100 hover:bg-orange-700'
              } disabled:opacity-50`}
            >
              {isUpdating ? 'Updating...' : `Mark ${status.label}`}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    // Load sound preference
    const savedSound = localStorage.getItem('adminSoundEnabled');
    if (savedSound !== null) {
      setSoundEnabled(JSON.parse(savedSound));
    }
    
    // Initialize audio for new orders only
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
  }, []);

  useEffect(() => {
    localStorage.setItem('adminSoundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    // Get today's active orders (not delivered)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', today),
      orderBy('createdAt', 'desc')
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = [];
      let newOrders = 0;

      // Play sound for NEW orders only
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && soundEnabled) {
            if (audioRef.current) {
              audioRef.current.play().catch(console.error);
            }
            newOrders++;
          }
        });
      }

      // Only include non-delivered orders for display
      snapshot.forEach((doc) => {
        const orderData = doc.data();
        ordersList.push({
          id: doc.id,
          ...orderData
        });
      });

      setOrders(ordersList);
      setLoading(false);
      isInitialLoad = false;
      
      if (newOrders > 0) {
        setNewOrderCount(newOrders);
        toast.success(`🔔 ${newOrders} new order${newOrders > 1 ? 's' : ''} received!`);
        setTimeout(() => setNewOrderCount(0), 3000);
      }
    }, (error) => {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  const handleStatusUpdate = (orderId, newStatus) => {
    // Update local state immediately for better UX
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);

  const orderCounts = {
    all: orders.length,
    'Order Placed': orders.filter(o => o.status === 'Order Placed').length,
    'Preparing': orders.filter(o => o.status === 'Preparing').length,
    'Out for Delivery': orders.filter(o => o.status === 'Out for Delivery').length,
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-300">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-200">Order Management</h2>
            {newOrderCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold"
              >
                {newOrderCount} New!
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={soundEnabled ? 'Disable new order alerts' : 'Enable new order alerts'}
            >
              {soundEnabled ? <FiVolume2 size={20} /> : <FiVolumeX size={20} />}
            </button>
            
            <div className="flex items-center text-sm text-gray-400">
              <FiRefreshCw className="mr-2" />
              Real-time updates
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Active Orders' },
            { key: 'Order Placed', label: 'New Orders' },
            { key: 'Preparing', label: 'Preparing' },
            { key: 'Out for Delivery', label: 'Out for Delivery' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label} ({orderCounts[key] || 0})
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FiAlertCircle size={48} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No orders found</h3>
            <p className="text-gray-400">
              {filter === 'all' ? 'No active orders' : `No ${filter.toLowerCase()} orders`}
            </p>
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
