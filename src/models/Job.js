const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  company: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, required: true },
  statusColor: { type: String, required: true },
  statusBg: { type: String, required: true },
  statusBorder: { type: String, required: true },
  dotColor: { type: String, required: true },
  referrer: { type: String, required: true },
  jobId: { type: String },
  jd: { type: String },
  link: { type: String },
  location: { type: String },
  type: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
