const mongoose = require('mongoose');

/**
 * ReferralToken
 *
 * Stores one record per email action link (yes/no) that is sent to a referrer.
 * The token field holds the raw JWT string.  usedAt is null until the link is
 * clicked, at which point it is stamped to prevent replay.
 *
 * A TTL index automatically removes expired records from MongoDB so the
 * collection does not grow unbounded.
 */
const referralTokenSchema = new mongoose.Schema({
  // The signed JWT — indexed for fast lookup on inbound clicks
  token: { type: String, required: true, unique: true, index: true },

  // Which referral this action belongs to
  referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral', required: true },

  // Optional — only present for job-referral-request emails (not invite emails)
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },

  // Intended recipient — used for audit / future login-gating
  email: { type: String, required: true },

  // 'yes' | 'no'
  action: { type: String, enum: ['yes', 'no'], required: true },

  // 'invite' (connection request) | 'job' (referral request for a specific job)
  type: { type: String, enum: ['invite', 'job'], required: true },

  // When the JWT itself expires (mirrors the JWT exp claim)
  expiresAt: { type: Date, required: true },

  // Null until the link is clicked — prevents replay attacks
  usedAt: { type: Date, default: null },
}, { timestamps: true });

// MongoDB TTL index — documents are automatically deleted after expiresAt
referralTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ReferralToken', referralTokenSchema);
