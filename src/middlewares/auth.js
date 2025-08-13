const { verifyToken } = require('../utils/auth');
const { supabase } = require('../config');

// Extract token from Authorization header
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// Verify JWT and attach user to request
const authenticateToken = async (req, res, next) => {
  try {
    console.log('Auth - Request Headers:', req.headers);
    const token = extractToken(req);
    
    if (!token) {
      console.log('Auth - No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    console.log('Auth - Token found, verifying...');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.log('Auth - Invalid or expired token');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('Auth - Token decoded, user ID:', decoded.userId);
    
    // Fetch user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error) {
      console.error('Auth - Database error:', error);
      return res.status(500).json({ error: 'Database error', details: error });
    }

    if (!user) {
      console.log('Auth - User not found in database');
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('Auth - User authenticated:', { id: user.id, email: user.email, role: user.role });
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth - Error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Require admin role
const requireAdmin = (req, res, next) => {
  console.log('Admin check - User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user in request');
  
  if (!req.user) {
    console.log('Admin check - No user in request');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    console.log('Admin check - User is not admin. Role:', req.user.role);
    return res.status(403).json({ 
      error: 'Admin access required',
      currentRole: req.user.role,
      requiredRole: 'admin'
    });
  }
  
  console.log('Admin check - User is admin');
  next();
};

// Require client role
const requireClient = (req, res, next) => {
  if (!req.user || req.user.role !== 'client') {
    return res.status(403).json({ error: 'Client access required' });
  }
  next();
};

// Optional authentication (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', decoded.userId)
          .single();

        if (!error && user) {
          req.user = user;
        }
      }
    }
    next();
  } catch (error) {
    next(); // Continue without authentication
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireClient,
  optionalAuth,
}; 