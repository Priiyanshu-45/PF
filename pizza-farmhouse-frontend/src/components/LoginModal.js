// src/components/LoginModal.js
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiX, FiLoader } from 'react-icons/fi';

export default function LoginModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('details'); // 'details', 'otp'
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const setupRecaptcha = () => {
    // This ensures reCAPTCHA is only set up once
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name.");
    if (!phone.match(/^[6-9]\d{9}$/)) return toast.error("Please enter a valid 10-digit phone number.");
    
    setIsLoading(true);
    setupRecaptcha(); // Setup reCAPTCHA verifier
    
    try {
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = `+91${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setConfirmationResult(result);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } catch (error)
    {
      console.error("OTP Send Error:", error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Please enter a valid 6-digit OTP.");
    
    setIsLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      // --- AUTOMATIC PROFILE CREATION ---
      // Create a user profile in Firestore with their name and phone number
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name: name,
        phone: phone,
        createdAt: serverTimestamp(),
      }, { merge: true }); // Use merge to avoid overwriting existing data if any
      
      toast.success('🎉 Logged in successfully!');
      onClose(); // Close the modal on success
    } catch (error) {
      console.error("OTP Verify Error:", error);
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    // Reset state when closing
    setStep('details');
    setName('');
    setPhone('');
    setOtp('');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* This div is for the invisible reCAPTCHA */}
      <div id="recaptcha-container"></div>
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200">
          <FiX size={24} />
        </button>

        {step === 'details' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <h2 className="text-2xl font-bold text-secondary">Login or Signup</h2>
            <p className="text-gray-600">Enter your details to continue.</p>
            <div>
              <label className="text-sm font-medium text-gray-700">Your Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" className="mt-1 w-full border rounded-md py-2 px-3"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Mobile Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">+91</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" className="w-full border rounded-md py-2 pl-10 pr-3"/>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-primary text-white font-bold py-3 px-4 rounded-lg">
              {isLoading ? <FiLoader className="animate-spin" size={24} /> : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <h2 className="text-2xl font-bold text-secondary">Verify OTP</h2>
            <p className="text-gray-600">Enter the 6-digit code sent to +91 {phone}.</p>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" className="w-full border rounded-md py-2 px-3 text-center tracking-[0.5em]"/>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-primary text-white font-bold py-3 px-4 rounded-lg">
              {isLoading ? <FiLoader className="animate-spin" size={24} /> : 'Verify & Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
