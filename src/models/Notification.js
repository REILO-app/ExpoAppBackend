const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: String, required: true },
  type: { type: String, enum: ['success', 'info'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
