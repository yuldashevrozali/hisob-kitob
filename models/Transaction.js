const mongoose = require('mongoose');

// Kirim yoki chiqim yozuvi
const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['kirim', 'chiqim'], required: true },
    amount: { type: Number, required: true, min: 0 },
    // Chiqim uchun kategoriya nomi (kirim uchun bo'sh bo'lishi mumkin)
    category: { type: String, default: '' },
    note: { type: String, default: '' },
    // Yozuv qayerdan kelgani: qo'lda kiritilgan yoki shaftoli kuni topshirishdan
    source: { type: String, enum: ['manual', 'shaftoli'], default: 'manual' },
    // Agar shaftoli partiyasidan kelgan bo'lsa - shu partiya id'si
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'PeachBatch', default: null },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
