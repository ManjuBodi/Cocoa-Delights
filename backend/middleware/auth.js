const jwt = require('jsonwebtoken');

// Zero-Trust Authentication Middleware
const authenticateToken = (req, res, next) => {
  // Try to get token from HttpOnly cookie first, fallback to Authorization header
  let token = req.cookies?.token;

  if (!token && req.headers['authorization']) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_development');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authenticateToken;
