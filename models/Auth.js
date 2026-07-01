const mongoose = require('mongoose');

// Login sozlamalari (bitta hujjat yetarli) — faqat kalit so'z
const authSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    passphrase: { type: String, default: '300million' }, // kalit so'z
  },
  { timestamps: true }
);

authSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'main' });
  if (!doc) doc = await this.create({ key: 'main' });
  return doc;
};

module.exports = mongoose.model('Auth', authSchema);
