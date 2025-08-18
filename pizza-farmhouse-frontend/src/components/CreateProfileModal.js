// src/components/CreateProfileModal.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiLoader, FiX } from 'react-icons/fi';

export default function CreateProfileModal({ isOpen, onClose, onProfileCreated }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Please enter your name.');
    
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const profileData = {
        name: formData.name,
        email: formData.email,
        phone: currentUser.phoneNumber,
        addresses: [],
      };
      await setDoc(userDocRef, profileData);
      toast.success('Profile created successfully!');
      onProfileCreated();
    } catch (error) { toast.error('Failed to create profile.'); }
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200">
          <FiX size={24} />
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-secondary">Complete Your Profile</h2>
          <p className="text-gray-600">Welcome! Just one more step to continue.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input name="name" type="text" onChange={handleChange} required className="mt-1 block w-full border rounded-md py-2 px-3"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email (Optional for Customers)</label>
            <input name="email" type="email" onChange={handleChange} className="mt-1 block w-full border rounded-md py-2 px-3"/>
          </div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-primary text-white font-bold py-3 px-4 rounded-lg">
            {isLoading ? <FiLoader className="animate-spin" size={24} /> : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}