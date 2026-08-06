const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Referral = require('../src/models/Referral');
const Job = require('../src/models/Job');
const Notification = require('../src/models/Notification');

const MOCK_USER_PROFILE = {
  name: 'Prasad Pansare',
  email: 'prasadpansare02@gmail.com',
  phone: '+353894323354',
  linkedin: 'https://linkedin.com/in/prasadpansare',
};

const MOCK_REFERRALS = [
  {
    name: 'Nitin Pansare',
    role: 'Associate Director Quality, India',
    time: '2h',
    status: 'Accepted',
    statusColor: '#059669',
    statusBg: '#ECFDF5',
    statusBorder: '#D1FAE5',
    dotColor: '#10B981',
    company: 'Emerson',
    location: 'Pune, MH, India',
    email: 'prasadpansare19@gmail.com',
    phone: '+91 98765 43210',
    linkedin: 'https://linkedin.com/in/nitinpansare',
    notes: 'He is my father, and he is willing to refer me.',
  },
  {
    name: 'VANSH',
    role: 'Software Dev',
    time: '1d',
    status: 'Accepted',
    statusColor: '#059669',
    statusBg: '#ECFDF5',
    statusBorder: '#D1FAE5',
    dotColor: '#10B981',
    company: 'Orvera AI',
    location: 'Mumbai, MH, India',
    email: 'gurnanivansh57@gmail.com',
    phone: '+91 91234 56789',
    linkedin: 'https://linkedin.com/in/vansh',
    notes: 'He is my bro.',
  },
];

const MOCK_JOBS = [
  {
    role: 'Senior Frontend Engineer',
    company: 'Emerson',
    time: '2h',
    status: 'Email Sent',
    statusColor: '#059669',
    statusBg: '#ECFDF5',
    statusBorder: '#D1FAE5',
    dotColor: '#10B981',
    referrer: 'Nitin Pansare',
    jobId: 'EMR-2026-FE-4812',
    jd: 'We are looking for a Senior Frontend Engineer...',
    link: 'https://careers.emerson.com/jobs/senior-frontend-engineer',
    location: 'Pune, India (Hybrid)',
    type: 'Full-time',
  },
];

const MOCK_NOTIFICATIONS = [
  { title: 'Connection Request Accepted!', message: 'Nitin Pansare accepted your connection request.', time: '2m ago', type: 'success' },
  { title: 'Referral Request Approved!', message: 'Hurray! Nitin Pansare has referred you for the job!', time: '1h ago', type: 'success' },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    console.log('Clearing old data...');
    await User.deleteMany({});
    await Referral.deleteMany({});
    await Job.deleteMany({});
    await Notification.deleteMany({});

    console.log('Inserting mock data...');
    const user = await User.create({
      ...MOCK_USER_PROFILE,
      firebaseUid: 'seed-user',
    });

    await Referral.insertMany(MOCK_REFERRALS.map((r) => ({ ...r, userId: user._id })));
    await Job.insertMany(MOCK_JOBS.map((j) => ({ ...j, userId: user._id })));
    await Notification.insertMany(MOCK_NOTIFICATIONS.map((n) => ({ ...n, userId: user._id })));

    console.log('Database successfully seeded!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
