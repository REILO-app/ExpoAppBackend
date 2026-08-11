require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
const { generateEmailDraft } = require('./services/geminiService');
const Referral = require('./models/Referral');
const Job = require('./models/Job');
const Notification = require('./models/Notification');
const { buildReiloEmailHtml } = require('./services/emailTemplate');
const { sendReiloEmail } = require('./services/emailService');
const { createReferralToken, verifyAndConsumeToken } = require('./services/tokenService');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Setup Daily Rate Limiter for Email Generation
const emailGenerationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 5,
  message: {
    status: 'error',
    message: 'Daily generation limit of 5 emails reached. Please try again tomorrow.'
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Reilo API is running' });
});

// POST endpoint for generating emails using Gemini
app.post('/api/generate-email', emailGenerationLimiter, async (req, res) => {
  const { model, referrer, job } = req.body;

  if (!referrer || !referrer.name) {
    return res.status(400).json({ status: 'error', message: 'Referrer name is required' });
  }
  if (!job || !job.role || !job.company) {
    return res.status(400).json({ status: 'error', message: 'Job role and company are required' });
  }

  try {
    const draft = await generateEmailDraft({ model, referrer, job });
    res.json({ status: 'success', data: draft });
  } catch (error) {
    console.error('Email generation route error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred while generating the email draft'
    });
  }
});

// POST endpoint for sending email directly via SMTP/Nodemailer
// All payloads arrive as JSON — resume attachments are base64-encoded strings.
// This avoids multipart/form-data streaming which crashes on Vercel serverless.
app.post('/api/send-email', async (req, res) => {
  console.log('[send-email] req.body keys:', Object.keys(req.body || {}));
  const {
    to, subject, body, jobId, referralId,
    senderName, senderEmail, senderPhone, senderLinkedin,
    attachmentBase64, attachmentFilename, attachmentMimeType,
  } = req.body;

  // Decode base64 resume into a Buffer for Nodemailer (if provided)
  const attachmentBuffer = attachmentBase64
    ? Buffer.from(attachmentBase64, 'base64')
    : undefined;

  if (!to) {
    return res.status(400).json({ status: 'error', message: 'Recipient email (to) is required' });
  }
  if (!subject) {
    return res.status(400).json({ status: 'error', message: 'Email subject is required' });
  }
  if (!body) {
    return res.status(400).json({ status: 'error', message: 'Email body is required' });
  }

  try {
    let yesUrl = null;
    let noUrl = null;

    if (jobId && referralId) {
      // Only create tokens when jobId is a valid-looking MongoDB ObjectId (24 hex chars).
      // The frontend may send '1' as a fallback which would cause a Mongoose CastError.
      const isValidObjectId = /^[a-f\d]{24}$/i.test(jobId) && /^[a-f\d]{24}$/i.test(referralId);

      if (isValidObjectId) {
        // Create signed, expiring, one-time tokens instead of embedding raw IDs.
        // This prevents IDOR (anyone changing jobId/referralId) and replay attacks.
        const [yesToken, noToken] = await Promise.all([
          createReferralToken({ referralId, jobId, email: to, action: 'yes', type: 'job' }),
          createReferralToken({ referralId, jobId, email: to, action: 'no',  type: 'job' }),
        ]);
        yesUrl = `${baseUrl}/api/referral/action?token=${yesToken}`;
        noUrl  = `${baseUrl}/api/referral/action?token=${noToken}`;
      }
    }

    const result = await sendReiloEmail({
      to,
      subject,
      body,
      htmlOptions: {
        yesUrl,
        noUrl,
        senderName,
        senderEmail,
        senderPhone,
        senderLinkedin,
      },
      attachmentBuffer,
      attachmentFilename: attachmentFilename || 'resume.pdf',
    });

    if (result.simulated) {
      return res.json({
        status: 'success',
        message: 'SMTP credentials missing. Simulated successful email transmission on backend logs.',
        simulated: true,
      });
    }

    console.log('Email sent successfully:', result.messageId);
    res.json({ status: 'success', message: 'Email sent successfully', messageId: result.messageId });
  } catch (error) {
    console.error('Email sending route error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred while sending the email'
    });
  }
});

