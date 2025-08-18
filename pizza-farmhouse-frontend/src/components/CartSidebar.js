// src/components/CartSidebar.js

import React from "react";
import { useCart } from "../context/CartContext";
import { FiX } from "react-icons/fi";

export default function CartSidebar({ isOpen, onClose }) {
  // We get the cart array directly from our fixed context
  const { cart, dispatch } = useCart();

  // FIX: Use (cart || []) to make the component robust and prevent errors.
  // We use cart.reduce() directly, not cart.items.reduce()
  const cartTotal = (cart || []).reduce((sum, item) => sum + item.price * item.qty, 0);

  // A function to remove an item from the cart
  const handleRemoveItem = (index) => {
    dispatch({ type: "REMOVE_ITEM", index });
  };

  const sidebarClasses = `
    fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl z-50
    flex flex-col transition-transform duration-300 ease-in-out
    transform ${isOpen ? "translate-x-0" : "translate-x-full"}
  `;

  return (
    <div className={sidebarClasses}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-bold text-secondary">Your Cart</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <FiX size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex-grow p-4 overflow-y-auto">
        {/* FIX: Use cart.length directly */}
        {(cart || []).length === 0 ? (
          <p className="text-gray-500">Your cart is empty!</p>
        ) : (
          <div>
            {/* FIX: Use cart.map directly */}
            {(cart || []).map((item, index) => (
              <div key={`${item.name}-${item.size || ''}-${index}`} className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  {item.size && <p className="text-sm text-gray-500">{item.size}</p>}
                  <p className="text-primary font-bold">₹{item.price} x {item.qty}</p>
                </div>
                <div className="flex items-center space-x-2">
                   <p className="font-bold text-lg">₹{item.price * item.qty}</p>
                   <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 text-xs">
                     Remove
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Total and Checkout Button */}
      {(cart || []).length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center font-bold text-xl mb-4">
            <span>Total:</span>
            <span>₹{cartTotal}</span>
          </div>
          <button
            // We will add checkout functionality later
            // onClick={handleProceedToCheckout}
            className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-transform transform hover:scale-105"
          >
            Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );
}