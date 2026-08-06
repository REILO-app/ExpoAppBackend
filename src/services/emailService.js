const path = require('path');
const nodemailer = require('nodemailer');
const { buildReiloEmailHtml } = require('./emailTemplate');

async function sendReiloEmail({ to, subject, body, htmlOptions = {}, attachmentBuffer, attachmentFilename }) {
  const htmlBody = buildReiloEmailHtml({ body, ...htmlOptions });

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('--- MOCK EMAIL TRANSMISSION ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Has Attachment:', !!attachmentBuffer);
    console.log('-------------------------------');
    return { simulated: true, messageId: null };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    text: body,
    html: htmlBody,
    attachments: [
      ...(attachmentBuffer
        ? [
            {
              filename: attachmentFilename || 'resume.pdf',
              content: attachmentBuffer,
            },
          ]
        : []),
      {
        filename: 'icons_small.jpg',
        path: path.join(__dirname, '../../assets/icons_small.jpg'),
        cid: 'reilo-icon',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  return { simulated: false, messageId: info.messageId };
}

module.exports = { sendReiloEmail };
