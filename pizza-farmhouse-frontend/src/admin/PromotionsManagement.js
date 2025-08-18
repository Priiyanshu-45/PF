// src/admin/PromotionsManagement.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiToggleLeft, FiToggleRight, FiLoader, FiBell, FiPower } from 'react-icons/fi';

const Button = ({ isLoading, disabled, children, ...props }) => (
    <button {...props} disabled={isLoading || disabled} className="w-full flex justify-center bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
        {isLoading ? <FiLoader className="animate-spin" size={24} /> : children}
    </button>
);

export default function PromotionsManagement() {
    // CHANGED: State now manages a single promotion object
    const [promotion, setPromotion] = useState({ title: '', description: '', enabled: true });
    const [storeStatus, setStoreStatus] = useState({ open: true, message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        const fetchPromo = async () => {
            setIsFetching(true);
            const docRef = doc(db, 'promotions', 'main');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // CHANGED: Set a single promotion object, with a fallback
                setPromotion(data.promotion || { title: '', description: '', enabled: true });
                setStoreStatus(data.storeStatus || { open: true, message: '' });
            }
            setIsFetching(false);
        };
        fetchPromo();
    }, []);

    // CHANGED: Simplified handler for the single promotion object
    const handlePromoChange = (field, value) => {
        setPromotion(prev => ({ ...prev, [field]: value }));
    };

    // REMOVED: addPromoInput and removePromoInput are no longer needed

    const handleSaveChanges = async () => {
        setIsLoading(true);
        try {
            // CHANGED: Save the single promotion object
            await setDoc(doc(db, 'promotions', 'main'), { promotion, storeStatus });
            toast.success('Promotions and store status updated!');
        } catch (error) {
            console.error("Promotion save error:", error);
            toast.error("Failed to save changes.");
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isFetching) {
        return <div className="flex justify-center items-center h-64"><FiLoader className="animate-spin text-primary" size={32} /></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary mb-6">Promotions & Store Status</h1>
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center gap-3 mb-2"><FiPower size={24} className="text-secondary" /><h2 className="text-xl font-bold">Store Status</h2></div>
                    <p className="text-sm text-gray-500 mb-4">Temporarily close the store and display a pop-up to all customers.</p>
                    <div className="flex items-center gap-4 mb-4">
                        <p className="font-medium">Store is currently:</p>
                        <button onClick={() => setStoreStatus(prev => ({...prev, open: !prev.open}))} className={`font-semibold px-4 py-1 rounded-full ${storeStatus.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{storeStatus.open ? "OPEN" : "CLOSED"}</button>
                    </div>
                    {!storeStatus.open && (
                        <input value={storeStatus.message} onChange={(e) => setStoreStatus(prev => ({...prev, message: e.target.value}))} placeholder="e.g., We are closed for Diwali." className="w-full p-2 border rounded-md"/>
                    )}
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center gap-3 mb-2"><FiBell size={24} className="text-secondary" /><h2 className="text-xl font-bold">Promotional Pop-up</h2></div>
                    <p className="text-sm text-gray-500 mb-4">Create a special offer pop-up to show customers when they visit.</p>
                    <div className="space-y-4">
                        {/* CHANGED: Replaced map with static inputs for one promotion */}
                        <div className="flex items-center gap-2">
                             <p className="font-medium w-24">Enabled:</p>
                             <button onClick={() => handlePromoChange('enabled', !promotion.enabled)} className={`p-2 rounded-full ${promotion.enabled ? 'text-green-500' : 'text-gray-400'}`}>{promotion.enabled ? <FiToggleRight size={32}/> : <FiToggleLeft size={32}/>}</button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Offer Title</label>
                            <input 
                                type="text" 
                                value={promotion.title} 
                                onChange={(e) => handlePromoChange('title', e.target.value)} 
                                placeholder="e.g., 20% OFF on all pizzas!" 
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                             <textarea 
                                value={promotion.description} 
                                onChange={(e) => handlePromoChange('description', e.target.value)} 
                                placeholder="e.g., Use code PIZZA20. Valid for a limited time." 
                                className="w-full p-2 border rounded-md"
                                rows="3"
                             />
                        </div>
                        {/* REMOVED: "Add Offer" button */}
                    </div>
                </div>
                <Button onClick={handleSaveChanges} isLoading={isLoading}>Save All Changes</Button>
            </div>
        </div>
    );
};