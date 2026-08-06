const { getAuth } = require('firebase-admin/auth');
require('../config/firebase'); // ensures initializeApp() runs before getAuth()
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const idToken = authHeader.split(' ')[1];

    // Verify the Firebase ID token
    const decoded = await getAuth().verifyIdToken(idToken);

    // Find the MongoDB user by Firebase UID
    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      return res.status(401).json({ error: 'User profile not found. Please sync your account.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;

