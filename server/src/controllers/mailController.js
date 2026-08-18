// src/controllers/mailController.js
const { Resend } = require('resend');

const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');

exports.sendMail = asyncHandler(async (req, res) => {
  const { to, subject, html, text } = req.body;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw ApiError.unavailable('Email service is not configured on the server.');
  }

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw ApiError.badRequest('Please provide a valid recipient email address.');
  }

  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from: 'Sfera Platform <onboarding@resend.dev>',
    to: [to],
    subject: subject || 'Notification from Sfera',
    html: html || `<p>${text || 'Hello from Sfera!'}</p>`,
  });

  if (response?.error) {
    throw ApiError.badRequest('Failed to send email.', response.error);
  }

  return res.status(200).json({
    success: true,
    message: 'Email sent successfully.',
    id: response?.data?.id || null
  });
}, { format: 'success', message: 'Failed to send email.' });
