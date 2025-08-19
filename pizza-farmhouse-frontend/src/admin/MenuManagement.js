import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiUpload, FiSave, FiX, FiImage } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, orderBy, query } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Cloudinary configuration
const cloudinaryConfig = {
  cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'pizza_farmhouse'
};

// Cloudinary upload function
const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  return response.json();
};

// Cloudinary delete function
const deleteFromCloudinary = async (imageUrl) => {
  try {
    // Extract public_id from Cloudinary URL
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];

    // Call your backend to delete (you'll need to implement this endpoint)
    const response = await fetch('http://localhost:4000/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId })
    });

    if (response.ok) {
      console.log('Image deleted from Cloudinary');
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

const MenuItemForm = ({ item = null, categoryId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    image: item?.image || '',
    available: item?.available !== false,
    sizes: item?.sizes || {}
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [hasSizes, setHasSizes] = useState(!!item?.sizes && Object.keys(item.sizes).length > 0);
  const [sizeEntries, setSizeEntries] = useState(
    item?.sizes ? Object.entries(item.sizes) : [['Small', ''], ['Medium', ''], ['Large', '']]
  );

  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, image: result.secure_url }));
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter item name');
      return;
    }
    
    if (!hasSizes && !formData.price) {
      toast.error('Please enter price');
      return;
    }

    let finalSizes = {};
    if (hasSizes) {
      sizeEntries.forEach(([size, price]) => {
        if (size.trim() && price) {
          finalSizes[size.trim()] = parseInt(price);
        }
      });
      
      if (Object.keys(finalSizes).length === 0) {
        toast.error('Please add at least one size with price');
        return;
      }
    }

    const itemData = {
      ...formData,
      price: hasSizes ? 0 : parseInt(formData.price),
      sizes: hasSizes ? finalSizes : null,
      available: formData.available
    };

    // If we're updating and the image changed, delete the old image
    if (item && item.image && item.image !== formData.image) {
      await deleteFromCloudinary(item.image);
    }

    onSave(itemData, item?.id);
  };

  const addSizeEntry = () => {
    setSizeEntries([...sizeEntries, ['', '']]);
  };

  const removeSizeEntry = (index) => {
    setSizeEntries(sizeEntries.filter((_, i) => i !== index));
  };

  const updateSizeEntry = (index, field, value) => {
    const newEntries = [...sizeEntries];
    newEntries[index][field === 'size' ? 0 : 1] = value;
    setSizeEntries(newEntries);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6"
    >
      <h3 className="text-lg font-bold text-gray-200 mb-4">
        {item ? 'Edit Menu Item' : 'Add New Menu Item'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
              placeholder="Enter item name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image
            </label>
            <div className="flex space-x-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setImageFile(file);
                    handleImageUpload(file);
                  }
                }}
                className="hidden"
                id="imageUpload"
              />
              <label
                htmlFor="imageUpload"
                className="flex-1 flex items-center justify-center p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer transition-colors"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500 mr-2"></div>
                ) : (
                  <FiUpload size={16} className="mr-2" />
                )}
                {uploading ? 'Uploading...' : 'Upload Image'}
              </label>
            </div>
            {formData.image && (
              <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden bg-gray-700">
                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
            placeholder="Enter item description"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={hasSizes}
              onChange={(e) => setHasSizes(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
            />
            <span className="ml-2 text-sm text-gray-300">Has multiple sizes</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.available}
              onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
              className="rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
            />
            <span className="ml-2 text-sm text-gray-300">Available</span>
          </label>
        </div>

        {!hasSizes ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price *
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
              placeholder="Enter price"
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sizes & Prices
            </label>
            <div className="space-y-2">
              {sizeEntries.map(([size, price], index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => updateSizeEntry(index, 'size', e.target.value)}
                    placeholder="Size name"
                    className="flex-1 p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                  />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => updateSizeEntry(index, 'price', e.target.value)}
                    placeholder="Price"
                    className="w-24 p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-200 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSizeEntry(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSizeEntry}
                className="w-full p-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
              >
                + Add Size
              </button>
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <FiSave size={16} className="inline mr-2" />
            {item ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const CategorySection = ({ category, onAddItem, onEditItem, onDeleteItem }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg mb-6">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-200">{category.category}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddItem(category.id);
              }}
              className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              <FiPlus size={14} className="inline mr-1" />
              Add Item
            </button>
            <span className="text-gray-400">
              {isExpanded ? '−' : '+'}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-600"
          >
            {category.items && category.items.length > 0 ? (
              <div className="p-4 space-y-3">
                {category.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-4 flex items-center space-x-4"
                  >
                    <div className="w-16 h-16 bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiImage size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-200 truncate">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-400 truncate mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        {item.sizes ? (
                          <span className="text-sm text-orange-400">
                            {Object.entries(item.sizes).map(([size, price]) => 
                              `${size}: ₹${price}`
                            ).join(', ')}
                          </span>
                        ) : (
                          <span className="text-sm text-orange-400">₹{item.price}</span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.available !== false 
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {item.available !== false ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEditItem(category.id, item, index)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                      >
                        <FiEdit size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteItem(category.id, item, index)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <FiImage size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No items in this category</p>
                <button
                  onClick={() => onAddItem(category.id)}
                  className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Add First Item
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function MenuManagement() {
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "menu"), orderBy("category"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenuData(categories);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching menu:", error);
      toast.error("Failed to load menu");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddItem = (categoryId) => {
    setCurrentCategoryId(categoryId);
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (categoryId, item, itemIndex) => {
    setCurrentCategoryId(categoryId);
    setEditingItem({ ...item, index: itemIndex });
    setShowForm(true);
  };

  const handleSaveItem = async (itemData, itemId = null) => {
    try {
      const category = menuData.find(cat => cat.id === currentCategoryId);
      const updatedItems = [...(category.items || [])];

      if (editingItem && editingItem.index !== undefined) {
        // Editing existing item
        updatedItems[editingItem.index] = itemData;
      } else {
        // Adding new item
        updatedItems.push(itemData);
      }

      await updateDoc(doc(db, 'menu', currentCategoryId), {
        items: updatedItems
      });

      toast.success(editingItem ? 'Item updated successfully' : 'Item added successfully');
      setShowForm(false);
      setEditingItem(null);
      setCurrentCategoryId(null);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (categoryId, item, itemIndex) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      // Delete image from Cloudinary if exists
      if (item.image) {
        await deleteFromCloudinary(item.image);
      }

      const category = menuData.find(cat => cat.id === categoryId);
      const updatedItems = category.items.filter((_, index) => index !== itemIndex);

      await updateDoc(doc(db, 'menu', categoryId), {
        items: updatedItems
      });

      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    setCurrentCategoryId(null);
  };

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-300">Loading menu...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-200">Menu Management</h2>
        </div>

        {showForm && (
          <MenuItemForm
            item={editingItem}
            categoryId={currentCategoryId}
            onSave={handleSaveItem}
            onCancel={handleCancel}
          />
        )}

        <div className="space-y-6">
          {menuData.map(category => (
            <CategorySection
              key={category.id}
              category={category}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
            />
          ))}
        </div>

        {menuData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍕</div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No menu categories found</h3>
            <p className="text-gray-400">Create categories in your Firestore database first</p>
          </div>
        )}
      </div>
    </div>
  );
}
