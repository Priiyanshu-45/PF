// src/admin/MenuManagement.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiLoader, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiX, FiUploadCloud, FiCrop, FiEdit } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const Input = (props) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{props.label}</label>
      <input {...props} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
    </div>
);
const Button = ({ isLoading, disabled, children, ...props }) => (
    <button {...props} disabled={isLoading || disabled} className="w-full flex justify-center bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
      {isLoading ? <FiLoader className="animate-spin" size={24} /> : children}
    </button>
);
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl">
                <p className="text-lg mb-4">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg">Confirm</button>
                </div>
            </div>
        </div>
    );
};

export default function MenuManagement() {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const initialFormState = { name: '', description: '', category: '', images: [], available: true, price: '', sizes: {} };
    const [form, setForm] = useState(initialFormState);
    const [sizeInputs, setSizeInputs] = useState([{ size: '', price: '' }]);
    const [hasSizes, setHasSizes] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, item: null, category: null });

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    useEffect(() => {
        const q = query(collection(db, "menu"), orderBy("category"));
        const unsub = onSnapshot(q, (snapshot) => {
            setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.error("Menu snapshot error: ", error);
            toast.error("Could not fetch menu. Check Firestore rules.");
        });
        return () => unsub();
    }, []);

    const resetForm = () => {
        setEditingItem(null);
        setForm(initialFormState);
        setSizeInputs([{ size: '', price: '' }]);
        setHasSizes(false);
    };

    const handleEdit = (item, category) => {
        setEditingItem({ ...item, categoryId: category.id, originalName: item.name });
        setForm({
            name: item.name,
            description: item.description || '',
            category: category.category,
            images: item.images || [],
            available: item.available !== false,
            price: item.price || '',
            sizes: item.sizes || {}
        });
        if (item.sizes && Object.keys(item.sizes).length > 0) {
            setHasSizes(true);
            setSizeInputs(Object.entries(item.sizes).map(([size, price]) => ({ size, price: String(price) })));
        } else {
            setHasSizes(false);
            setSizeInputs([{ size: '', price: '' }]);
        }
        window.scrollTo(0, 0);
    };

    const onDrop = useCallback(acceptedFiles => {
        if (form.images.length >= 3) { toast.error("Maximum of 3 images reached."); return; }
        const reader = new FileReader();
        reader.onload = () => setImageToCrop(reader.result);
        reader.readAsDataURL(acceptedFiles[0]);
    }, [form.images.length]);

    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });

    function onImageLoad(e) {
        const { width, height } = e.currentTarget;
        const crop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height), width, height);
        setCrop(crop);
    }

    const handleCropAndUpload = async () => {
        if (!completedCrop || !imgRef.current) return;
        setIsUploading(true);
        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        try {
            const response = await fetch('http://localhost:4000/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: dataUrl }),
            });
            if (!response.ok) throw new Error('Upload failed');
            const result = await response.json();
            setForm(prev => ({ ...prev, images: [...prev.images, result.secure_url] }));
            setImageToCrop(null);
            setCompletedCrop(null);
            toast.success("Image added!");
        } catch (error) {
            console.error(error);
            toast.error("Image upload failed. Is your backend server running?");
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleRemoveImage = (imgUrl) => setForm(prev => ({ ...prev, images: prev.images.filter(url => url !== imgUrl) }));

    const handleAddCategory = async () => {
        if (newCategory.trim() === '') return toast.error("Category name can't be empty.");
        setIsAddingCategory(true);
        try {
            await addDoc(collection(db, 'menu'), { category: newCategory.trim(), items: [] });
            toast.success(`Category "${newCategory.trim()}" added!`);
            setNewCategory('');
        } catch (error) { toast.error("Failed to add category."); }
        finally { setIsAddingCategory(false); }
    };

    const handleToggleAvailability = async (item, category) => {
        const categoryRef = doc(db, 'menu', category.id);
        const updatedItems = category.items.map(i => i.name === item.name ? { ...i, available: i.available === false ? true : false } : i);
        try {
            await updateDoc(categoryRef, { items: updatedItems });
            toast.success(`${item.name} is now ${item.available === false ? "available" : "unavailable"}`);
        } catch { toast.error("Failed to update status."); }
    };

    const handleDeleteItem = async () => {
        const { item, category } = deleteConfirmation;
        if (!item || !category) return;
        const categoryRef = doc(db, 'menu', category.id);
        const updatedItems = category.items.filter(i => i.name !== item.name);
        try {
            await updateDoc(categoryRef, { items: updatedItems });
            toast.success(`${item.name} deleted.`);
        } catch { toast.error("Failed to delete item."); }
        finally {
            setDeleteConfirmation({ isOpen: false, item: null, category: null });
        }
    };
    
    const handleAddOrUpdateItem = async (e) => {
        e.preventDefault();
        if (!form.category) return toast.error("Please select a category.");
        if (!hasSizes && !form.price) return toast.error("Please add a price.");
        if (hasSizes && sizeInputs.every(s => !s.size || !s.price)) return toast.error("Please add at least one valid size and price.");
        
        setIsSubmitting(true);
        const targetCategoryDoc = categories.find(c => c.category === form.category);
        if (!targetCategoryDoc) {
            toast.error("Category not found!");
            setIsSubmitting(false);
            return;
        }

        const categoryRef = doc(db, 'menu', targetCategoryDoc.id);
        const newItemData = {
            name: form.name, description: form.description, images: form.images, available: form.available !== false,
            ...(hasSizes ? { sizes: sizeInputs.reduce((acc, curr) => { if (curr.size && curr.price) acc[curr.size.trim()] = Number(curr.price); return acc; }, {}) } : { price: Number(form.price) })
        };

        try {
            let updatedItems;
            if (editingItem) {
                updatedItems = targetCategoryDoc.items.map(i => i.name === editingItem.originalName ? newItemData : i);
            } else {
                updatedItems = [...(targetCategoryDoc.items || []), newItemData];
            }
            await updateDoc(categoryRef, { items: updatedItems });
            toast.success(editingItem ? "Item updated!" : "Item added!");
            resetForm();
        } catch (error) { console.error(error); toast.error("Failed to update menu."); }
        finally { setIsSubmitting(false); }
    };
    
    return (
        <div>
            <ConfirmModal 
                isOpen={deleteConfirmation.isOpen}
                message={`Are you sure you want to delete ${deleteConfirmation.item?.name}?`}
                onConfirm={handleDeleteItem}
                onCancel={() => setDeleteConfirmation({ isOpen: false, item: null, category: null })}
            />
            <h1 className="text-3xl font-bold text-secondary mb-6">Menu Editor</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg h-fit sticky top-8">
                    <h2 className="text-2xl font-bold mb-4">{editingItem ? "Edit Item" : "Add New Item"}</h2>
                    <form onSubmit={handleAddOrUpdateItem} className="space-y-4">
                        <Input label="Item Name" placeholder="e.g., Margherita Pizza" name="name" value={form.name} onChange={handleChange} required />
                        <textarea placeholder="Description (Optional)" rows={3} value={form.description} name="description" onChange={handleChange} className="w-full p-2 border rounded" />
                        <select name="category" value={form.category} onChange={handleChange} className="w-full p-2 border rounded" required>
                            <option value="">Select a Category</option>
                            {categories.map(c => <option key={c.id} value={c.category}>{c.category}</option>)}
                        </select>
                        <div {...getRootProps()} className="p-6 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-gray-50"><input {...getInputProps()} /><FiUploadCloud className="mx-auto text-gray-400" size={30} /><p className="text-xs text-gray-500">Drop files or click to upload</p></div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {form.images.map(url => (
                                <div key={url} className="relative w-20 h-20"><img src={url} alt="preview" className="w-full h-full object-cover rounded" /><button type="button" onClick={() => handleRemoveImage(url)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><FiX size={12}/></button></div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">Has multiple sizes?</label>
                            <button type="button" onClick={() => setHasSizes(!hasSizes)} className={`p-1 rounded-full ${hasSizes ? 'text-green-500' : 'text-red-500'}`}>{hasSizes ? <FiToggleRight size={24}/> : <FiToggleLeft size={24}/>}</button>
                        </div>
                        {hasSizes ? (
                            <div className="space-y-2 border-t pt-4">
                                {sizeInputs.map((input, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <input placeholder="Size (e.g., Small)" value={input.size} onChange={(e) => { const newSizes = [...sizeInputs]; newSizes[index].size = e.target.value; setSizeInputs(newSizes); }} className="w-1/2 p-2 border rounded"/>
                                        <input placeholder="Price" type="number" value={input.price} onChange={(e) => { const newSizes = [...sizeInputs]; newSizes[index].price = e.target.value; setSizeInputs(newSizes); }} className="w-1/2 p-2 border rounded"/>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setSizeInputs([...sizeInputs, { size: '', price: '' }])} className="text-sm text-primary font-semibold">+ Add Size</button>
                            </div>
                        ) : (
                             <Input label="Price" placeholder="e.g., 250" name="price" type="number" value={form.price} onChange={handleChange} />
                        )}
                        <Button type="submit" isLoading={isSubmitting}>{editingItem ? "Update Item" : "Add Item"}</Button>
                        {editingItem && <button type="button" onClick={resetForm} className="w-full text-center mt-2 text-sm text-gray-500 hover:text-primary">Cancel Edit</button>}
                    </form>
                </div>
                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Manage Categories</h2>
                        <div className="flex gap-2">
                            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New Category Name" className="flex-grow p-2 border rounded"/>
                            <button type="button" onClick={handleAddCategory} disabled={isAddingCategory} className="bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300">{isAddingCategory ? <FiLoader className="animate-spin"/> : <FiPlus />}</button>
                        </div>
                    </div>
                    {categories.map(cat => (
                        <div key={cat.id} className="bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="font-semibold text-xl border-b pb-2 mb-4">{cat.category}</h3>
                            <div className="space-y-2">
                                {(cat.items || []).map(item => (
                                    <div key={item.name} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                        <div className="flex items-center"><img src={item.images?.[0] || 'https://placehold.co/50x50/F97316/FFF?text=P'} alt={item.name} className="w-10 h-10 rounded-md object-cover mr-3"/><span>{item.name}</span></div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => handleToggleAvailability(item, cat)} className={`p-1 rounded-full ${item.available !== false ? 'text-green-500' : 'text-gray-400'}`}>{item.available !== false ? <FiToggleRight size={20}/> : <FiToggleLeft size={20} />}</button>
                                            <button onClick={() => handleEdit(item, cat)} className="p-1 text-yellow-500 hover:text-yellow-700"><FiEdit size={16}/></button>
                                            <button onClick={() => setDeleteConfirmation({ isOpen: true, item, category: cat })} className="p-1 text-red-500 hover:text-red-700"><FiTrash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {imageToCrop && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-4 rounded-lg max-w-2xl w-full">
                        <h3 className="font-bold text-lg mb-4">Crop Image</h3>
                        <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={16 / 9}>
                            <img ref={imgRef} src={imageToCrop} onLoad={onImageLoad} alt="Crop preview" style={{ maxHeight: '70vh' }}/>
                        </ReactCrop>
                        <div className="flex justify-end gap-4 mt-4">
                            <button onClick={() => setImageToCrop(null)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                            <button onClick={handleCropAndUpload} disabled={isUploading} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2">{isUploading ? <FiLoader className="animate-spin"/> : <FiCrop />} Crop & Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
