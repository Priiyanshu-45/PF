import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiDollarSign, FiShoppingBag, FiUsers, FiCalendar, FiStar } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const StatCard = ({ icon: Icon, title, value, change, changeType }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800 border border-gray-700 rounded-lg p-6"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-200 mt-1">{value}</p>
        {change && (
          <p className={`text-sm mt-1 flex items-center ${
            changeType === 'positive' ? 'text-green-400' : 'text-red-400'
          }`}>
            <FiTrendingUp size={12} className="mr-1" />
            {changeType === 'positive' ? '+' : ''}{change}
          </p>
        )}
      </div>
      <div className="p-3 bg-orange-500/10 rounded-full">
        <Icon size={24} className="text-orange-400" />
      </div>
    </div>
  </motion.div>
);

const OrderChart = ({ orders }) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toDateString()
    };
  }).reverse();

  const ordersByDay = last7Days.map(({ date }) => {
    return orders.filter(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      return orderDate.toDateString() === date;
    }).length;
  });

  const maxOrders = Math.max(...ordersByDay, 1);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-200 mb-4">Orders This Week</h3>
      <div className="flex items-end justify-between h-40 space-x-2">
        {last7Days.map(({ day }, index) => (
          <div key={day} className="flex-1 flex flex-col items-center">
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: `${(ordersByDay[index] / maxOrders) * 100}%` }}
              transition={{ duration: 1, delay: index * 0.1 }}
              className="w-full bg-orange-500 rounded-t-lg transition-all duration-500 min-h-[4px]"
            />
            <p className="text-xs text-gray-400 mt-2">{day}</p>
            <p className="text-sm font-medium text-gray-200">{ordersByDay[index]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrendingItems = ({ orders }) => {
  const [trendingItems, setTrendingItems] = useState([]);

  useEffect(() => {
    const itemCounts = {};
    const itemRevenue = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.name;
        itemCounts[key] = (itemCounts[key] || 0) + item.qty;
        itemRevenue[key] = (itemRevenue[key] || 0) + (item.price * item.qty);
      });
    });

    const trending = Object.entries(itemCounts)
      .map(([itemName, count]) => ({
        name: itemName,
        count,
        revenue: itemRevenue[itemName] || 0,
        trend: count > 5 ? 'hot' : count > 2 ? 'warm' : 'cool'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setTrendingItems(trending);
  }, [orders]);

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'hot': return '🔥';
      case 'warm': return '📈';
      default: return '📊';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'hot': return 'text-red-400';
      case 'warm': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-200">Trending Items</h3>
        <FiStar className="text-orange-400" size={20} />
      </div>
      <div className="space-y-3">
        {trendingItems.map((item, index) => (
          <motion.div 
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getTrendIcon(item.trend)}</span>
              <div>
                <p className="font-medium text-gray-200">{item.name}</p>
                <p className="text-xs text-gray-400">#{index + 1} most ordered</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${getTrendColor(item.trend)}`}>
                {item.count} sold
              </p>
              <p className="text-xs text-gray-400">₹{item.revenue}</p>
            </div>
          </motion.div>
        ))}
      </div>
      
      {trendingItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No trending data yet</p>
        </div>
      )}
    </div>
  );
};

const RecentActivity = ({ orders }) => {
  const recentOrders = orders.slice(0, 8);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-200">Recent Activity</h3>
        <span className="text-xs text-green-400 flex items-center">
          ● Live updates
        </span>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {recentOrders.map(order => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                order.status === 'Order Placed' ? 'bg-blue-500' :
                order.status === 'Preparing' ? 'bg-yellow-500' :
                order.status === 'Out for Delivery' ? 'bg-orange-500' :
                'bg-green-500'
              }`} />
              <div>
                <p className="text-gray-200 font-medium text-sm">
                  #{order.id.substring(0, 6)}
                </p>
                <p className="text-xs text-gray-400">
                  {order.userDetails?.name} • {order.items.length} items
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-orange-400 text-sm">₹{order.totalPrice}</p>
              <p className="text-xs text-gray-400">{order.status}</p>
            </div>
          </motion.div>
        ))}
      </div>
      
      {recentOrders.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No recent activity</p>
        </div>
      )}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    let startDate = new Date();
    
    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [timeRange]);

  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const uniqueCustomers = new Set(orders.map(order => order.userId)).size;

  // Calculate growth (mock data for now)
  const revenueGrowth = totalRevenue > 0 ? '+12.5%' : '0%';
  const orderGrowth = totalOrders > 0 ? '+8.3%' : '0%';

  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-300">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-200">Real-time Analytics</h2>
            <p className="text-gray-400">Live business insights and trends</p>
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:border-orange-500 focus:ring-orange-500"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FiDollarSign}
            title="Total Revenue"
            value={`₹${totalRevenue.toLocaleString()}`}
            change={revenueGrowth}
            changeType="positive"
          />
          <StatCard
            icon={FiShoppingBag}
            title="Total Orders"
            value={totalOrders}
            change={orderGrowth}
            changeType="positive"
          />
          <StatCard
            icon={FiTrendingUp}
            title="Avg Order Value"
            value={`₹${avgOrderValue}`}
          />
          <StatCard
            icon={FiUsers}
            title="Customers"
            value={uniqueCustomers}
          />
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <OrderChart orders={orders} />
          <TrendingItems orders={orders} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <RecentActivity orders={orders} />
        </div>
      </div>
    </div>
  );
}
