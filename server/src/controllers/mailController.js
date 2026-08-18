// src/controllers/mailController.js
const { Resend } = require('resend');

exports.sendMail = async (req, res, next) => {
  try {
    const { to, subject, html, text } = req.body;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured on the server.'
      });
    }

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid recipient email address.'
      });
    }

    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: 'Sfera Platform <onboarding@resend.dev>',
      to: [to],
      subject: subject || 'Notification from Sfera',
      html: html || `<p>${text || 'Hello from Sfera!'}</p>`,
    });

    if (response?.error) {
      console.error('Ошибка от Resend:', response.error);
      return res.status(400).json({ success: false, message: 'Failed to send email.', error: response.error });
    }

    return res.status(200).json({ success: true, message: 'Email sent successfully.', id: response?.data?.id || null });
  } catch (error) {
    return next(error);
  }
};
