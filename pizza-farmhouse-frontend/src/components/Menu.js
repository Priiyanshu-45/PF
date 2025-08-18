import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import MenuItemCard from "./MenuItemCard";
import MenuSkeleton from "./MenuSkeleton";
import toast from 'react-hot-toast';

export default function Menu() {
    const [menuData, setMenuData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "menu"), orderBy("category"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMenuData(categories);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching menu:", error);
            toast.error("Could not fetch menu. Check Firestore rules.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return <MenuSkeleton />;
    }

    return (
        <div>
            {/* The DealOfTheDayBanner is now in the Header */}
            <h1 className="text-4xl font-extrabold text-secondary mb-10 text-center tracking-tight">
                Our Menu
            </h1>
            {menuData.map(category => (
                <div key={category.id} className="mb-12">
                    <h2 className="text-3xl font-bold text-secondary mb-6 pb-2 border-b-2 border-primary inline-block">
                        {category.category}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {category.items && category.items
                            .filter(item => item.available !== false)
                            .map(item => (
                                <MenuItemCard key={item.name} item={item} />
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}