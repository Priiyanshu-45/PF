import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { FiUsers, FiShoppingBag, FiSettings, FiLogOut, FiMenu, FiX, FiBarChart2 } from 'react-icons/fi'; // Changed FiBarChart3 to FiBarChart2
import OrderManagement from '../admin/OrderManagement';
import MenuManagement from '../admin/MenuManagement';
import PromotionsManagement from '../admin/PromotionsManagement';
import AnalyticsDashboard from '../admin/AnalyticsDashboard';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';

const AdminSidebar = ({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen }) => {
  const { signOutUser } = useAuth();

  const menuItems = [
    { id: 'orders', label: 'Orders', icon: FiShoppingBag },
    { id: 'menu', label: 'Menu Management', icon: FiMenu },
    { id: 'promotions', label: 'Promotions', icon: FiSettings },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2 }, // Fixed icon
  ];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: isMobileOpen || window.innerWidth >= 1024 ? 0 : -280 }}
        className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-50 lg:relative lg:translate-x-0"
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-200">Admin Panel</h2>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-orange-600 text-white border-r-4 border-orange-400'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 w-full p-6 border-t border-gray-700">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
          >
            <FiLogOut size={20} className="mr-3" />
            Sign Out
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { currentUser } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return <OrderManagement />;
      case 'menu':
        return <MenuManagement />;
      case 'promotions':
        return <PromotionsManagement />;
      case 'analytics':
        return <AnalyticsDashboard />;
      default:
        return <OrderManagement />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden text-gray-300 hover:text-white"
            >
              <FiMenu size={24} />
            </button>
            
            <h1 className="text-xl font-semibold text-gray-200 lg:text-left text-center flex-1 lg:flex-none">
              🍕 Pizza Farmhouse Admin
            </h1>
            
            <div className="hidden lg:flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                Welcome, {currentUser?.displayName || 'Admin'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
