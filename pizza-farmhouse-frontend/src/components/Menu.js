import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import MenuItemCard from "./MenuItemCard";
import MenuSkeleton from "./MenuSkeleton";
import toast from 'react-hot-toast';

export default function Menu({ onCategoriesLoad }) {
  const [menuData, setMenuData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "menu"), orderBy("category"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setMenuData(categories);
      setIsLoading(false);
      
      // Send categories to parent for navigation (exclude addon categories from navigation)
      if (onCategoriesLoad) {
        const mainCategories = categories.filter(category => {
          const categoryName = category.category?.toLowerCase() || '';
          return !categoryName.includes('addon') && 
                 !categoryName.includes('add-on') && 
                 !categoryName.includes('extra cheese') &&
                 !categoryName.includes('topping') &&
                 categoryName !== 'addons' &&
                 categoryName !== 'extra cheese_add-ons' &&
                 categoryName !== 'pizza topping';
        });
        
        onCategoriesLoad(mainCategories.map(cat => ({ 
          id: cat.id, 
          name: cat.category 
        })));
      }
    }, (error) => {
      console.error("Error fetching menu:", error);
      toast.error("Could not fetch menu. Please try again.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [onCategoriesLoad]);

  if (isLoading) {
    return <MenuSkeleton />;
  }

  // Filter main categories for display (but keep addons data for items)
  const displayCategories = menuData.filter(category => {
    const categoryName = category.category?.toLowerCase() || '';
    return !categoryName.includes('addon') && 
           !categoryName.includes('add-on') && 
           !categoryName.includes('extra cheese') &&
           !categoryName.includes('topping') &&
           categoryName !== 'addons' &&
           categoryName !== 'extra cheese_add-ons' &&
           categoryName !== 'pizza topping';
  });

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-900 min-h-screen">
      {displayCategories.map(category => (
        <div key={category.id} id={`category-${category.id}`} className="mb-8 scroll-mt-32">
          <h2 className="text-2xl font-bold text-gray-200 mb-6 pb-2 border-b border-gray-700 sticky top-20 bg-gray-900 z-10 py-2">
            {category.category}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {category.items && category.items
              .filter(item => item && item.available !== false)
              .map((item, index) => (
                <MenuItemCard
                  key={`${item.id || item.name}-${category.id}-${index}`}
                  item={item}
                  category={category}
                  allMenuData={menuData} // Pass all menu data for addons
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
