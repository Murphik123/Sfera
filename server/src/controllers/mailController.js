const Mail = require('../models/Mail');

exports.sendMail = async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    const mail = new Mail({
      from: req.userId,
      to,
      subject,
      body
    });
    await mail.save();
    res.status(201).json(mail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInbox = async (req, res) => {
  try {
    const mails = await Mail.find({ to: req.userId }).sort({ createdAt: -1 });
    res.json(mails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOutbox = async (req, res) => {
  try {
    const mails = await Mail.find({ from: req.userId }).sort({ createdAt: -1 });
    res.json(mails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { mailId } = req.params;
    const mail = await Mail.findById(mailId);
    if (!mail) return res.status(404).json({ message: 'Mail not found' });

    if (mail.to.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    mail.read = true;
    await mail.save();
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
