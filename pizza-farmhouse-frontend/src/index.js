import React from "react";
import ReactDOM from 'react-dom/client';
import App from "./App";
import { CartProvider } from "./context/CartContext";
import "./index.css";

// Use createRoot() and render() for React 18 and newer
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <CartProvider>
      <App />
    </CartProvider>
);