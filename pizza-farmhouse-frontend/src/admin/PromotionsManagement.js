import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiSave, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function PromotionsManagement() {
  const [promotionData, setPromotionData] = useState({
    promotion: {
      enabled: false,
      title: '',
      description: ''
    },
    storeStatus: {
      open: true,
      message: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "promotions", "main"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPromotionData(data);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching promotions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "promotions", "main"), promotionData);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving promotions:', error);
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const togglePromotion = () => {
    setPromotionData(prev => ({
      ...prev,
      promotion: {
        ...prev.promotion,
        enabled: !prev.promotion.enabled
      }
    }));
  };

  const toggleStore = () => {
    setPromotionData(prev => ({
      ...prev,
      storeStatus: {
        ...prev.storeStatus,
        open: !prev.storeStatus.open
      }
    }));
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-300">Loading promotions...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-200">Promotions & Store Settings</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <FiSave size={16} className="inline mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Store Status */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-200 flex items-center">
              🏪 Store Status
            </h3>
            <button
              onClick={toggleStore}
              className="flex items-center space-x-2"
            >
              {promotionData.storeStatus.open ? (
                <FiToggleRight size={32} className="text-green-500" />
              ) : (
                <FiToggleLeft size={32} className="text-red-500" />
              )}
              <span className={`font-medium ${
                promotionData.storeStatus.open ? 'text-green-400' : 'text-red-400'
              }`}>
                {promotionData.storeStatus.open ? 'Open' : 'Closed'}
              </span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Store Closed Message (optional)
            </label>
            <textarea
              value={promotionData.storeStatus.message || ''}
              onChange={(e) => setPromotionData(prev => ({
                ...prev,
                storeStatus: {
                  ...prev.storeStatus,
                  message: e.target.value
                }
              }))}
              rows={3}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
              placeholder="Enter message to show when store is closed..."
            />
          </div>
        </div>

        {/* Promotion Settings */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-200 flex items-center">
              <FiBell size={20} className="mr-2" />
              Promotional Banner
            </h3>
            <button
              onClick={togglePromotion}
              className="flex items-center space-x-2"
            >
              {promotionData.promotion.enabled ? (
                <FiToggleRight size={32} className="text-green-500" />
              ) : (
                <FiToggleLeft size={32} className="text-gray-500" />
              )}
              <span className={`font-medium ${
                promotionData.promotion.enabled ? 'text-green-400' : 'text-gray-400'
              }`}>
                {promotionData.promotion.enabled ? 'Active' : 'Inactive'}
              </span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Promotion Title *
              </label>
              <input
                type="text"
                value={promotionData.promotion.title || ''}
                onChange={(e) => setPromotionData(prev => ({
                  ...prev,
                  promotion: {
                    ...prev.promotion,
                    title: e.target.value
                  }
                }))}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                placeholder="Enter promotion title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Promotion Description (optional)
              </label>
              <textarea
                value={promotionData.promotion.description || ''}
                onChange={(e) => setPromotionData(prev => ({
                  ...prev,
                  promotion: {
                    ...prev.promotion,
                    description: e.target.value
                  }
                }))}
                rows={3}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                placeholder="Enter promotion description..."
              />
            </div>
          </div>

          {/* Preview */}
          {promotionData.promotion.enabled && promotionData.promotion.title && (
            <div className="mt-6 p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg">
              <div className="flex items-center justify-center text-sm">
                <FiBell className="mr-2 text-base" />
                <span className="font-medium">{promotionData.promotion.title}</span>
                {promotionData.promotion.description && (
                  <span className="ml-2 text-xs opacity-90 hidden sm:inline">
                    - {promotionData.promotion.description}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <h4 className="font-medium text-blue-400 mb-2">How it works:</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Toggle "Active" to enable/disable the promotional banner</li>
            <li>• When active, the banner shows as a popup to new visitors</li>
            <li>• After users close the popup, it moves to the header</li>
            <li>• Changes are applied instantly to all users</li>
            <li>• When store is closed, customers cannot place orders</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
