require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const authenticateToken = require('./middleware/auth');
const helmet = require('helmet');
const globalSecurityMiddleware = require('./middleware/security');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const orders = require('./data/orders');
const { ORDER_STATES, transitionOrderState } = require('./utils/orderStateMachine');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors({ origin: true, credentials: true }));
app.use(express.json()); // For parsing application/json
app.use(cookieParser()); // For parsing cookies
app.use(globalSecurityMiddleware); // XSS and SQLi sanitization for all routes

// Auth Routes
app.use('/api/auth', authRoutes);

// --- API Endpoints ---
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// Payment Webhook Endpoint
app.post('/api/webhooks/payment', express.raw({type: 'application/json'}), (req, res) => {
  // TODO: Verify signature from payment gateway (Stripe, Razorpay, etc.)
  try {
    // Assuming the parsed body contains the orderId from metadata
    const payload = JSON.parse(req.body.toString());
    const orderId = payload.data?.object?.metadata?.orderId || payload.orderId;
    
    if (orderId) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        // Securely transition the order to PAID upon successful webhook receipt
        transitionOrderState(order, ORDER_STATES.PAID);
        console.log(`Order ${orderId} successfully transitioned to PAID via webhook`);
      }
    }
    res.status(200).send();
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).send('Webhook handler failed');
  }
});

// Basic Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
