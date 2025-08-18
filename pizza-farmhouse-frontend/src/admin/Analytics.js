// src/admin/Analytics.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { FiShoppingBag, FiDollarSign, FiLoader, FiTrendingUp } from 'react-icons/fi';

const StatCard = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center">
        <div className="p-4 bg-orange-100 text-primary rounded-full mr-4">{icon}</div>
        <div>
            <p className="text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-secondary">{value}</p>
        </div>
    </div>
);

export default function Analytics() {
    const [stats, setStats] = useState({ totalOrders: 0, totalSales: 0, totalRevenue: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get the start of today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTodayTimestamp = Timestamp.fromDate(startOfToday);

        // Query for orders created today
        const q = query(
            collection(db, "orders"), 
            where("createdAt", ">=", startOfTodayTimestamp)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalSales = 0;
            let totalRevenue = 0; // For delivered orders
            
            snapshot.docs.forEach(doc => {
                const order = doc.data();
                totalSales += order.total || 0;
                if (order.status === 'Delivered') {
                    totalRevenue += order.total || 0;
                }
            });

            setStats({ 
                totalOrders: snapshot.size, 
                totalSales,
                totalRevenue 
            });
            setIsLoading(false);
        }, (error) => {
            console.error("Analytics snapshot error:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center"><FiLoader className="animate-spin" size={32} /></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary mb-6">Today's Analytics</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Orders Today" value={stats.totalOrders} icon={<FiShoppingBag size={24}/>} />
                <StatCard title="Total Sales Today" value={`₹${stats.totalSales.toLocaleString('en-IN')}`} icon={<FiDollarSign size={24}/>} />
                <StatCard title="Today's Revenue (Delivered)" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} icon={<FiTrendingUp size={24}/>} />
            </div>
        </div>
    );
};
