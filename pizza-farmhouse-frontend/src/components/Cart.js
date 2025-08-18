import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // This is required
import { useCart } from '../context/CartContext'; // This is required

const Cart = () => {
  const { cart, dispatch } = useCart();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState(null);

  // --- This function fetches the user's orders from the backend ---
  const fetchOrders = async () => {
    if (!currentUser) {
      setLoadingOrders(false);
      return;
    }
    try {
      // The API call to your backend server
      const response = await fetch(`http://localhost:4000/api/orders/${currentUser.uid}`);
      if (!response.ok) {
        throw new Error('Could not fetch your orders. Is the backend server running?');
      }
      const data = await response.json();
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // --- Fetch orders when the component loads and periodically refresh ---
  useEffect(() => {
    fetchOrders(); // Fetch immediately
    const interval = setInterval(fetchOrders, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval); // Cleanup on component unmount
  }, [currentUser]);

  // --- Cart Logic ---
  const handleRemove = (item) => {
    dispatch({ type: 'REMOVE_ITEM', payload: item });
  };

  const handleClearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const handlePlaceOrder = async () => {
    if (!currentUser || cart.items.length === 0) {
      alert("Please log in and add items to your cart before placing an order.");
      return;
    }
  
    const orderDetails = {
      userId: currentUser.uid,
      items: cart.items,
      totalPrice: cart.total,
      userDetails: {
        name: currentUser.displayName || 'Customer',
        email: currentUser.email,
      }
    };
  
    try {
      const response = await fetch('http://localhost:4000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDetails),
      });
  
      if (!response.ok) { throw new Error('Failed to place order.'); }
  
      alert('Order placed successfully! You can see its status below.');
      handleClearCart();
      fetchOrders(); // Immediately refresh orders after placing a new one
    } catch (error) {
      console.error("Order placement error:", error);
      alert("There was an error placing your order. Please try again.");
    }
  };
  
  // --- Order Status Tracker Component ---
  const OrderStatusTracker = ({ status }) => {
    const statuses = ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
    const currentIndex = statuses.indexOf(status);

    return (
      <div className="w-full my-4">
        <div className="flex">
          {statuses.map((s, index) => (
            <div key={s} className="flex-1 text-center">
              <div
                className={`w-full h-2 rounded-full ${
                  index <= currentIndex ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
              <p className={`mt-2 text-xs sm:text-sm ${
                  index <= currentIndex ? 'text-secondary font-semibold' : 'text-gray-400'
                }`}>{s}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
      
      {/* --- My Cart Section --- */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h1 className="text-3xl font-bold text-secondary mb-4">My Cart</h1>
        {cart.items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <div>
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center border-b py-2">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                </div>
                <div className="flex items-center">
                  <p className="mr-4 font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  <button onClick={() => handleRemove(item)} className="text-red-500 hover:text-red-700">
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Total: ₹{cart.total.toFixed(2)}</h2>
              <div>
                <button onClick={handleClearCart} className="text-sm text-gray-500 hover:underline mr-4">
                  Clear Cart
                </button>
                <button onClick={handlePlaceOrder} className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-orange-600">
                  Place Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- My Orders Section --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-secondary mb-6">Live Order Tracking</h1>
        {loadingOrders ? (
          <p>Loading your active orders...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500">You have no active orders.</p>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-secondary">Order ID: {order.id.substring(0, 8)}...</h2>
                    <p className="text-sm text-gray-500">
                      Placed on: {new Date(order.createdAt.seconds * 1000).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                      <p className="text-lg font-bold text-primary">₹{order.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
                <hr className="my-3" />
                <OrderStatusTracker status={order.status} />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Cart;
