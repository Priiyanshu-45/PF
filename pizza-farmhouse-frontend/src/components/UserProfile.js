import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMapPin, FiPlus, FiTrash2, FiEdit, FiTruck, FiClock, FiCheckCircle, FiPhone, FiUser, FiSave, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

const AddressForm = ({ address = null, onSave, onCancel }) => {
  const [addressText, setAddressText] = useState(address?.address || '');
  const [customMessage, setCustomMessage] = useState(address?.customMessage || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!addressText.trim()) {
      toast.error('Please enter your address');
      return;
    }
    onSave({ 
      address: addressText, 
      customMessage: customMessage,
      id: address?.id || Date.now().toString() 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-700 border border-gray-600 p-6 rounded-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* University Option */}
        <div className="mb-4 p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
          <h4 className="font-medium text-orange-400 mb-2">🎓 Jaypee University Anoopshahr</h4>
          <button
            type="button"
            onClick={() => {
              setAddressText('Jaypee University Anoopshahr, A-10, Sector 62, Noida, Uttar Pradesh 201309');
              setCustomMessage('University delivery - Please call on arrival');
            }}
            className="text-sm px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Use University Address
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Delivery Address *
          </label>
          <textarea
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
            rows={4}
            placeholder="Enter your complete delivery address..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
            rows={2}
            placeholder="Any special delivery instructions..."
          />
        </div>
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Save Address
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const OrderStatus = ({ status }) => {
  const statusConfig = {
    'Order Placed': { icon: FiClock, color: 'text-blue-400 bg-blue-900/30' },
    'Preparing': { icon: FiClock, color: 'text-yellow-400 bg-yellow-900/30' },
    'Out for Delivery': { icon: FiTruck, color: 'text-orange-400 bg-orange-900/30' },
    'Delivered': { icon: FiCheckCircle, color: 'text-green-400 bg-green-900/30' },
  };
  const config = statusConfig[status] || statusConfig['Order Placed'];
  const StatusIcon = config.icon;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <StatusIcon size={16} className="mr-1" />
      {status}
    </span>
  );
};

export default function UserProfile({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (userProfile?.name) setName(userProfile.name);

    if (!currentUser) return;

    setOrdersLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setUserOrders(orders);
      setOrdersLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setOrdersLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, userProfile]);

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { name: name.trim() });
      toast.success('Name updated successfully');
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    }
  };

  const handleCancelEditName = () => {
    setName(userProfile.name || '');
    setIsEditingName(false);
  };

  const handleSaveAddress = async (addressData) => {
    try {
      const updatedAddresses = [...(userProfile?.addresses || [])];
      if (editingAddressIndex !== null) {
        updatedAddresses[editingAddressIndex] = addressData;
      } else {
        if (updatedAddresses.length >= 3) {
          toast.error('Maximum 3 addresses allowed');
          return;
        }
        updatedAddresses.push(addressData);
      }
      await updateDoc(doc(db, 'users', currentUser.uid), {
        addresses: updatedAddresses
      });
      setIsEditingAddress(false);
      setEditingAddressIndex(null);
      toast.success('Address saved successfully');
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    }
  };

  const handleDeleteAddress = async (index) => {
    try {
      const updatedAddresses = (userProfile?.addresses || []).filter((_, i) => i !== index);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        addresses: updatedAddresses
      });
      toast.success('Address deleted successfully');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const getPhoneNumber = () => {
    if (userProfile?.phone) return userProfile.phone;
    if (currentUser?.phoneNumber) return currentUser.phoneNumber;
    return null;
  };
  const verifiedPhone = getPhoneNumber();

  return (
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
            className="bg-gray-800 border border-gray-600 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-600 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-200">My Profile</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                <FiX size={24} />
              </button>
            </div>
            {/* Tabs */}
            <div className="border-b border-gray-600 flex-shrink-0">
              <div className="flex space-x-8 px-6">
                {['profile', 'addresses', 'orders'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-orange-500 text-orange-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {tab === 'addresses' ? 'Addresses' : 
                     tab === 'orders' ? 'My Orders' : 'Profile'}
                  </button>
                ))}
              </div>
            </div>
            {/* Content */}
            <div className="p-6 overflow-y-auto">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* --- LOADING --- */}
                  {authLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <FiLoader className="animate-spin text-orange-500" size={24} />
                      <span className="ml-2 text-gray-400">Loading profile...</span>
                    </div>
                  ) : !userProfile ? (
                    <div className="text-center p-8 text-gray-400">Could not load user profile.</div>
                  ) : (
                    <>
                    {/* --- NAME (EDITABLE) --- */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          <FiUser className="inline mr-2" size={16} />
                          Full Name
                        </label>
                        {!isEditingName && (
                          <button onClick={() => setIsEditingName(true)} className="text-blue-400 hover:text-blue-300 p-1">
                            <FiEdit size={16} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        readOnly={!isEditingName}
                        className={`w-full p-3 border rounded-lg transition-colors ${
                          isEditingName
                            ? 'bg-gray-800 border-orange-500 text-gray-200'
                            : 'bg-gray-700 border-gray-600 text-gray-200 cursor-default'
                        }`}
                      />
                      {isEditingName && (
                        <div className="flex space-x-3 mt-3">
                          <button onClick={handleCancelEditName} className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700">
                            Cancel
                          </button>
                          <button onClick={handleSaveName} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center">
                            <FiSave size={16} className="mr-2" />
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Verified Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <FiPhone className="inline mr-2" size={16} />
                        Phone Number
                      </label>
                      {verifiedPhone ? (
                        <div>
                          <div className="relative">
                            <input
                              type="text"
                              value={verifiedPhone}
                              className="w-full p-3 border border-gray-500 rounded-lg bg-gray-600 text-gray-200 font-mono text-lg cursor-not-allowed"
                              readOnly
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          <div className="flex items-center mt-2">
                            <FiCheckCircle size={14} className="text-green-400 mr-2" />
                            <p className="text-xs text-green-400 font-medium">Verified Phone Number</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                          <FiAlertTriangle className="text-yellow-400 mr-3" size={20}/>
                          <span className="text-sm text-yellow-300">Phone number not available.</span>
                        </div>
                      )}
                    </div>
                    {/* Account Info */}
                    <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                      <h4 className="font-medium text-blue-400 mb-2">📱 Account Information</h4>
                      <div className="text-sm text-gray-300 space-y-1">
                        <p>• Phone number verified during login</p>
                        <p>• Account created: {userProfile?.createdAt?.toDate ? userProfile.createdAt.toDate().toLocaleDateString('en-IN') : 'Recently'}</p>
                        <p>• Profile secure and verified</p>
                      </div>
                    </div>
                    </>
                  )}
                </div>
              )}
              {activeTab === 'addresses' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-200">Saved Addresses</h3>
                    {!isEditingAddress && (userProfile?.addresses || []).length < 3 && (
                      <button
                        onClick={() => {
                          setEditingAddressIndex(null);
                          setIsEditingAddress(true);
                        }}
                        className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                      >
                        <FiPlus size={16} className="mr-2" />
                        Add Address
                      </button>
                    )}
                  </div>
                  {isEditingAddress && (
                    <AddressForm
                      address={editingAddressIndex !== null ? userProfile?.addresses[editingAddressIndex] : null}
                      onSave={handleSaveAddress}
                      onCancel={() => {
                        setIsEditingAddress(false);
                        setEditingAddressIndex(null);
                      }}
                    />
                  )}
                  <div className="grid gap-4">
                    {(userProfile?.addresses || []).map((address, index) => (
                      <div key={address.id || index} className="border border-gray-600 bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 mr-4">
                            <div className="flex items-center mb-2">
                              <FiMapPin className="text-orange-400 mr-2" size={16} />
                              <span className="font-medium text-gray-200">Address {index + 1}</span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">{address.address}</p>
                            {address.customMessage && (
                              <p className="text-xs text-orange-400 mt-2">
                                📝 {address.customMessage}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingAddressIndex(index);
                                setIsEditingAddress(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 p-1"
                            >
                              <FiEdit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(index)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(userProfile?.addresses || []).length === 0 && !isEditingAddress && (
                    <div className="text-center py-8">
                      <FiMapPin size={48} className="mx-auto text-gray-500 mb-4" />
                      <p className="text-gray-400">No saved addresses yet</p>
                      <button
                        onClick={() => setIsEditingAddress(true)}
                        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                      >
                        Add Your First Address
                      </button>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-200">Order History</h3>
                  {ordersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      <p className="text-gray-400 mt-2">Loading orders...</p>
                    </div>
                  ) : userOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🛍️</div>
                      <p className="text-gray-400">You haven't placed any orders yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userOrders.map((order) => (
                        <div key={order.id} className="border border-gray-600 bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-medium text-gray-200">
                                Order #{order.orderNumber || order.id.substring(0, 8)}
                              </h4>
                              <p className="text-sm text-gray-400">
                                {order.createdAt?.toLocaleDateString('en-IN')} at {order.createdAt?.toLocaleTimeString('en-IN')}
                              </p>
                            </div>
                            <OrderStatus status={order.status || 'Order Placed'} />
                          </div>
                          <div className="space-y-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-300">
                                  {item.qty}x {item.name} {item.size ? `(${item.size})` : ''}
                                  {item.crust && ` - ${item.crust.name}`}
                                  {item.addons && item.addons.length > 0 && (
                                    <span className="text-gray-400 block text-xs">
                                      + {item.addons.map(addon => addon.name).join(', ')}
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium text-gray-200">
                                  ₹{item.totalItemPrice || (item.price * item.qty)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-gray-600 mt-3 pt-3">
                            <div className="flex justify-between font-bold text-gray-200">
                              <span>Total:</span>
                              <span>₹{order.totalPrice}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
