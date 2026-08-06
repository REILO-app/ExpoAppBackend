const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  time: { type: String, required: true }, // E.g., '2h', '1d' (in a real app, calculate from createdAt)
  status: { type: String, required: true },
  statusColor: { type: String, required: true },
  statusBg: { type: String, required: true },
  statusBorder: { type: String, required: true },
  dotColor: { type: String, required: true },
  company: { type: String },
  location: { type: String },
  email: { type: String },
  phone: { type: String },
  linkedin: { type: String },
  notes: { type: String },
  history: [{
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    icon: { type: String, default: 'clock' },
    color: { type: String, default: '#6366F1' },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);
