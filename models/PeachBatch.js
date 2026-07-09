const mongoose = require('mongoose');

// Shaftoli kuni: yashik olish va keyin topshirish partiyasi
const peachBatchSchema = new mongoose.Schema(
  {
    slot: { type: Number, default: 1, index: true }, // qaysi xotiraga tegishli

    // --- Yashik olish bosqichi (yashik bepul, xarajat yo'q) ---
    crateCount: { type: Number, required: true, min: 1 }, // nechta yashik

    status: { type: String, enum: ['open', 'delivered'], default: 'open' },

    // --- Topshirish bosqichi (faqat topshirilganda to'ladi) ---
    delivery: {
      deliveredCrates: { type: Number, default: 0 }, // nechta yashik to'ldi (sotildi)
      emptyCrates: { type: Number, default: 0 }, // nechta yashik bo'sh qoldi (ma'lumot uchun)
      taraPerCrate: { type: Number, default: 0 }, // har bir yashik uchun tara (kg)
      kgMode: { type: String, enum: ['per10', 'total'], default: 'total' },
      kgInput: { type: Number, default: 0 }, // foydalanuvchi kiritgan qiymat
      grossKg: { type: Number, default: 0 }, // tara olib tashlangunga qadar
      taraKg: { type: Number, default: 0 }, // har 10 yashik uchun ushlanadigan vazn
      netKg: { type: Number, default: 0 }, // sof kg = grossKg - taraKg
      sellPricePerKg: { type: Number, default: 0 }, // 1 kg nechpuldan sotildi
      revenue: { type: Number, default: 0 }, // netKg * sellPricePerKg
      netProfit: { type: Number, default: 0 }, // revenue - totalCost
      deliveredAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PeachBatch', peachBatchSchema);
