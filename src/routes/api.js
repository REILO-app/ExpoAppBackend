const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Referral = require('../models/Referral');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const { sendReferralInviteEmail } = require('../services/referralInviteEmail');

// --- User Routes ---
// The /user route is now somewhat redundant with /auth/me, but we can keep it protected
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Referral Routes ---
router.get('/referrals', authMiddleware, async (req, res) => {
  try {
    const referrals = await Referral.find({ userId: req.user._id }).sort({ createdAt: -1 });
    // Map _id to id for frontend compatibility
    res.json(referrals.map(r => ({ ...r.toObject(), id: r._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/referrals', authMiddleware, async (req, res) => {
  try {
    const { email, name, company, role } = req.body;

    if (!name || !company || !role) {
      return res.status(400).json({ error: 'Name, company, and role are required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email is required to send the referral invite' });
    }

    const referral = new Referral({
      time: 'Just now',
      status: 'Pending',
      statusColor: '#D97706',
      statusBg: '#FFFBEB',
      statusBorder: '#FEF3C7',
      dotColor: '#FBBF24',
      ...req.body,
      userId: req.user._id,
      history: [{
        type: 'referral_created',
        title: 'Referral Added',
        description: `Added referral for ${name} at ${company}`,
        icon: 'user-plus',
        color: '#6366F1'
      }]
    });
    await referral.save();

    const user = await User.findById(req.user._id);
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const emailResult = user
      ? await sendReferralInviteEmail({ referral, user, baseUrl })
      : { sent: false, reason: 'user_not_found' };

    if (emailResult.sent || emailResult.simulated) {
      referral.history.push({
        type: 'invite_sent',
        title: 'Connection Request Sent',
        description: `Connection Request was sent to ${name}`,
        icon: 'send',
        color: '#6366F1'
      });
      await referral.save();
    }

    res.json({
      ...referral.toObject(),
      id: referral._id.toString(),
      inviteEmailSent: emailResult.sent,
      inviteEmailSimulated: emailResult.simulated || false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/referrals/:id/history', authMiddleware, async (req, res) => {
  try {
    const referral = await Referral.findOne({ _id: req.params.id, userId: req.user._id });
    if (!referral) return res.status(404).json({ error: 'Not found' });

    referral.history.push(req.body);
    await referral.save();

    res.json({ ...referral.toObject(), id: referral._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/referrals/:id/status', authMiddleware, async (req, res) => {
  try {
    const referral = await Referral.findOne({ _id: req.params.id, userId: req.user._id });
    if (!referral) return res.status(404).json({ error: 'Not found' });

    const { status, statusColor, statusBg, statusBorder, dotColor } = req.body;
    if (status) referral.status = status;
    if (statusColor) referral.statusColor = statusColor;
    if (statusBg) referral.statusBg = statusBg;
    if (statusBorder) referral.statusBorder = statusBorder;
    if (dotColor) referral.dotColor = dotColor;

    referral.history.push({
      type: 'status_changed',
      title: 'Status Updated',
      description: `Status changed to ${status || referral.status}`,
      icon: 'refresh-cw',
      color: '#F59E0B'
    });
    referral.markModified('history');

    await referral.save();
    res.json({ ...referral.toObject(), id: referral._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/referrals/:id', authMiddleware, async (req, res) => {
  try {
    const referral = await Referral.findOne({ _id: req.params.id, userId: req.user._id });
    if (!referral) return res.status(404).json({ error: 'Not found' });
    res.json({ ...referral.toObject(), id: referral._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/referrals/:id', authMiddleware, async (req, res) => {
  try {
    const referral = await Referral.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!referral) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, message: 'Referral deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Job Routes ---
router.get('/jobs', authMiddleware, async (req, res) => {
  try {
    const jobs = await Job.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(jobs.map(j => ({ ...j.toObject(), id: j._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/jobs', authMiddleware, async (req, res) => {
  try {
    const job = new Job({
      time: 'Just now',
      status: 'Pending AI Draft',
      statusColor: '#D97706',
      statusBg: '#FFFBEB',
      statusBorder: '#FEF3C7',
      dotColor: '#FBBF24',
      referrer: 'To be found',
      ...req.body,
      userId: req.user._id,
    });
    await job.save();
    res.json({ ...job.toObject(), id: job._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.user._id });
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json({ ...job.toObject(), id: job._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Notification Routes ---
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications.map(n => ({ ...n.toObject(), id: n._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
