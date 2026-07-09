const mongoose = require('mongoose');

// Chiqim kategoriyalari (masalan: "Ishchilar", "O'g'it", "Yoqilg'i" ...)
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slot: { type: Number, default: 1, index: true }, // qaysi xotiraga tegishli
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
