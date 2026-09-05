const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const menuItems = require('../data/menu');

const menuItems = require('../data/menu');
const orders = require('../data/orders');
const { ORDER_STATES, transitionOrderState } = require('../utils/orderStateMachine');

// POST /api/orders (Protected)
router.post('/', authenticateToken, (req, res) => {
  const { items, totalAmount, address, deliveryTime } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain items' });
  }

  // Rigorously validate cart calculations server-side
  let calculatedTotal = 0;
  for (const item of items) {
    const menuItem = menuItems.find(m => m.id === item.id);
    
    // 1. Verify item actually exists in the menu
    if (!menuItem) {
      return res.status(400).json({ error: `Item with id ${item.id} is invalid or no longer available.` });
    }
    
    // 2. Verify quantity is a valid positive integer
    if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: `Invalid quantity provided for item ${menuItem.name}.` });
    }

    // Calculate subtotal using the SERVER's price, not the client's
    calculatedTotal += menuItem.price * item.quantity;
  }

  // 3. Prevent floating point comparison issues (round to 2 decimal places)
  calculatedTotal = Math.round(calculatedTotal * 100) / 100;
  const clientTotal = Math.round(totalAmount * 100) / 100;

  // 4. Check for price manipulation
  if (calculatedTotal !== clientTotal) {
    return res.status(400).json({ 
      error: 'Price mismatch detected. Order total does not match our records.',
      expected: calculatedTotal,
      provided: clientTotal
    });
  }

  const newOrder = {
    id: Date.now().toString(),
    userId: req.user.id, // Extracted from JWT
    items,
    totalAmount: calculatedTotal,
    address,
    deliveryTime,
    status: ORDER_STATES.PENDING,
    createdAt: new Date()
  };

  orders.push(newOrder);

  // Return the client_secret / order_id to the frontend (Mocking payment gateway step)
  res.status(201).json({ 
    message: 'Order created successfully', 
    orderId: newOrder.id,
    clientSecret: `mock_secret_${newOrder.id}` 
  });
});

// GET /api/orders/:id
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const order = orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Ensure users can only see their own orders
  if (order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to view this order' });
  }

  res.json(order);
});

// PATCH /api/orders/:id/status (Protected - Ideally restricted to staff/admin roles)
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const order = orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Basic authorization: In a real app, only STAFF/ADMIN or webhooks should transition beyond PAID
  // For demonstration, we'll allow the transition if it passes the state machine rules
  try {
    const updatedOrder = transitionOrderState(order, status);
    res.json({ message: 'Order status updated successfully', order: updatedOrder });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
