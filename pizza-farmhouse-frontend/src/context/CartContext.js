// src/context/CartContext.js
import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext();

// Function to load the initial state from localStorage
const loadInitialState = () => {
  try {
    const serializedState = localStorage.getItem('pizzaFarmhouseCart');
    if (serializedState === null) {
      return { items: [] }; // If nothing is in storage, return an empty cart
    }
    const parsedState = JSON.parse(serializedState);
    // Ensure the loaded state has the correct structure
    return Array.isArray(parsedState.items) ? parsedState : { items: [] };
  } catch (err) {
    console.error("Could not load cart from localStorage", err);
    return { items: [] }; // Return empty cart on error
  }
};

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM":
      // Check if the exact same item (with same size, addons, crust) already exists
      const existingItemIndex = state.items.findIndex(item =>
        item.id === action.item.id &&
        item.size === action.item.size &&
        JSON.stringify(item.addons) === JSON.stringify(action.item.addons) &&
        JSON.stringify(item.crust) === JSON.stringify(action.item.crust)
      );

      if (existingItemIndex > -1) {
        // If it exists, update the quantity and total price
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingItemIndex];
        existingItem.qty += action.item.qty;
        // Recalculate total price for the updated quantity
        existingItem.totalItemPrice = (existingItem.price + (existingItem.addons || []).reduce((sum, addon) => sum + addon.price, 0) + (existingItem.crust ? existingItem.crust.price : 0)) * existingItem.qty;
        return { ...state, items: updatedItems };
      }
      // Otherwise, add the new item to the cart
      return { ...state, items: [...state.items, action.item] };

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((_, i) => i !== action.index),
      };

    case "UPDATE_QTY":
      const updatedItemsQty = [...state.items];
      if(updatedItemsQty[action.index]) {
        updatedItemsQty[action.index].qty = action.qty;
      }
      return { ...state, items: updatedItemsQty };

    case "CLEAR_CART":
      return { items: [] };
      
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  // FIX: Initialize the reducer with the `loadInitialState` function.
  // This is the key to restoring the cart on page load.
  const [state, dispatch] = useReducer(cartReducer, null, loadInitialState);

  // FIX: This effect will run every time the `state` (the cart) changes.
  // It saves the current state to localStorage, persisting it across refreshes.
  useEffect(() => {
    try {
      const serializedState = JSON.stringify(state);
      localStorage.setItem('pizzaFarmhouseCart', serializedState);
    } catch (err) {
      console.error("Could not save cart to localStorage", err);
    }
  }, [state]);

  // Provide the cart items directly for easier access in components
  return (
    <CartContext.Provider value={{ cart: state.items, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}