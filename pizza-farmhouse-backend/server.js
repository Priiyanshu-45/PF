// pizza-farmhouse-backend/server.js
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const admin = require('firebase-admin');
const axios = require('axios'); // Required for MSG91
const schedule = require('node-schedule'); // Required for the scheduled task
require('dotenv').config();

// IMPORTANT: Make sure this path is correct
const serviceAccount = require('./pizza-farmhouse-firebase-adminsdk-fbsvc-f35332f935.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

// --- GLOBAL MIDDLEWARE ---
app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(express.json({
  limit: '10mb'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- API ENDPOINTS ---

// Root endpoint
app.get('/', (req, res) => {
  res.send('Welcome to the Unified Pizza Farmhouse Backend!');
});

// Cloudinary Upload Endpoint
app.post('/api/upload', async (req, res) => {
  try {
    const fileStr = req.body.data;
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      upload_preset: 'pizza_farmhouse'
    });
    console.log('Upload successful:', uploadResponse.secure_url);
    res.json({
      secure_url: uploadResponse.secure_url
    });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({
      err: 'Something went wrong'
    });
  }
});

// Cloudinary Delete Endpoint (NEW)
app.post('/api/delete-image', async (req, res) => {
  try {
    const {
      publicId
    } = req.body;

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete image'
      });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// In-memory store for OTP sessions
const otpSessions = {};

// MSG91 Send OTP Endpoint
app.post('/api/send-otp', async (req, res) => {
  const {
    mobile
  } = req.body;
  if (!mobile) {
    return res.status(400).json({
      type: 'error',
      message: 'Mobile number is required.'
    });
  }
  try {
    const response = await axios.get('https://api.msg91.com/api/v5/otp', {
      params: {
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: mobile,
        authkey: process.env.MSG91_AUTHKEY,
      }
    });
    const data = response.data;
    if (data.type === 'success') {
      otpSessions[mobile] = data.session;
      res.json({
        type: 'success',
        message: 'OTP sent successfully.'
      });
    } else {
      res.status(500).json({
        type: 'error',
        message: data.message || 'Failed to send OTP.'
      });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      type: 'error',
      message: 'An error occurred on the server.'
    });
  }
});

// MSG91 Verify OTP Endpoint
app.post('/api/verify-otp', async (req, res) => {
  const {
    mobile,
    otp
  } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({
      type: 'error',
      message: 'Mobile and OTP are required.'
    });
  }
  const session = otpSessions[mobile];
  if (!session) {
    return res.status(400).json({
      type: 'error',
      message: 'OTP session not found or expired.'
    });
  }
  try {
    const response = await axios.post('https://api.msg91.com/api/v5/otp/verify', null, {
      params: {
        otp,
        mobile,
        authkey: process.env.MSG91_AUTHKEY,
        session,
      }
    });
    const data = response.data;
    if (data.type === 'success') {
      delete otpSessions[mobile];
      res.json({
        type: 'success',
        message: 'OTP verified successfully.'
      });
    } else {
      res.status(400).json({
        type: 'error',
        message: data.message || 'Invalid OTP.'
      });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      type: 'error',
      message: 'An error occurred on the server.'
    });
  }
});

// --- ORDER ENDPOINTS ---

// Create a new order
app.post('/api/orders', async (req, res) => {
  try {
    const {
      userId,
      items,
      totalPrice,
      userDetails
    } = req.body;
    const order = {
      userId,
      items,
      totalPrice,
      userDetails,
      status: 'Order Placed', // Initial status
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('orders').add(order);
    res.status(201).json({
      id: docRef.id,
      ...order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      error: 'Failed to create order'
    });
  }
});

// Get orders for a specific user
app.get('/api/orders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const ordersRef = db.collection('orders');
    const snapshot = await ordersRef.where('userId', '==', userId).orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return res.status(200).json([]); // Return empty array if no orders
    }

    const orders = [];
    snapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      error: 'Failed to fetch orders'
    });
  }
});

// --- ADMIN ENDPOINTS ---

// Get all orders for admin
app.get('/api/admin/orders', async (req, res) => {
  try {
    const ordersRef = db.collection('orders').orderBy('createdAt', 'desc');
    const snapshot = await ordersRef.get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      error: 'Failed to fetch all orders'
    });
  }
});

// Update order status
app.put('/api/admin/orders/:orderId', async (req, res) => {
  try {
    const {
      orderId
    } = req.params;
    const {
      status
    } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required.'
      });
    }

    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.update({
      status
    });

    res.status(200).json({
      message: 'Order status updated successfully.'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      error: 'Failed to update order status'
    });
  }
});


// --- AUTOMATED ORDER DELETION ---
const deleteAllOrders = async () => {
  console.log('Running scheduled job: Deleting all orders from the previous day...');
  const ordersRef = db.collection('orders');
  const snapshot = await ordersRef.get();

  if (snapshot.empty) {
    console.log('No orders to delete.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Successfully deleted ${snapshot.size} orders.`);
};

// Schedule the job to run every day at midnight
schedule.scheduleJob('0 0 * * *', deleteAllOrders);


// --- SERVER START ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend server is listening on port ${PORT}`);
  console.log('🕒 Scheduled job for deleting old orders is active.');
});