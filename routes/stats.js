const express = require('express');
const Transaction = require('../models/Transaction');
const PeachBatch = require('../models/PeachBatch');

const router = express.Router();

// Sana kalitlari (kunlik / haftalik / oylik guruhlash uchun)
function pad(n) {
  return String(n).padStart(2, '0');
}
function dayKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
// Haftaning dushanbasi (hafta boshi) bo'yicha kalit
function weekKey(d) {
  const t = new Date(d);
  const day = (t.getDay() + 6) % 7; // dushanba = 0
  t.setDate(t.getDate() - day);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

// Yozuvlarni berilgan kalit funksiyasi bo'yicha guruhlash
function groupBy(txns, keyFn) {
  const map = {};
  for (const t of txns) {
    const key = keyFn(new Date(t.date));
    if (!map[key]) map[key] = { kirim: 0, chiqim: 0 };
    map[key][t.type] += t.amount;
  }
  return Object.keys(map)
    .sort()
    .map((k) => ({ label: k, kirim: map[k].kirim, chiqim: map[k].chiqim, foyda: map[k].kirim - map[k].chiqim }));
}

// Umumiy statistika (faqat o'qish uchun)
router.get('/', async (req, res, next) => {
  try {
    const txns = await Transaction.find({ slot: req.slot });

    let totalKirim = 0;
    let totalChiqim = 0;
    const byCategory = {}; // chiqim kategoriyalari bo'yicha

    for (const t of txns) {
      if (t.type === 'kirim') totalKirim += t.amount;
      else {
        totalChiqim += t.amount;
        const cat = t.category || 'Boshqa';
        byCategory[cat] = (byCategory[cat] || 0) + t.amount;
      }
    }

    // Kunlik / haftalik / oylik kesimlar (oxirgilarini ko'rsatamiz)
    const periods = {
      daily: groupBy(txns, dayKey).slice(-30),
      weekly: groupBy(txns, weekKey).slice(-26),
      monthly: groupBy(txns, monthKey).slice(-12),
    };

    // Shaftoli partiyalari statistikasi + narx tarixi
    const batches = await PeachBatch.find({ status: 'delivered', slot: req.slot }).sort({ 'delivery.deliveredAt': 1 });
    let totalCrates = 0;
    let totalDeliveredCrates = 0;
    let totalEmptyCrates = 0;
    let totalNetKg = 0;
    let totalPeachProfit = 0;
    const priceHistory = [];
    for (const b of batches) {
      totalCrates += b.crateCount;
      totalDeliveredCrates += b.delivery?.deliveredCrates || 0;
      totalEmptyCrates += b.delivery?.emptyCrates || 0;
      totalNetKg += b.delivery?.netKg || 0;
      totalPeachProfit += b.delivery?.netProfit || 0;
      if (b.delivery?.sellPricePerKg) {
        priceHistory.push({
          date: b.delivery.deliveredAt || b.updatedAt,
          price: b.delivery.sellPricePerKg,
          netKg: b.delivery.netKg,
        });
      }
    }

    const categories = Object.keys(byCategory)
      .map((k) => ({ category: k, amount: byCategory[k] }))
      .sort((a, b) => b.amount - a.amount);

    res.json({
      totalKirim,
      totalChiqim,
      balance: totalKirim - totalChiqim,
      txnCount: txns.length,
      byCategory: categories,
      periods,
      priceHistory,
      peach: {
        deliveredBatches: batches.length,
        totalCrates,
        totalDeliveredCrates,
        totalEmptyCrates,
        totalNetKg,
        totalPeachProfit,
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
