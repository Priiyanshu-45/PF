import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

// This is our custom hook! It now handles all the real-time logic for fetching the menu.
export function useMenuData() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "menu"), orderBy("category"));
    
    // Use onSnapshot to listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(cats);
        setLoading(false);
    }, (error) => {
        console.error("Menu snapshot error:", error);
        toast.error("Could not fetch menu. Please check your network and Firestore rules.");
        setLoading(false);
    });

    // This cleanup function detaches the listener when the component unmounts
    return () => unsubscribe();
  }, []); // The empty dependency array means this runs only once on mount

  // The hook returns the data and loading state, just like useState.
  return { categories, loading };
}