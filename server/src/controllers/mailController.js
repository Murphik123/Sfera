// src/controllers/mailController.js
const { Resend } = require('resend');

// Ключ подтягивается автоматически из Environment на Render
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendMail = async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to) {
      return res.status(400).json({ 
        success: false, 
        message: 'Укажите email получателя в поле "to"' 
      });
    }

    const response = await resend.emails.send({
      from: 'Sfera Platform <onboarding@resend.dev>',
      to: [to],
      subject: subject || 'Уведомление от платформы Sfera',
      html: html || `<p>${text || 'Привет от Sfera!'}</p>`,
    });

    if (response.error) {
      console.error('Ошибка от Resend:', response.error);
      return res.status(400).json({ success: false, error: response.error });
    }

    return res.status(200).json({ success: true, id: response.data.id });
  } catch (error) {
    console.error('Ошибка при отправке почты:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
