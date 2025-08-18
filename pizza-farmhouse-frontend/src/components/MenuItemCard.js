import React, { useState, useRef } from 'react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { FiPlus, FiMinus, FiShoppingCart } from 'react-icons/fi';
import { motion, useInView } from 'framer-motion';

function MenuItemCard({ item }) {
    const { dispatch } = useCart();
    const [selectedSize, setSelectedSize] = useState(item.sizes ? Object.keys(item.sizes)[0] : null);
    const [quantity, setQuantity] = useState(1);

    const hasSizes = item.sizes && Object.keys(item.sizes).length > 0;
    const price = hasSizes ? item.sizes[selectedSize] : item.price;
    
    // Use the hook to trigger animation when the card scrolls into view
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });
    const cardVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    const handleAddToCart = () => {
        if (hasSizes && !selectedSize) {
            toast.error("Please select a size.");
            return;
        }

        const cartItem = {
            ...item, // Pass the full item to retain all original fields
            size: selectedSize,
            price: price,
            qty: quantity, // Use the new quantity state
        };
        
        dispatch({ type: "ADD_ITEM", item: cartItem });
        toast.success(`${item.name} added to cart!`);
        setQuantity(1); // Reset quantity after adding to cart
    };

    return (
        <motion.div
            ref={ref}
            variants={cardVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out flex flex-col overflow-hidden"
        >
            <img 
                src={item.images?.[0] || 'https://placehold.co/400x225/F97316/FFF?text=Image+Coming+Soon'} 
                alt={item.name} 
                className="w-full h-48 object-cover"
            />
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-secondary">{item.name}</h3>
                {item.description && <p className="text-gray-600 text-sm flex-grow mt-1">{item.description}</p>}
                
                {hasSizes && (
                    <div className="mt-4">
                        <p className="text-sm font-semibold mb-2">Select Size:</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(item.sizes).map(size => (
                                <button 
                                    key={size} 
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedSize === size ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mt-4">
                    <p className="text-2xl font-bold text-primary">₹{price}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 bg-gray-200 rounded-full"><FiMinus size={16}/></button>
                        <span className="font-bold w-8 text-center">{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)} className="p-2 bg-gray-200 rounded-full"><FiPlus size={16}/></button>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddToCart}
                    className="w-full mt-4 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2"
                >
                    <FiShoppingCart /> Add to Cart
                </motion.button>
            </div>
        </motion.div>
    );
}

export default React.memo(MenuItemCard);