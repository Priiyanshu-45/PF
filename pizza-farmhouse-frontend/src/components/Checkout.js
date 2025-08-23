// src/components/Checkout.js
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  FiMapPin,
  FiUser,
  FiPhone,
  FiMessageSquare,
  FiCheckCircle,
  FiAlertTriangle,
  FiLoader
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Checkout({ onOrderPlaced }) {
  const { cart, dispatch } = useCart();
  const { currentUser, userProfile, openLoginPopup, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orderDetails, setOrderDetails] = useState({
    name: '',
    phone: '',
    address: '',
    customMessage: '',
    isUniversity: false,
    universityGate: '',
    selectedAddressIndex: null,
  });

  const [guestPhone, setGuestPhone] = useState('');

  const cartTotal = cart.reduce((sum, item) => {
    const itemTotal = item.totalPrice || (item.price * item.qty);
    const addonsTotal = (item.addons || []).reduce((addonSum, addon) => addonSum + addon.price, 0) * item.qty;
    const crustTotal = item.crust ? item.crust.price * item.qty : 0;
    return sum + itemTotal + addonsTotal + crustTotal;
  }, 0);

  // Enhanced effect that reliably populates the form once userProfile is loaded
  useEffect(() => {
    if (currentUser && userProfile) {
      setOrderDetails((prev) => ({
        ...prev,
        name: userProfile.name || '',
        phone: userProfile.phone || currentUser?.phoneNumber || '',
      }));
      setGuestPhone('');
    } else {
      setOrderDetails((prev) => ({ ...prev, name: '', phone: '' }));
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
    setOrderDetails((prev) => ({
      ...prev,
      address: selectedAddress.address,
      customMessage: selectedAddress.customMessage || '',
      selectedAddressIndex: index,
      isUniversity: false,
    }));
  };

  const handleUniversitySelect = () => {
    setOrderDetails((prev) => ({
      ...prev,
      isUniversity: true,
      address: '',
      universityGate: '',
      selectedAddressIndex: null,
    }));
  };

  const handleUniversityGateSelect = (gate) => {
    setOrderDetails((prev) => ({
      ...prev,
      universityGate: gate,
      address: `Jaypee University Anoopshahr, ${gate}, A-10, Sector 62, Noida, Uttar Pradesh 201309`,
    }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!orderDetails.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    const phoneToUse = currentUser ? (orderDetails.phone || verifiedPhone).trim() : guestPhone.trim();
    if (!phoneToUse) {
      toast.error('Phone number could not be found. Please try logging in again.');
      return;
    }

    if (!orderDetails.address.trim()) {
      toast.error('Please provide a delivery address');
      return;
    }

    if (orderDetails.isUniversity && !orderDetails.universityGate) {
      toast.error('Please select university gate');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        userId: currentUser ? currentUser.uid : 'guest',
        userDetails: {
          name: orderDetails.name.trim(),
          phone: phoneToUse,
          address: orderDetails.address.trim(),
          customMessage: orderDetails.customMessage.trim() || null,
          isUniversity: orderDetails.isUniversity,
          universityGate: orderDetails.universityGate || null,
        },
        items: cart.map((item) => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          name: item.name,
          price: item.price,
          qty: item.qty,
          size: item.size || null,
          addons: item.addons || [],
          crust: item.crust || null,
          totalItemPrice: item.totalPrice || item.price * item.qty,
        })),
        totalPrice: cartTotal,
        status: 'Order Placed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        orderNumber: Math.random().toString(36).substr(2, 9).toUpperCase(),
      };

      await addDoc(collection(db, 'orders'), orderData);

      // Update the user's profile if logged in and name was changed
      if (currentUser && userProfile) {
        const updateData = {
          lastOrderDate: serverTimestamp(),
        };

        // Only update name if it was changed
        if (userProfile.name !== orderDetails.name.trim()) {
          updateData.name = orderDetails.name.trim();
        }

        await updateDoc(doc(db, 'users', currentUser.uid), updateData);
      }

      dispatch({ type: 'CLEAR_CART' });
      toast.success('🎉 Order placed successfully!');
      onOrderPlaced(); // Switches to the order tracking tab
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner while user's profile is being fetched
  if (currentUser && authLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-900 text-gray-200 min-h-[300px]">
        <FiLoader className="animate-spin text-orange-500" size={32} />
        <p className="mt-4 text-gray-400">Loading your details...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-gray-200">
      {!currentUser ? (
        <div className="bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold text-gray-200 mb-4">You're almost there!</h3>
          <p className="text-gray-400 mb-6">Please log in or sign up to complete your order.</p>
          <button
            type="button"
            onClick={openLoginPopup}
            className="w-full max-w-sm mx-auto bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-all"
          >
            Login / Sign Up to Continue
          </button>
        </div>
      ) : (
        <form onSubmit={handlePlaceOrder} className="space-y-6">
          {/* Personal Details Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Your Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={orderDetails.name}
                    onChange={(e) => setOrderDetails((prev) => ({ ...prev, name: e.target.value }))}
                    readOnly={!!currentUser}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                      currentUser
                        ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-700 border-gray-600 text-gray-200'
                    }`}
                    placeholder="Enter your full name"
                    required
                  />
                  {currentUser && (
                    <p className="text-xs text-gray-400 mt-2">Name pre-filled from your profile.</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Verified Phone *</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400" size={18} />
                  <input
                    type="tel"
                    value={orderDetails.phone || verifiedPhone}
                    readOnly
                    className="w-full pl-10 pr-12 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 font-mono cursor-not-allowed"
                    placeholder="+91 ..."
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FiCheckCircle size={16} className="text-green-400" />
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <FiCheckCircle size={14} className="text-green-400 mr-1" />
                  <p className="text-xs text-green-400">✓ Verified Phone Number</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Delivery Address</h3>

            {/* University Delivery Option */}
            <div className="mb-6 p-4 bg-orange-900/20 border border-orange-700/50 rounded-lg">
              <h4 className="font-medium text-orange-400 mb-3 flex items-center">
                🎓 Jaypee University Anoopshahr - Special Delivery
              </h4>
              {!orderDetails.isUniversity ? (
                <button
                  type="button"
                  onClick={handleUniversitySelect}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Select University Address
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-orange-300">Select your gate:</p>
                  <div className="flex flex-wrap gap-3">
                    {['Gate 1', 'Gate 2'].map((gate) => (
                      <button
                        key={gate}
                        type="button"
                        onClick={() => handleUniversityGateSelect(gate)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          orderDetails.universityGate === gate ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {gate}
                      </button>
                    ))}
                  </div>
                  {orderDetails.universityGate && (
                    <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-300">📍 {orderDetails.address}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setOrderDetails((prev) => ({
                        ...prev,
                        isUniversity: false,
                        universityGate: '',
                        address: '',
                      }))
                    }
                    className="text-sm text-orange-400 hover:text-orange-300 mt-2"
                  >
                    Use a different address
                  </button>
                </div>
              )}
            </div>

            {/* Saved Addresses */}
            {userProfile?.addresses && userProfile.addresses.length > 0 && !orderDetails.isUniversity && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Choose from saved addresses:</p>
                <div className="space-y-2">
                  {userProfile.addresses.map((address, index) => (
                    <button
                      key={address.id || index}
                      type="button"
                      onClick={() => handleAddressSelect(index)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        orderDetails.selectedAddressIndex === index
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
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

            {/* Manual Address Entry */}
            {!orderDetails.isUniversity && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Enter Delivery Address *</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <textarea
                    name="street-address"
                    autoComplete="street-address"
                    value={orderDetails.address}
                    onChange={(e) =>
                      setOrderDetails((prev) => ({ ...prev, address: e.target.value, selectedAddressIndex: null }))
                    }
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Enter your complete delivery address..."
                    required={!orderDetails.isUniversity}
                  />
                </div>
              </div>
            )}

            {/* Special Instructions */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Special Delivery Instructions (Optional)</label>
              <div className="relative">
                <FiMessageSquare className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <textarea
                  value={orderDetails.customMessage}
                  onChange={(e) => setOrderDetails((prev) => ({ ...prev, customMessage: e.target.value }))}
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="e.g., Call on arrival..."
                />
              </div>
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {cart.length > 0 ? (
                cart.map((item, index) => (
                  <div key={item.id || index} className="flex justify-between items-start bg-gray-700 p-3 rounded-lg">
                    <div className="flex-1 mr-4">
                      <h4 className="font-medium text-gray-200">{item.name}</h4>
                      {item.size && <p className="text-sm text-gray-400">Size: {item.size}</p>}
                      {item.crust && <p className="text-sm text-gray-400">Crust: {item.crust.name}</p>}
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-sm text-gray-400">Extras: {item.addons.map((addon) => addon.name).join(', ')}</p>
                      )}
                      <p className="text-sm text-gray-400">Quantity: {item.qty}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-400">₹{(item.totalPrice || item.price * item.qty).toFixed(2)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400">Your cart is empty.</p>
              )}
            </div>
            <div className="border-t border-gray-600 pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-200">Total Amount:</span>
                <span className="text-orange-400">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting || cart.length === 0}
            whileHover={{ scale: isSubmitting || cart.length === 0 ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting || cart.length === 0 ? 1 : 0.98 }}
            className="w-full bg-orange-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
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
      )}
    </div>
  );
}