import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  FiMapPin,
  FiUser,
  FiPhone,
  FiMessageSquare,
  FiCheckCircle,
  FiAlertTriangle
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Checkout({ onOrderPlaced }) {
  const { cart, dispatch } = useCart();
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [orderDetails, setOrderDetails] = useState({
    name: '',
    address: '',
    customMessage: '',
    isUniversity: false,
    universityGate: '',
    selectedAddressIndex: null
  });
  
  const [guestPhone, setGuestPhone] = useState('');

  const cartTotal = cart.reduce((sum, item) => {
    const itemTotal = item.totalPrice || (item.price * item.qty);
    const addonsTotal = (item.addons || []).reduce((addonSum, addon) => addonSum + addon.price, 0) * item.qty;
    const crustTotal = item.crust ? item.crust.price * item.qty : 0;
    return sum + itemTotal + addonsTotal + crustTotal;
  }, 0);

  useEffect(() => {
    // Smartly populate or clear form based on authentication state
    if (currentUser && userProfile) {
      // User is logged in, auto-fill their name
      setOrderDetails(prev => ({
        ...prev,
        name: userProfile.name || ''
      }));
      setGuestPhone(''); // Clear any guest phone number
    } else {
      // User is a guest, ensure name field is clear
      setOrderDetails(prev => ({ ...prev, name: '' }));
    }
  }, [currentUser, userProfile]);

  const getVerifiedPhone = () => {
    if (userProfile?.phone) return userProfile.phone;
    if (currentUser?.phoneNumber) return currentUser.phoneNumber;
    return '';
  };

  const verifiedPhone = getVerifiedPhone();

  const handleAddressSelect = (index) => {
    const selectedAddress = userProfile.addresses[index];
    setOrderDetails(prev => ({
      ...prev,
      address: selectedAddress.address,
      customMessage: selectedAddress.customMessage || '',
      selectedAddressIndex: index
    }));
  };

  const handleUniversitySelect = () => {
    setOrderDetails(prev => ({
      ...prev,
      isUniversity: true,
      address: '',
      universityGate: '',
      selectedAddressIndex: null
    }));
  };

  const handleUniversityGateSelect = (gate) => {
    setOrderDetails(prev => ({
      ...prev,
      universityGate: gate,
      address: `Jaypee University Anoopshahr, ${gate}, A-10, Sector 62, Noida, Uttar Pradesh 201309`
    }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!orderDetails.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (currentUser && !verifiedPhone) {
      toast.error('Phone number verification required. Please re-login.');
      return;
    }
    if (!currentUser && !guestPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    
    if (!orderDetails.address.trim()) {
      toast.error('Please enter delivery address');
      return;
    }
    if (orderDetails.isUniversity && !orderDetails.universityGate) {
      toast.error('Please select university gate');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        userId: currentUser ? currentUser.uid : 'guest',
        userDetails: {
          name: orderDetails.name.trim(),
          phone: currentUser ? verifiedPhone.trim() : guestPhone.trim(),
          address: orderDetails.address.trim(),
          customMessage: orderDetails.customMessage.trim() || null,
          isUniversity: orderDetails.isUniversity,
          universityGate: orderDetails.universityGate || null
        },
        items: cart.map(item => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          name: item.name,
          price: item.price,
          qty: item.qty,
          size: item.size || null,
          addons: item.addons || [],
          crust: item.crust || null,
          totalItemPrice: item.totalPrice || (item.price * item.qty)
        })),
        totalPrice: cartTotal,
        status: 'Order Placed',
        createdAt: new Date(),
        updatedAt: new Date(),
        orderNumber: Math.random().toString(36).substr(2, 9).toUpperCase()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      if (currentUser && userProfile) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          name: orderDetails.name.trim(),
          lastOrderDate: new Date()
        });
      }
      
      dispatch({ type: 'CLEAR_CART' });
      toast.success('🎉 Order placed successfully!');
      onOrderPlaced();
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="bg-gray-900 text-gray-200">
      <form onSubmit={handlePlaceOrder} className="space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Personal Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={orderDetails.name}
                  onChange={(e) => setOrderDetails(prev => ({ ...prev, name: e.target.value }))}
                  readOnly={!!currentUser}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    currentUser
                      ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed'
                      : 'bg-gray-700 border-gray-600 text-gray-200'
                  }`}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              {currentUser && (
                  <p className="text-xs text-gray-400 mt-2">
                    Name pre-filled from your profile.
                  </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number *
              </label>
              {currentUser ? (
                verifiedPhone ? (
                  <>
                    <div className="relative">
                      <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400" size={18} />
                      <input
                        type="tel"
                        value={verifiedPhone}
                        className="w-full pl-10 pr-12 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 font-mono cursor-not-allowed"
                        readOnly
                      />
                       <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                     <div className="flex items-center mt-2">
                        <FiCheckCircle size={14} className="text-green-400 mr-1" />
                        <p className="text-xs text-green-400">✓ Verified Phone Number</p>
                      </div>
                  </>
                ) : (
                   <>
                    <div className="relative">
                        <FiAlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400" size={18} />
                        <input
                          type="text"
                          value="Phone number not found"
                          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-dashed border-gray-600 rounded-lg text-yellow-400 cursor-not-allowed"
                          readOnly
                        />
                      </div>
                      <div className="flex items-center mt-2">
                        <p className="text-xs text-yellow-500">
                          ⚠️ Please re-login to verify your phone number.
                        </p>
                      </div>
                   </>
                )
              ) : (
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    name="tel"
                    autoComplete="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Delivery Address</h3>
          
          <div className="mb-6 p-4 bg-orange-900/20 border border-orange-700/50 rounded-lg">
            <h4 className="font-medium text-orange-400 mb-3 flex items-center">
              🎓 Jaypee University Anoopshahr - Special Delivery
            </h4>
            
            {!orderDetails.isUniversity ? (
              <button type="button" onClick={handleUniversitySelect} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                Select University Address
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-orange-300">Select your gate:</p>
                <div className="flex flex-wrap gap-3">
                  {['Gate 1', 'Gate 2'].map(gate => (
                    <button key={gate} type="button" onClick={() => handleUniversityGateSelect(gate)} className={`px-4 py-2 rounded-lg transition-colors ${orderDetails.universityGate === gate ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                      {gate}
                    </button>
                  ))}
                </div>
                {orderDetails.universityGate && (
                  <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-300">📍 {orderDetails.address}</p>
                  </div>
                )}
                <button type="button" onClick={() => setOrderDetails(prev => ({ ...prev, isUniversity: false, universityGate: '', address: '' }))} className="text-sm text-orange-400 hover:text-orange-300 mt-2">
                  Use a different address
                </button>
              </div>
            )}
          </div>
          
          {userProfile?.addresses && userProfile.addresses.length > 0 && !orderDetails.isUniversity && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-300 mb-3">Choose from saved addresses:</p>
              <div className="space-y-2">
                {userProfile.addresses.map((address, index) => (
                  <button key={index} type="button" onClick={() => handleAddressSelect(index)} className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${orderDetails.selectedAddressIndex === index ? 'border-orange-500 bg-orange-500/10' : 'border-gray-600 bg-gray-700 hover:border-gray-500'}`}>
                    <div className="flex items-start">
                      <FiMapPin className="text-orange-400 mr-2 mt-1 flex-shrink-0" size={16} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-200 leading-relaxed">{address.address}</p>
                        {address.customMessage && (
                          <p className="text-xs text-gray-400 mt-1">📝 {address.customMessage}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="my-4 flex items-center">
                <div className="flex-1 border-t border-gray-600"></div>
                <span className="px-3 text-sm text-gray-400">OR</span>
                <div className="flex-1 border-t border-gray-600"></div>
              </div>
            </div>
          )}
          
          {!orderDetails.isUniversity && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter Delivery Address *
              </label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <textarea
                  name="street-address"
                  autoComplete="street-address"
                  value={orderDetails.address}
                  onChange={(e) => setOrderDetails(prev => ({ ...prev, address: e.target.value, selectedAddressIndex: null }))}
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="Enter your complete delivery address..."
                  required={!orderDetails.isUniversity}
                />
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Special Delivery Instructions (Optional)
            </label>
            <div className="relative">
              <FiMessageSquare className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <textarea
                value={orderDetails.customMessage}
                onChange={(e) => setOrderDetails(prev => ({ ...prev, customMessage: e.target.value }))}
                rows={2}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                placeholder="e.g., Call on arrival..."
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Order Summary</h3>
          <div className="space-y-3 mb-4">
            {cart.length > 0 ? cart.map((item, index) => (
              <div key={item.id || index} className="flex justify-between items-start bg-gray-700 p-3 rounded-lg">
                <div className="flex-1 mr-4">
                  <h4 className="font-medium text-gray-200">{item.name}</h4>
                  {item.size && <p className="text-sm text-gray-400">Size: {item.size}</p>}
                  {item.crust && <p className="text-sm text-gray-400">Crust: {item.crust.name}</p>}
                  {item.addons && item.addons.length > 0 && (
                    <p className="text-sm text-gray-400">Extras: {item.addons.map(addon => addon.name).join(', ')}</p>
                  )}
                  <p className="text-sm text-gray-400">Quantity: {item.qty}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-400">₹{item.totalPrice || (item.price * item.qty)}</p>
                </div>
              </div>
            )) : <p className="text-center text-gray-400">Your cart is empty.</p>}
          </div>
          <div className="border-t border-gray-600 pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-gray-200">Total Amount:</span>
              <span className="text-orange-400">₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={loading || cart.length === 0}
          whileHover={{ scale: (loading || cart.length === 0) ? 1 : 1.02 }}
          whileTap={{ scale: (loading || cart.length === 0) ? 1 : 0.98 }}
          className="w-full bg-orange-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              Placing Order...
            </div>
          ) : cart.length === 0 ? (
            'Your Cart is Empty'
          ) : (
            `Place Order - ₹${cartTotal.toFixed(2)}`
          )}
        </motion.button>
      </form>
    </div>
  );
}