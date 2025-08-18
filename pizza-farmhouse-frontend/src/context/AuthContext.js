// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast'; // Import toast for error handling

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // --- THIS ENTIRE BLOCK IS NOW ERROR-PROOF ---
      try {
        if (user) {
          setCurrentUser(user);
          setIsGuest(false);

          const idTokenResult = await user.getIdTokenResult(true);
          setIsAdmin(idTokenResult.claims.admin === true);
          
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          setUserProfile(docSnap.exists() ? docSnap.data() : null);

        } else {
          setCurrentUser(null);
          setIsGuest(true);
          setUserProfile(null);
          setIsAdmin(false);
        }
      } catch (error) {
        // If any error occurs (network, permissions, etc.), we catch it here.
        console.error("Authentication Error:", error);
        toast.error("Could not verify user. Please try again.");
        // Reset to a safe, logged-out state.
        setCurrentUser(null);
        setIsGuest(true);
        setIsAdmin(false);
      } finally {
        // --- THIS IS THE GUARANTEE ---
        // This line will ALWAYS run, whether the try block succeeds or fails.
        // This ensures the app can never get stuck in a loading state.
        setAuthLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    isAdmin,
    isGuest,
    loading: authLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!authLoading && children}
    </AuthContext.Provider>
  );
}
