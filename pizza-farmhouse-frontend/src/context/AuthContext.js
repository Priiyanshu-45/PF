import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // This listener handles all authentication changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        // If a user is logged in, set up a REAL-TIME listener for their profile
        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            // User profile exists, update the state
            const userData = docSnapshot.data();
            setUserProfile(userData);
            // Check for admin role
            const adminEmails = ['admin@pizzafarmhouse.com', 'admin@pizza.com'];
            setIsAdmin(adminEmails.includes(userData.email || ''));
          } else {
            // This case occurs briefly for a new user before their profile is created in the LoginPopup
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
            console.error("Error listening to user profile:", error);
            setUserProfile(null);
            setLoading(false);
        });
        
        return () => unsubscribeProfile(); // Cleanup the profile listener when auth state changes
      } else {
        // User is logged out, clear all related state
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth(); // Cleanup the auth listener on component unmount
  }, []);

  const signOutUser = async () => {
    try {
      await auth.signOut();
      // State will be automatically cleared by the onAuthStateChanged listener above
      toast.success("You've been signed out.");
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error("Failed to sign out.");
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdmin,
    isGuest: !currentUser, // A derived value is cleaner than managing a separate state
    signOutUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};