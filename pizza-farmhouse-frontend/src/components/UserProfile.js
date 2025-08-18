import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import { FiX, FiHome, FiPlus, FiTrash2, FiLoader, FiEdit3, FiLogOut, FiShoppingBag } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserProfile({ isOpen, onClose }) {
  const { userProfile, isGuest, currentUser, loading } = useAuth();
  
  const [name, setName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  // Order states are removed from this component

  // When the profile data loads, update the local name state
  useEffect(() => {
    if (userProfile?.name) {
      setName(userProfile.name);
    }
  }, [userProfile]);

  const handleUpdateName = async () => {
    if (name.trim() === '') return toast.error('Name cannot be empty.');
    if (!currentUser) return;
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userDocRef, { name: name.trim() });
      toast.success('Name updated!');
      setIsEditingName(false);
    } catch (error) {
      toast.error('Failed to update name.');
    }
  };

  const handleAddAddress = async () => {
    if (newAddress.trim() === '') return toast.error('Address cannot be empty.');
    if (userProfile.addresses && userProfile.addresses.length >= 3) return toast.error('You can only save up to 3 addresses.');
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userDocRef, { addresses: arrayUnion(newAddress.trim()) });
      setNewAddress('');
      toast.success('Address added!');
    } catch (error) {
      toast.error('Failed to add address.');
    }
  };

  const handleDeleteAddress = async (addressToDelete) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userDocRef, { addresses: arrayRemove(addressToDelete) });
      toast.success('Address removed.');
    } catch (error) {
      toast.error('Failed to remove address.');
    }
  };

  if (!isOpen) return null;

  const renderGuestView = () => (
    <div className="text-center p-8">
      <h3 className="text-xl font-bold text-secondary mb-2">Join the Pizza Farmhouse Family!</h3>
      <p className="text-gray-600 mb-4">Please log in to manage your profile and view past orders.</p>
      <button 
        onClick={onClose}
        className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600"
      >
        Login
      </button>
    </div>
  );

  const renderUserProfile = () => (
    <div className="space-y-6">
      {/* User Details Section */}
      <div>
        <h3 className="font-bold text-lg text-secondary mb-2">My Details</h3>
        <motion.div layout className="space-y-2">
          <p className="p-3 bg-gray-100 rounded-md"><strong>Phone:</strong> {currentUser?.phoneNumber}</p>
          <div className="flex gap-2">
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              onFocus={() => setIsEditingName(true)}
              placeholder="Your Name" 
              className="flex-grow p-3 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <AnimatePresence>
              {isEditingName && (
                <motion.button 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  onClick={handleUpdateName} 
                  className="bg-primary text-white p-3 rounded-lg hover:bg-orange-600"
                >
                  <FiEdit3 />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Saved Addresses Section */}
      <div>
        <h3 className="font-bold text-lg text-secondary mb-2">Saved Addresses</h3>
        <div className="space-y-2">
          <AnimatePresence>
            {userProfile?.addresses?.map((addr, index) => (
              <motion.div 
                key={addr}
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between p-3 bg-gray-100 rounded-md"
              >
                <div className="flex items-start"><FiHome className="mr-3 mt-1 text-primary" /><span>{addr}</span></div>
                <button onClick={() => handleDeleteAddress(addr)} className="text-red-500 hover:text-red-700 p-1"><FiTrash2 /></button>
              </motion.div>
            ))}
          </AnimatePresence>
          {(!userProfile?.addresses || userProfile.addresses.length === 0) && <p className="text-gray-500">You have no saved addresses.</p>}
        </div>
      </div>

      {/* Add New Address Section */}
      {(!userProfile?.addresses || userProfile.addresses.length < 3) && (
        <div>
          <h3 className="font-bold text-lg text-secondary mb-2">Add New Address</h3>
          <div className="flex gap-2">
            <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Enter new address" className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"/>
            <button onClick={handleAddAddress} className="bg-primary text-white p-3 rounded-lg hover:bg-orange-600"><FiPlus /></button>
          </div>
        </div>
      )}

      {/* The order section has been removed */}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col"
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-2xl font-bold text-secondary">My Profile</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><FiX size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {loading ? (
                <div className="flex justify-center items-center h-40"><FiLoader className="animate-spin text-primary" size={32} /></div>
              ) : isGuest ? renderGuestView() : renderUserProfile()}
            </div>
             {!isGuest && (
                <div className="p-4 border-t bg-gray-50">
                    <button 
                        onClick={() => { signOut(auth); onClose(); }} 
                        className="w-full flex items-center justify-center gap-2 text-red-500 font-semibold py-2 px-4 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        <FiLogOut /> Logout
                    </button>
                </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}