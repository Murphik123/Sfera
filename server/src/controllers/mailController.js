// src/controllers/mailController.js
const { Resend } = require('resend');

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

exports.sendMail = async (req, res) => {
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

    // Сырой HTML разрешён только администраторам, иначе любой пользователь
    // может рассылать фишинг с домена платформы.
    const isAdmin = req.user?.role === 'admin';
    const body = isAdmin && html
      ? html
      : `<p>${escapeHtml(text || 'Hello from Sfera!')}</p>`;

    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: 'Sfera Platform <onboarding@resend.dev>',
      to: [to],
      subject: typeof subject === 'string' && subject ? subject : 'Notification from Sfera',
      html: body,
    });

    if (response?.error) {
      console.error('Ошибка от Resend:', response.error);
      return res.status(400).json({ success: false, message: 'Failed to send email.' });
    }

    return res.status(200).json({ success: true, message: 'Email sent successfully.', id: response?.data?.id || null });
  } catch (error) {
    console.error('Ошибка при отправке почты:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
};
