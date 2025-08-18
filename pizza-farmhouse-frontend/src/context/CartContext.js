// src/context/CartContext.js
import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext();

// Function to load the initial state from localStorage
const loadInitialState = () => {
  try {
    const serializedState = localStorage.getItem('pizzaFarmhouseCart');
    if (serializedState === null) {
      // No state in localStorage, return the default initial state
      return { items: [] };
    }
    const parsedState = JSON.parse(serializedState);
    // Ensure what we loaded is valid, otherwise return default
    return Array.isArray(parsedState.items) ? parsedState : { items: [] };
  } catch (err) {
    console.error("Could not load cart from localStorage", err);
    return { items: [] };
  }
};

function cartReducer(state, action) {
  // ... (Your cartReducer function remains exactly the same)
  switch (action.type) {
    case "ADD_ITEM":
      const existingIndex = state.items.findIndex(
        i => i.name === action.item.name && i.size === action.item.size
      );
      if (existingIndex > -1) {
        const updatedItems = [...state.items];
        updatedItems[existingIndex].qty += action.item.qty;
        return { ...state, items: updatedItems };
      }
      return { ...state, items: [...state.items, action.item] };
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((_, i) => i !== action.index),
      };
    case "UPDATE_QTY":
      const updatedItemsQty = [...state.items];
      updatedItemsQty[action.index].qty = action.qty;
      return { ...state, items: updatedItemsQty };
    case "CLEAR_CART":
      return { items: [] };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  // Pass our lazy initializer function to useReducer
  const [state, dispatch] = useReducer(cartReducer, null, loadInitialState);

  // This useEffect hook runs every time the cart state changes
  useEffect(() => {
    try {
      // Convert the state object to a string and save it to localStorage
      const serializedState = JSON.stringify(state);
      localStorage.setItem('pizzaFarmhouseCart', serializedState);
    } catch (err) {
      console.error("Could not save cart to localStorage", err);
    }
  }, [state]); // The dependency array ensures this runs only when state changes

  return (
    <CartContext.Provider value={{ cart: state.items, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}