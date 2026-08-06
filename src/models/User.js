const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Firebase UID links this MongoDB document to the Firebase Auth user.
  // We never store the password — Firebase handles it.
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String },
  company: { type: String },
  phone: { type: String },
  linkedin: { type: String },
  website: { type: String },
  location: { type: String },


}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
