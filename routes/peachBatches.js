const express = require('express');
const PeachBatch = require('../models/PeachBatch');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');

const router = express.Router();

// Topshirish hisob-kitobini bajaradigan yordamchi.
// crateCount - olingan yashiklar soni, deliveredCrates - to'lgan (sotilgan) yashiklar.
// Yashik bepul, xarajat yo'q. Hisob faqat to'lgan yashiklar bo'yicha boradi.
async function computeDelivery({ crateCount, deliveredCrates, taraPerCrate, kgMode, kgInput, sellPricePerKg }) {
  const settings = await Settings.getSingleton();

  // Har bir yashik uchun tara (topshirishda kiritiladi; kiritilmasa - sozlamadagi standart)
  let taraKgPerCrate = Number(taraPerCrate);
  if (Number.isNaN(taraKgPerCrate)) taraKgPerCrate = settings.taraKgPerCrate;
  taraKgPerCrate = Math.max(0, taraKgPerCrate);

  // To'lgan yashiklar soni (kiritilmasa - hammasi to'lgan deb olamiz)
  let filled = Number(deliveredCrates);
  if (!filled && filled !== 0) filled = crateCount;
  filled = Math.max(0, Math.min(filled, crateCount));
  const emptyCrates = crateCount - filled;

  const groupsOf10 = filled / 10; // to'lgan yashiklardagi "10talik" guruhlar
  const kg = Number(kgInput) || 0;
  const price = Number(sellPricePerKg) || 0;

  // Umumiy (brutto) kg
  let grossKg;
  if (kgMode === 'per10') {
    // Har 10 yashik uchun kg kiritilgan -> guruhlar soniga ko'paytiramiz
    grossKg = kg * groupsOf10;
  } else {
    // To'g'ridan-to'g'ri umumiy kg kiritilgan
    grossKg = kg;
  }

  // Tara: har bir to'lgan yashik uchun belgilangan vazn olib tashlanadi
  const taraKg = taraKgPerCrate * filled;
  const netKg = Math.max(0, grossKg - taraKg);
  const revenue = netKg * price;
  // Yashik bepul bo'lgani uchun sof foyda = to'liq tushum
  const netProfit = revenue;

  return {
    deliveredCrates: filled,
    emptyCrates,
    taraPerCrate: taraKgPerCrate,
    kgMode,
    kgInput: kg,
    grossKg,
    taraKg,
    netKg,
    sellPricePerKg: price,
    revenue,
    netProfit,
    groupsOf10,
  };
}

// Barcha partiyalar (ochiq + topshirilgan)
router.get('/', async (req, res, next) => {
  try {
    const filter = { slot: req.slot };
    if (req.query.status) filter.status = req.query.status;
    const items = await PeachBatch.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Yashik olish (yangi partiya ochish) — yashik bepul, faqat sonini so'raymiz
router.post('/', async (req, res, next) => {
  try {
    const crateCount = Number(req.body.crateCount);
    if (!crateCount || crateCount <= 0)
      return res.status(400).json({ error: 'Yashiklar sonini kiriting' });

    const batch = await PeachBatch.create({ crateCount, slot: req.slot });
    res.status(201).json(batch);
  } catch (e) {
    next(e);
  }
});

// Topshirishni HISOBLASH (saqlamasdan, sof foydani ko'rsatish uchun)
router.post('/:id/preview', async (req, res, next) => {
  try {
    const batch = await PeachBatch.findOne({ _id: req.params.id, slot: req.slot });
    if (!batch) return res.status(404).json({ error: 'Partiya topilmadi' });
    if (batch.status === 'delivered')
      return res.status(400).json({ error: 'Bu partiya allaqachon topshirilgan' });

    const calc = await computeDelivery({
      crateCount: batch.crateCount,
      deliveredCrates: req.body.deliveredCrates,
      taraPerCrate: req.body.taraPerCrate,
      kgMode: req.body.kgMode,
      kgInput: req.body.kgInput,
      sellPricePerKg: req.body.sellPricePerKg,
    });
    res.json(calc);
  } catch (e) {
    next(e);
  }
});

// Topshirishni TASDIQLASH (saqlash + sof foydani kirimga o'tkazish)
router.post('/:id/deliver', async (req, res, next) => {
  try {
    const batch = await PeachBatch.findOne({ _id: req.params.id, slot: req.slot });
    if (!batch) return res.status(404).json({ error: 'Partiya topilmadi' });
    if (batch.status === 'delivered')
      return res.status(400).json({ error: 'Bu partiya allaqachon topshirilgan' });

    const calc = await computeDelivery({
      crateCount: batch.crateCount,
      deliveredCrates: req.body.deliveredCrates,
      taraPerCrate: req.body.taraPerCrate,
      kgMode: req.body.kgMode,
      kgInput: req.body.kgInput,
      sellPricePerKg: req.body.sellPricePerKg,
    });

    batch.status = 'delivered';
    batch.delivery = {
      deliveredCrates: calc.deliveredCrates,
      emptyCrates: calc.emptyCrates,
      taraPerCrate: calc.taraPerCrate,
      kgMode: calc.kgMode,
      kgInput: calc.kgInput,
      grossKg: calc.grossKg,
      taraKg: calc.taraKg,
      netKg: calc.netKg,
      sellPricePerKg: calc.sellPricePerKg,
      revenue: calc.revenue,
      netProfit: calc.netProfit,
      deliveredAt: new Date(),
    };
    await batch.save();

    // Sof foydani kirim/chiqim yozuviga aylantiramiz
    if (calc.netProfit >= 0) {
      await Transaction.create({
        type: 'kirim',
        amount: calc.netProfit,
        note: `Shaftoli kuni — ${batch.crateCount} yashik (sof foyda)`,
        source: 'shaftoli',
        batch: batch._id,
        slot: req.slot,
      });
    } else {
      await Transaction.create({
        type: 'chiqim',
        amount: Math.abs(calc.netProfit),
        category: 'Shaftoli zarari',
        note: `Shaftoli kuni — ${batch.crateCount} yashik (zarar)`,
        source: 'shaftoli',
        batch: batch._id,
        slot: req.slot,
      });
    }

    res.json(batch);
  } catch (e) {
    next(e);
  }
});

// Partiyani o'chirish (va unga bog'liq yozuvni)
router.delete('/:id', async (req, res, next) => {
  try {
    const batch = await PeachBatch.findOneAndDelete({ _id: req.params.id, slot: req.slot });
    if (!batch) return res.status(404).json({ error: 'Topilmadi' });
    await Transaction.deleteMany({ batch: batch._id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
