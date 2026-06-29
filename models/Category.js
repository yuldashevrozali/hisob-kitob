const mongoose = require('mongoose');

// Chiqim kategoriyalari (masalan: "Ishchilar", "O'g'it", "Yoqilg'i" ...)
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
