// src/components/CartButton.js
import React from 'react';
import { useCart } from '../context/CartContext';
import { FiShoppingCart } from 'react-icons/fi';

export default function CartButton({ onClick }) {
  const { cart } = useCart();
  
  // FIX: Use (cart || []) to prevent error if cart is not an array yet.
  const itemCount = (cart || []).reduce((sum, item) => sum + item.qty, 0);

  return (
    <button
      onClick={onClick}
      className="relative bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-all duration-300 flex items-center space-x-2"
    >
      <FiShoppingCart size={20} />
      <span>Cart</span>
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </button>
  );
}