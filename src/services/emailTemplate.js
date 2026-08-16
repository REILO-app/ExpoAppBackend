function buildReiloEmailHtml({
  body,
  yesUrl,
  noUrl,
  senderName,
  senderEmail,
  senderPhone,
  senderLinkedin,
  actionTitle = 'Referral Request Response',
  actionQuestion = 'Are you able to refer for this position?',
  yesLabel = '✓ Yes, I can refer',
  noLabel = '✕ No, I cannot',
}) {
  const name = senderName || '';
  const email = senderEmail || '';
  const phone = senderPhone || '';
  const linkedin = senderLinkedin || '';
  const formattedName = name.split('').join(' ');

  const paragraphs = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(
      (line) =>
        `<p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${line}</p>`
    )
    .join('');

  const actionBlock =
    yesUrl && noUrl
      ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 24px;">
      <tr>
        <td>
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; text-align: center;">
            <p style="font-size: 12px; font-weight: 800; color: #6366F1; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${actionTitle}</p>
            <p style="font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 18px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${actionQuestion}</p>
            <div>
              <a href="${yesUrl}" style="display: inline-block; padding: 13px 26px; margin-right: 10px; margin-bottom: 8px; background-color: #059669; color: #FFFFFF; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">${yesLabel}</a>
              <a href="${noUrl}" style="display: inline-block; padding: 13px 24px; margin-bottom: 8px; background-color: #FFFFFF; color: #475569; text-decoration: none; border: 1px solid #CBD5E1; border-radius: 10px; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">${noLabel}</a>
            </div>
          </div>
        </td>
      </tr>
    </table>
  `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Referral Request — ${name}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 36px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03); border: 1px solid #E2E8F0;">
              <tr>
                <td style="background: linear-gradient(135deg, #101c38 0%, #1c2c59 50%, #0d162d 100%); padding: 36px 32px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td valign="top" style="text-align: left;">
                        <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 400; margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase;">
                          ${formattedName}
                        </h2>
                        <p style="margin: 0 0 4px 0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                          <a href="mailto:${email}" style="color: #93C5FD; text-decoration: underline;">${email}</a>
                        </p>
                        <p style="color: #CBD5E1; font-size: 13px; margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                          ${phone}
                        </p>
                        <div>
                          <a href="${linkedin}" target="_blank" style="text-decoration: none; display: inline-block;">
                            <table role="presentation" cellspacing="0" cellpadding="0" style="display: inline-table;">
                              <tr>
                                <td style="background-color: #0A66C2; border-radius: 4px; padding: 3px 6px; color: #FFFFFF; font-weight: 800; font-size: 11px; font-family: sans-serif; letter-spacing: -0.5px;">in</td>
                              </tr>
                            </table>
                          </a>
                        </div>
                      </td>
                      <td valign="top" align="right" style="width: 80px; text-align: center;">
                        <img src="cid:reilo-icon" width="72" height="72" alt="Reilo" style="width: 72px; height: 72px; border-radius: 18px; border: 1.5px solid rgba(255, 255, 255, 0.25); box-shadow: 0 8px 20px rgba(0,0,0,0.5); display: inline-block; object-fit: cover;" />
                        <div style="color: #FFFFFF; font-size: 14px; font-weight: 800; letter-spacing: 0.8px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; margin-top: 6px;">
                          Reilo
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 36px 32px; background-color: #FFFFFF;">
                  ${paragraphs}
                  ${actionBlock}
                </td>
              </tr>
              <tr>
                <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
                  <p style="margin: 0; color: #94A3B8; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                    Sent via <strong>Reilo</strong> • Empowering Professional Referral Networks
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

module.exports = { buildReiloEmailHtml };
