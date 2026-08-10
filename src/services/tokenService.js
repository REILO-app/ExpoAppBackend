const jwt = require('jsonwebtoken');
const ReferralToken = require('../models/ReferralToken');

const TOKEN_EXPIRY_HOURS = 24;

/**
 * Returns the JWT secret, throwing clearly if it is missing so the
 * developer gets a useful error at startup/test time rather than a
 * cryptic failure later.
 */
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Cannot sign referral tokens.');
  }
  return secret;
}

/**
 * createReferralToken
 *
 * Signs a JWT containing the referral action context and persists a one-time
 * record in MongoDB.  Returns the raw token string to embed in an email URL.
 *
 * @param {Object} params
 * @param {string} params.referralId  — MongoDB ObjectId string of the Referral
 * @param {string} [params.jobId]     — MongoDB ObjectId string of the Job (job emails only)
 * @param {string} params.email       — Intended recipient email address
 * @param {'yes'|'no'} params.action  — Which button this token represents
 * @param {'invite'|'job'} params.type — Email type
 * @returns {Promise<string>} Signed JWT string
 */
async function createReferralToken({ referralId, jobId = null, email, action, type }) {
  const secret = getSecret();

  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  const payload = {
    referralId,
    jobId: jobId || null,
    email,
    action,
    type,
  };

  const token = jwt.sign(payload, secret, {
    expiresIn: `${TOKEN_EXPIRY_HOURS}h`,
    // jti (JWT ID) makes every token unique even when payload is identical
    jwtid: require('crypto').randomUUID(),
  });

  await ReferralToken.create({
    token,
    referralId,
    jobId: jobId || null,
    email,
    action,
    type,
    expiresAt,
  });

  return token;
}

/**
 * verifyAndConsumeToken
 *
 * Validates the JWT signature and expiry, checks the DB record has not been
 * used before, then stamps usedAt to prevent replay.
 *
 * Throws a descriptive error on any failure so callers can render an
 * appropriate response page.
 *
 * @param {string} tokenString — Raw JWT string from the URL query param
 * @returns {Promise<Object>} Decoded payload { referralId, jobId, email, action, type }
 */
async function verifyAndConsumeToken(tokenString) {
  const secret = getSecret();

  // 1. Verify JWT signature and expiry
  let payload;
  try {
    payload = jwt.verify(tokenString, secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw Object.assign(new Error('This link has expired.'), { code: 'TOKEN_EXPIRED' });
    }
    throw Object.assign(new Error('Invalid or tampered token.'), { code: 'TOKEN_INVALID' });
  }

  // 2. Look up the DB record (guards against tokens signed with an old secret
  //    that may have been rotated but not yet expired, and confirms the token
  //    was actually issued by this system)
  const record = await ReferralToken.findOne({ token: tokenString });
  if (!record) {
    throw Object.assign(new Error('Token not found. It may have already expired.'), { code: 'TOKEN_NOT_FOUND' });
  }

  // 3. Replay attack guard — reject if already consumed
  if (record.usedAt) {
    throw Object.assign(
      new Error('This link has already been used.'),
      { code: 'TOKEN_ALREADY_USED' }
    );
  }

  // 4. Mark as consumed (atomic update to minimise race conditions)
  await ReferralToken.findOneAndUpdate(
    { token: tokenString, usedAt: null },  // only update if still unused
    { $set: { usedAt: new Date() } }
  );

  return {
    referralId: payload.referralId,
    jobId: payload.jobId || null,
    email: payload.email,
    action: payload.action,
    type: payload.type,
  };
}

module.exports = { createReferralToken, verifyAndConsumeToken };
