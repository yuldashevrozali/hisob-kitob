const mongoose = require('mongoose');

// Umumiy sozlamalar (bitta hujjat yetarli)
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    // Har bir yashik uchun tara (yashik vazni) - kg. Topshirishda oldindan to'ldiriladi.
    taraKgPerCrate: { type: Number, default: 2 },
    currency: { type: String, default: "so'm" },
  },
  { timestamps: true }
);

// Sozlamalarni olish yoki yaratish uchun yordamchi
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'main' });
  if (!doc) doc = await this.create({ key: 'main' });
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
