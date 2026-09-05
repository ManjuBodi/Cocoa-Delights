const express = require('express');
const router = express.Router();

// Import shared menu data
const menuItems = require('../data/menu');

// GET /api/menu
router.get('/', (req, res) => {
  // Optional query filtering
  const { category, isVegan, isGlutenFree } = req.query;
  
  let filteredMenu = [...menuItems];
  
  if (category) {
    filteredMenu = filteredMenu.filter(item => item.category.toLowerCase() === category.toLowerCase());
  }
  if (isVegan === 'true') {
    filteredMenu = filteredMenu.filter(item => item.isVegan);
  }
  if (isGlutenFree === 'true') {
    filteredMenu = filteredMenu.filter(item => item.isGlutenFree);
  }

  res.json(filteredMenu);
});

module.exports = router;
