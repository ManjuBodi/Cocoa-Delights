const sanitizeHtml = require('sanitize-html');

// Common SQL Injection patterns
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b\s+.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
  /(\b(OR|AND)\b\s+.*\b\d+\s*=\s*\d+)/i, // e.g., OR 1=1
  /(--|\/\*|\*\/)/i, // Comment sequences
  /(;|'|")/i // Statement terminators or quotes (context-dependent, but often risky in unparameterized queries)
];

// Recursive object sanitization function
const sanitizeInput = (obj) => {
  if (typeof obj === 'string') {
    // 1. Check for basic SQL Injection patterns (Heuristic approach)
    // Note: The ultimate protection against SQLi is using parameterized queries / prepared statements in your DB logic.
    const isSqlInjection = sqlInjectionPatterns.some((pattern) => pattern.test(obj));
    if (isSqlInjection) {
      throw new Error('Potential SQL Injection detected.');
    }

    // 2. Sanitize against XSS by stripping dangerous HTML tags
    return sanitizeHtml(obj, {
      allowedTags: [], // Strip all HTML tags
      allowedAttributes: {} // Strip all attributes
    });
  }

  if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach((key) => {
      obj[key] = sanitizeInput(obj[key]);
    });
  }
  return obj;
};

// Global Middleware for Input Validation and Sanitization
const globalSecurityMiddleware = (req, res, next) => {
  try {
    if (req.body) req.body = sanitizeInput(req.body);
    if (req.query) req.query = sanitizeInput(req.query);
    if (req.params) req.params = sanitizeInput(req.params);
    next();
  } catch (error) {
    console.error('Security Middleware Blocked Request:', error.message);
    return res.status(403).json({ error: 'Malicious input detected. Request blocked.' });
  }
};

module.exports = globalSecurityMiddleware;
