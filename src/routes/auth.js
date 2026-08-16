const express = require('express');
const router = express.Router();
const { getAuth } = require('firebase-admin/auth');
require('../config/firebase'); // ensures initializeApp() runs before getAuth()
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const formatUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  company: user.company,
  phone: user.phone,
  linkedin: user.linkedin,
  website: user.website,
  location: user.location,
});

const applyProfileFields = (user, { name, phone, role, company }) => {
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (company) user.company = company;
};

/**
 * POST /api/auth/sync
 *
 * Called by the mobile app immediately after a successful Firebase login/signup.
 * Creates or updates the MongoDB user profile linked to the Firebase UID.
 * Requires a valid Firebase ID token in the Authorization header.
 */
router.post('/sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const idToken = authHeader.split(' ')[1];
    const decoded = await getAuth().verifyIdToken(idToken);

    const { uid, email, name: firebaseName } = decoded;
    const { name, phone, role, company } = req.body;
    const profileFields = { name, phone, role, company };

    // 1. Look for an existing user linked to this Firebase UID
    let user = await User.findOne({ firebaseUid: uid });

    // 2. If not found, look for an existing user with the same email
    if (!user && email) {
      user = await User.findOne({ email });

      if (user) {
        // Link the existing MongoDB account to this Firebase account
        user.firebaseUid = uid;
        applyProfileFields(user, profileFields);
        if (!user.name && firebaseName) user.name = firebaseName;

        await user.save();
      }
    }

    // 3. If no user exists at all, create a new one
    if (!user) {
      user = new User({
        firebaseUid: uid,
        email: email || '',
        name: name || firebaseName || email?.split('@')[0] || 'User',
        phone: phone || undefined,
        role: role || undefined,
        company: company || undefined,
      });

      await user.save();
    } else {
      // Existing user found by firebaseUid — update any provided profile fields
      applyProfileFields(user, profileFields);
      await user.save();
    }

    res.json(formatUser(user));

  } catch (error) {
    console.error('Sync error:', error);

    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: error.message });

  }
});

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's MongoDB profile.
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json(formatUser(req.user));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/auth/me
 *
 * Updates the authenticated user's profile in MongoDB.
 */
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const allowedFields = ['name', 'role', 'company', 'phone', 'linkedin', 'website', 'location', 'email'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json(formatUser(user));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
