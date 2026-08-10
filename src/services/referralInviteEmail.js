const { sendReiloEmail } = require('./emailService');
const { createReferralToken } = require('./tokenService');

function buildReferralInviteEmailBody({ referralName, userName, company }) {
  const firstName = referralName.split(' ')[0];

  return [
    `Hi ${firstName},`,
    '',
    `${userName} has added you to Reilo — a referral tracking app that helps professionals stay organized with their referral network.`,
    '',
    `They've listed you as a contact at ${company} and would like to know if you'd be open to referring them for future opportunities at ${company} when the right role comes up.`,
    '',
    `This is not a request for a specific job right now. We're simply confirming whether you're willing to be a referral contact going forward.`,
    '',
    `Your response helps ${userName} know who they can reach out to when they're ready to apply.`,
    '',
    'Thank you for taking a moment to respond.',
    '',
    'Best,',
    'The Reilo Team',
  ].join('\n');
}

function buildReferralInviteSubject(userName) {
  return `${userName} added you on Reilo — quick referral question`;
}

async function sendReferralInviteEmail({ referral, user, baseUrl }) {
  if (!referral.email) {
    return { sent: false, reason: 'no_email' };
  }

  const referralId = referral._id.toString();

  // Create two separate signed, expiring, one-time tokens — one per action.
  // This replaces the raw referralId in the URL, preventing IDOR and replay attacks.
  const [yesToken, noToken] = await Promise.all([
    createReferralToken({ referralId, email: referral.email, action: 'yes', type: 'invite' }),
    createReferralToken({ referralId, email: referral.email, action: 'no',  type: 'invite' }),
  ]);

  const yesUrl = `${baseUrl}/api/referral/action?token=${yesToken}`;
  const noUrl  = `${baseUrl}/api/referral/action?token=${noToken}`;

  const body = buildReferralInviteEmailBody({
    referralName: referral.name,
    userName: user.name,
    company: referral.company || 'your company',
  });

  const subject = buildReferralInviteSubject(user.name);

  try {
    const result = await sendReiloEmail({
      to: referral.email,
      subject,
      body,
      htmlOptions: {
        yesUrl,
        noUrl,
        senderName: user.name,
        senderEmail: user.email,
        senderPhone: user.phone || '',
        senderLinkedin: user.linkedin || '',
        actionTitle: 'Referral Network Invite',
        actionQuestion: `Would you be willing to refer ${user.name} to ${referral.company || 'your company'} in the future?`,
        yesLabel: '✓ Yes, I am willing',
        noLabel: '✕ No, not at this time',
      },
    });

    return { sent: true, simulated: result.simulated, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send referral invite email:', error);
    return { sent: false, reason: 'send_failed', error: error.message };
  }
}

module.exports = {
  buildReferralInviteEmailBody,
  buildReferralInviteSubject,
  sendReferralInviteEmail,
};
