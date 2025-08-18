import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGrid, FiShoppingBag, FiEdit, FiBell, FiLogOut } from 'react-icons/fi';

import Analytics from '../admin/Analytics';
import OrderManagement from '../admin/OrderManagement';
import MenuManagement from '../admin/MenuManagement';
import PromotionsManagement from '../admin/PromotionsManagement';

import newOrderSound from '../assets/new-order-sound.mp3';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  const audioRef = useRef(new Audio(newOrderSound));
  const isInitialLoad = useRef(true);

  // This useEffect plays a sound whenever a new order is detected.
  // It's a high-level listener that works no matter which tab is active.
  useEffect(() => {
    // Only listen for new orders with "Order Placed" status
    const q = query(collection(db, "orders"), where("status", "==", "Order Placed"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        // This checks if the snapshot is not empty and it's not the initial load
        if (!isInitialLoad.current && snapshot.docs.length > 0) {
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }
        isInitialLoad.current = false;
    });

    return () => unsubscribe();
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics': return <Analytics />;
      case 'orders': return <OrderManagement />;
      case 'menu': return <MenuManagement />;
      case 'promotions': return <PromotionsManagement />;
      default: return null;
    }
  };

  const NavItem = ({ tabName, icon, label }) => (
    <button onClick={() => setActiveTab(tabName)} className={`flex items-center w-full px-4 py-3 text-left transition-colors ${activeTab === tabName ? 'bg-primary text-white' : 'text-gray-600 hover:bg-orange-100'}`}>
      {icon} <span className="ml-3 font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg flex flex-col flex-shrink-0">
        <div className="p-6 text-center border-b">
          <h1 className="text-2xl font-bold text-primary">Pizza Farmhouse</h1>
          <p className="text-sm text-gray-500">Admin Panel</p>
        </div>
        <nav className="flex-grow py-4">
          <NavItem tabName="orders" icon={<FiShoppingBag />} label="Live Orders" />
          <NavItem tabName="menu" icon={<FiEdit />} label="Menu Editor" />
          <NavItem tabName="promotions" icon={<FiBell />} label="Promotions" />
          <NavItem tabName="analytics" icon={<FiGrid />} label="Analytics" />
        </nav>
        <div className="p-4 border-t">
          <button onClick={() => signOut(auth)} className="flex items-center w-full px-4 py-3 text-left text-red-500 hover:bg-red-50 rounded-lg transition-colors font-semibold">
            <FiLogOut /> <span className="ml-3">Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}