// GET endpoint to preview the email UI in browser
app.get('/api/preview-email', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  const htmlBody = buildReiloEmailHtml({
    body: "Hi Vansh,\n\nHope you're doing great!\n\nThis is a sample preview of how your email draft looks.\n\nBest,\nPrasad",
    yesUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/referral/action?jobId=1&referralId=1&action=yes`,
    noUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/referral/action?jobId=1&referralId=1&action=no`,
    senderName: "Prasad Pansare",
    senderEmail: "prasadpansare02@gmail.com",
    senderPhone: "+353894323354",
    senderLinkedin: "https://linkedin.com/in/prasadpansare"
  });

  const imagePath = path.join(__dirname, '../assets/icons_small.jpg');
  let finalHtml = htmlBody;

  try {
    if (fs.existsSync(imagePath)) {
      const base64Image = fs.readFileSync(imagePath).toString('base64');
      finalHtml = htmlBody.replace('cid:reilo-icon', `data:image/jpeg;base64,${base64Image}`);
    }
  } catch (e) {
    console.error('Failed to load image for preview', e);
  }

  res.send(finalHtml);
});

// GET endpoint to handle referral action clicks from the email
// Security: all context is read from a signed JWT — never from raw query params.
app.get('/api/referral/action', async (req, res) => {
  const { token } = req.query;

  // ─── Helper: render a styled error page ────────────────────────────────────
  const sendErrorPage = (heading, detail) => {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reilo — Link Problem</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #080D18; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #FFFFFF; }
          .card { background: #0F172A; padding: 48px 36px; border-radius: 24px; border: 1px solid rgba(239, 68, 68, 0.3); text-align: center; max-width: 420px; width: 88%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
          .logo-badge { display: inline-block; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.35); border-radius: 10px; padding: 6px 14px; margin-bottom: 24px; color: #818CF8; font-weight: 800; font-size: 14px; letter-spacing: 2px; }
          .icon-circle { width: 64px; height: 64px; border-radius: 32px; background-color: #7C3AED; color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; margin: 0 auto 20px auto; }
          h1 { color: #FFFFFF; font-size: 22px; margin-top: 0; margin-bottom: 10px; font-weight: 800; }
          p { color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo-badge">❖ REILO</div>
          <div class="icon-circle">⚠</div>
          <h1>${heading}</h1>
          <p>${detail}</p>
        </div>
      </body>
      </html>
    `);
  };

  // ─── 1. Token must be present ───────────────────────────────────────────────
  if (!token) {
    return sendErrorPage('Invalid Link', 'This link is missing required information. Please use the link from your email.');
  }

  // ─── 2. Verify JWT signature, expiry, and one-time use ─────────────────────
  let payload;
  try {
    payload = await verifyAndConsumeToken(token);
  } catch (err) {
    console.warn('[ACTION] Token rejected:', err.code, err.message);
    if (err.code === 'TOKEN_EXPIRED') {
      return sendErrorPage('Link Expired', 'This link has expired (links are valid for 24 hours). Please ask the sender to resend the request.');
    }
    if (err.code === 'TOKEN_ALREADY_USED') {
      return sendErrorPage('Already Responded', 'You have already responded to this request. Your previous response has been recorded.');
    }
    return sendErrorPage('Invalid Link', 'This link is invalid or has been tampered with. Please use the original link from your email.');
  }

  const { referralId, jobId, action, type } = payload;
  const isAccepted = action === 'yes';
  const isInvite = type === 'invite';
  const statusLabel = isAccepted ? 'Accepted' : 'Rejected';

  // ─── 3. Update referral status in DB ───────────────────────────────────────
  try {
    const referral = await Referral.findById(referralId);
    if (referral) {
      console.log('[ACTION] Found referral:', referral._id, 'Current history length:', referral.history?.length);

      referral.status = statusLabel;
      referral.statusColor = isAccepted ? '#059669' : '#DC2626';
      referral.statusBg   = isAccepted ? '#ECFDF5' : '#FEF2F2';
      referral.statusBorder = isAccepted ? '#A7F3D0' : '#FECACA';
      referral.dotColor   = isAccepted ? '#10B981' : '#EF4444';

      if (!referral.history) referral.history = [];

      const historyEvent = {
        type:  isAccepted ? 'referral_accepted' : 'referral_rejected',
        title: isAccepted ? 'Request Accepted'  : 'Request Rejected',
        description: isInvite
          ? `Connection request was ${isAccepted ? 'accepted' : 'rejected'}`
          : `Referral request for the job was ${isAccepted ? 'accepted' : 'rejected'}`,
        icon:  isAccepted ? 'check-circle' : 'x-circle',
        color: isAccepted ? '#10B981' : '#EF4444',
        timestamp: new Date(),
      };

      referral.history.push(historyEvent);
      referral.markModified('history');

      console.log('[ACTION] History after push, length:', referral.history.length);
      console.log('[ACTION] New event:', JSON.stringify(historyEvent));

      const saved = await referral.save();
      console.log('[ACTION] Save complete. Saved history length:', saved.history?.length);

      let notificationTitle;
      let notificationMessage;

      if (isInvite) {
        notificationTitle = isAccepted ? 'Referral Contact Accepted' : 'Referral Contact Rejected';
        notificationMessage = isAccepted
          ? `${referral.name} agreed to refer you to ${referral.company || 'their company'} in the future.`
          : `${referral.name} is not available to refer you to ${referral.company || 'their company'} at this time.`;
      } else {
        const job = await Job.findById(jobId);
        const jobLabel = job ? `${job.role} at ${job.company}` : 'your referral request';
        notificationTitle = isAccepted ? 'Referral Accepted' : 'Referral Rejected';
        notificationMessage = isAccepted
          ? `${referral.name} accepted your referral request for ${jobLabel}.`
          : `${referral.name} rejected your referral request for ${jobLabel}.`;
      }

      await Notification.create({
        userId: referral.userId,
        title: notificationTitle,
        message: notificationMessage,
        time: 'Just now',
        type: isAccepted ? 'success' : 'info',
      });
    }
  } catch (error) {
    console.error('Failed to persist referral action:', error);
  }

  // ─── 4. Render success confirmation page ───────────────────────────────────
  const bgColor     = isAccepted ? '#ECFDF5' : '#FEF2F2';
  const borderColor = isAccepted ? '#A7F3D0' : '#FECACA';
  const textColor   = isAccepted ? '#047857' : '#B91C1C';
  const badgeBg     = isAccepted ? '#059669' : '#DC2626';
  const message     = isAccepted
    ? (isInvite
        ? 'Thank you! The candidate will be notified that you are willing to refer them in the future.'
        : 'Thank you! The candidate will be notified that you accepted the referral request.')
    : 'Thank you for letting us know. The candidate will be notified.';
  const icon = isAccepted ? '✓' : '✕';

  const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reilo Response Recorded</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #080D18; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #FFFFFF; }
        .card { background: #0F172A; padding: 48px 36px; border-radius: 24px; border: 1px solid rgba(99, 102, 241, 0.2); text-align: center; max-width: 420px; width: 88%; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); }
        .logo-badge { display: inline-block; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 10px; padding: 6px 14px; margin-bottom: 24px; color: #818CF8; font-weight: 800; font-size: 14px; letter-spacing: 2px; }
        .icon-circle { width: 64px; height: 64px; border-radius: 32px; background-color: ${badgeBg}; color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; margin: 0 auto 20px auto; shadow: 0 8px 16px rgba(0, 0, 0, 0.2); }
        h1 { color: #FFFFFF; font-size: 22px; margin-top: 0; margin-bottom: 10px; font-weight: 800; }
        p { color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0; }
        .status { margin-top: 28px; display: inline-block; padding: 10px 20px; background-color: ${bgColor}; border: 1px solid ${borderColor}; color: ${textColor}; border-radius: 20px; font-weight: 700; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-badge">❖ REILO</div>
        <div class="icon-circle">${icon}</div>
        <h1>Response Recorded</h1>
        <p>${message}</p>
        <div class="status">Status: ${statusLabel}</div>
      </div>
    </body>
    </html>
  `;

  res.send(htmlResponse);
});

// Setup Database and Start Server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB Atlas');
    } else {
      console.warn('MONGODB_URI is not set. Running without database connection.');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
