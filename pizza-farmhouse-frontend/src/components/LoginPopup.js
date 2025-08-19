import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPhone, FiUser } from 'react-icons/fi';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function LoginPopup({ isOpen, onClose, onLogin }) {
  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Set up and clean up reCAPTCHA verifier more reliably
  useEffect(() => {
    if (isOpen) {
      if (!window.recaptchaVerifier) {
        setupRecaptcha();
      }
    }
    // Cleanup on component unmount or close
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, [isOpen]);

  const setupRecaptcha = () => {
    try {
      // Ensure any old instance is cleared before creating a new one
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      
      // This sets up the INVISIBLE reCAPTCHA
      // It will only show a challenge if Google detects suspicious activity
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => console.log('reCAPTCHA auto-verified.'),
        'expired-callback': () => toast.error('Verification expired. Please try again.')
      });
    } catch (error) {
      console.error('reCAPTCHA setup error:', error);
      toast.error("Could not set up verification. Please refresh the page.");
    }
  };

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (phoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Running security check...'); // Provide feedback for the invisible check

    try {
      const formattedPhone = `+91${phoneNumber}`;
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        throw new Error("reCAPTCHA not ready. Please wait a moment and try again.");
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      toast.dismiss(toastId);
      toast.success('🎯 OTP sent successfully!');
      
      setConfirmationResult(confirmation);
      setStep('otp');
      setTimeLeft(60); // Start 60-second timer
    } catch (error) {
      toast.dismiss(toastId);
      console.error('OTP send error:', error);
      if (error.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please wait and try again.');
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only the last digit
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otpCode);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        onLogin(userData);
        toast.success(`Welcome back, ${userData.name}! 🎉`);
        resetFlow();
      } else {
        setStep('name');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      if (error.code === 'auth/invalid-verification-code') {
        toast.error('Invalid OTP. Please check and try again.');
      } else if (error.code === 'auth/code-expired') {
        toast.error('OTP has expired. Please request a new one.');
        setStep('phone');
      }
      else {
        toast.error('Verification failed. Please try again.');
      }
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Please enter a valid name');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      const userData = {
        uid: user.uid,
        name: name.trim(),
        phone: `+91${phoneNumber}`,
        email: user.email || '',
        createdAt: new Date(),
        addresses: [],
      };
      await setDoc(doc(db, 'users', user.uid), userData);
      onLogin(userData);
      toast.success(`Welcome, ${userData.name}! 🍕`);
      resetFlow();
    } catch (error) {
      console.error('Profile creation error:', error);
      toast.error('Failed to create profile.');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('phone');
    setPhoneNumber('');
    setOtp(['', '', '', '', '', '']);
    setName('');
    setConfirmationResult(null);
    setTimeLeft(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4"
          onClick={resetFlow}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 border border-gray-600 rounded-lg max-w-md w-full p-4 sm:p-6 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-200">
                {step === 'phone' && '📱 Login or Sign Up'}
                {step === 'otp' && '🔐 Verify Your Number'}
                {step === 'name' && '👋 Almost There!'}
              </h2>
              <button onClick={resetFlow} className="text-gray-400 hover:text-gray-200 p-1 rounded-full">
                <FiX size={24} />
              </button>
            </div>

            {step === 'phone' && (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      <FiPhone size={18} className="text-gray-400" />
                      <span className="text-gray-400 ml-2">🇮🇳 +91</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setPhoneNumber(val);
                      }}
                      className="w-full pl-[6.5rem] pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-lg tracking-wider focus:ring-2 focus:ring-orange-500"
                      placeholder="98765 43210"
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading || phoneNumber.length !== 10} className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:opacity-50 transition-all">
                  {loading ? 'Verifying...' : 'Send OTP'}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3 text-center">
                    Enter OTP sent to +91 {phoneNumber}
                  </label>
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="tel"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-orange-500"
                        maxLength={1}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={loading || otp.join('').length !== 6} className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:opacity-50 transition-all">
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                <div className="flex justify-between items-center text-sm">
                  <button type="button" onClick={() => setStep('phone')} className="text-blue-400 hover:text-blue-300">Change Number</button>
                  <button type="button" onClick={handleSendOTP} disabled={timeLeft > 0} className="text-orange-400 hover:text-orange-300 disabled:text-gray-500">
                    {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {step === 'name' && (
              <form onSubmit={handleCreateProfile} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Your Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter your full name"
                      autoFocus
                      autoComplete="name"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading || name.trim().length < 2} className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:opacity-50 transition-all">
                  {loading ? 'Saving...' : 'Complete Registration'}
                </button>
              </form>
            )}
            
            {/* This div is required for the invisible reCAPTCHA to work */}
            <div id="recaptcha-container"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}