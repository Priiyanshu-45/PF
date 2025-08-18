// src/components/AdminLogin.js
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext'; // Import useAuth to check admin status

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, currentUser } = useAuth(); // Get admin status from context

  // --- REDIRECT FIX ---
  // This effect runs when the component loads or when isAdmin/currentUser changes.
  // If the user is already an admin, it sends them straight to the dashboard.
  useEffect(() => {
    if (isAdmin && currentUser) {
      navigate('/admin/dashboard');
    }
  }, [isAdmin, currentUser, navigate]);
  // --- END OF FIX ---

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // We still sign in here, but we no longer navigate immediately.
      // The useEffect above will handle the navigation once the AuthContext updates.
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful! Redirecting...');
    } catch (err) {
      setError('Failed to log in. Please check your email and password.');
      toast.error('Login failed.');
      setLoading(false); // Only set loading to false on error
    }
    // Do not set loading to false on success, to prevent button re-enabling before redirect.
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-secondary">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-600 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mt-2 text-gray-700 bg-gray-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-600 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-2 text-gray-700 bg-gray-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 font-bold text-white bg-primary rounded-lg hover:bg-orange-600 transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
