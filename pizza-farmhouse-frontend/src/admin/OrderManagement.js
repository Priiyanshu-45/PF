import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiClock, FiCheckCircle, FiTruck, FiBox, FiLoader, FiMessageSquare } from 'react-icons/fi';
import newOrderSound from '../assets/new-order-sound.mp3';

const statusConfig = {
    'Order Placed': { icon: <FiBox />, bgColor: 'bg-blue-500', next: 'Preparing' },
    'Preparing': { icon: <FiClock />, bgColor: 'bg-yellow-400', next: 'Out for Delivery' }, // Changed color for better readability
    'Out for Delivery': { icon: <FiTruck />, bgColor: 'bg-orange-500', next: 'Delivered' },
    'Delivered': { icon: <FiCheckCircle />, bgColor: 'bg-green-500', next: null },
};

const OrderCard = ({ order }) => {
    const { id, customer, address, items, total, status, createdAt, instructions } = order;
    const config = statusConfig[status];

    const handleUpdateStatus = async () => {
        if (!config.next) return;
        const orderRef = doc(db, 'orders', id);
        try {
            await updateDoc(orderRef, { status: config.next });
            toast.success(`Order moved to "${config.next}"`);
        } catch (error) {
            toast.error("Failed to update status.");
        }
    };

    return (
        <div className={`text-white rounded-lg shadow-lg overflow-hidden ${config.bgColor}`}>
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-xl">{customer.name}</p>
                        <p className="text-sm opacity-90">{customer.phone}</p>
                        <p className="text-sm opacity-80">{address}</p>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">{status}</div>
                </div>
                
                {instructions && (
                    <div className="mt-3 bg-white/20 p-2 rounded-md flex items-start gap-2">
                        <FiMessageSquare className="mt-1 flex-shrink-0" />
                        <p className="text-sm font-semibold">{instructions}</p>
                    </div>
                )}
            </div>

            <div className="bg-white/10 p-4">
                {items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-1 text-sm">
                        <span>{item.qty} x {item.name} {item.size ? `(${item.size})` : ''}</span>
                        <span>₹{item.price * item.qty}</span>
                    </div>
                ))}
            </div>

            <div className="p-4 flex justify-between items-center bg-black/20">
                <div>
                    <p className="font-bold text-2xl">Total: ₹{total}</p>
                    <p className="text-xs opacity-70">{createdAt?.toDate().toLocaleTimeString()}</p>
                </div>
                {config.next && (
                    <button onClick={handleUpdateStatus} className="bg-white text-black font-bold py-2 px-4 rounded-lg hover:bg-gray-200">
                        Mark as "{config.next}"
                    </button>
                )}
            </div>
        </div>
    );
};

export default function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            setOrders(newOrders);
            setIsLoading(false);
        }, (error) => {
            console.error("Order snapshot error:", error);
            toast.error("Could not fetch orders. Check Firestore rules.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const activeOrders = orders.filter(o => o.status !== 'Delivered');
    const completedOrders = orders.filter(o => o.status === 'Delivered');

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary mb-6">Live Orders</h1>
            <div className="space-y-4">
                {activeOrders.length > 0 ? (
                    activeOrders.map(order => <OrderCard key={order.id} order={order} />)
                ) : (
                    <p className="text-center text-gray-500 py-8">No active orders right now.</p>
                )}
            </div>

            <h2 className="text-2xl font-bold text-secondary mt-12 mb-6 border-t pt-6">Completed Orders</h2>
            <div className="space-y-4">
                 {completedOrders.length > 0 ? (
                    completedOrders.map(order => <OrderCard key={order.id} order={order} />)
                ) : (
                    <p className="text-center text-gray-500 py-8">No orders have been completed today.</p>
                )}
            </div>
        </div>
    );
}   