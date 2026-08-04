// src/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Сумма транзакции обязательна'],
    min: [0.01, 'Сумма транзакции должна быть больше 0']
  },
  type: {
    type: String,
    enum: ['transfer', 'deposit', 'withdrawal', 'payment'],
    default: 'transfer'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // Автоматически добавляет и обновляет поля createdAt и updatedAt
});

module.exports = mongoose.model('Transaction', transactionSchema);
