import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext();

// Function to load the initial state from localStorage
const loadInitialState = () => {
  try {
    const serializedState = localStorage.getItem('pizzaFarmhouseCart');
    if (serializedState === null) {
      return { items: [] };
    }
    const parsedState = JSON.parse(serializedState);
    return Array.isArray(parsedState.items) ? parsedState : { items: [] };
  } catch (err) {
    console.error("Could not load cart from localStorage", err);
    return { items: [] };
  }
};

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM":
      const existingItem = state.items.find(item =>
        item.id === action.item.id &&
        item.size === action.item.size &&
        JSON.stringify(item.addons) === JSON.stringify(action.item.addons) &&
        JSON.stringify(item.crust) === JSON.stringify(action.item.crust)
      );

      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.item.id &&
            item.size === action.item.size &&
            JSON.stringify(item.addons) === JSON.stringify(action.item.addons) &&
            JSON.stringify(item.crust) === JSON.stringify(action.item.crust)
              ? { ...item, qty: item.qty + action.item.qty }
              : item
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };

    case "REMOVE_ITEM":
      // Your existing logic is slightly different from the new one.
      // We will keep the original logic for simplicity and correctness with the existing code.
      return {
        ...state,
        items: state.items.filter((_, i) => i !== action.index),
      };

    case "UPDATE_QTY":
      const updatedItemsQty = [...state.items];
      updatedItemsQty[action.index].qty = action.qty;
      return { ...state, items: updatedItemsQty };

    case "CLEAR_CART":
      // Consistent with the new logic, but returns an object to match the state structure {items: []}
      return { items: [] };
      
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, null, loadInitialState);

  useEffect(() => {
    try {
      const serializedState = JSON.stringify(state);
      localStorage.setItem('pizzaFarmhouseCart', serializedState);
    } catch (err) {
      console.error("Could not save cart to localStorage", err);
    }
  }, [state]);

  return (
    <CartContext.Provider value={{ cart: state.items, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
