const mongoose = require('mongoose');

// Bitta qo'l yozuvi (skaner natijasi = qo'l geometriyasi vektori)
const handSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Odam' },
    descriptor: { type: [Number], required: true }, // 63 ta son (21 nuqta × x,y,z)
  },
  { timestamps: true }
);

// Login sozlamalari (bitta hujjat yetarli)
const authSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    passphrase: { type: String, default: '300million' }, // kalit so'z
    hands: { type: [handSchema], default: [] }, // qo'l skanerlari (maks 2)
  },
  { timestamps: true }
);

authSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'main' });
  if (!doc) doc = await this.create({ key: 'main' });
  return doc;
};

module.exports = mongoose.model('Auth', authSchema);
