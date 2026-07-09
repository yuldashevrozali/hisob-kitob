const express = require('express');
const Settings = require('../models/Settings');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const PeachBatch = require('../models/PeachBatch');

const router = express.Router();

// Sozlamalarni olish
router.get('/', async (req, res, next) => {
  try {
    const s = await Settings.getSingleton();
    res.json(s);
  } catch (e) {
    next(e);
  }
});

// Sozlamalarni yangilash
router.put('/', async (req, res, next) => {
  try {
    const s = await Settings.getSingleton();
    if (req.body.taraKgPerCrate !== undefined) {
      const v = Number(req.body.taraKgPerCrate);
      if (Number.isNaN(v) || v < 0)
        return res.status(400).json({ error: "Tara qiymatini to'g'ri kiriting" });
      s.taraKgPerCrate = v;
    }
    if (req.body.currency !== undefined) s.currency = String(req.body.currency).trim() || "so'm";
    await s.save();
    res.json(s);
  } catch (e) {
    next(e);
  }
});

// Faol xotirani (1 yoki 2) tanlash
router.put('/slot', async (req, res, next) => {
  try {
    const slot = Number(req.body.slot);
    if (![1, 2].includes(slot)) return res.status(400).json({ error: 'Xotira 1 yoki 2 bo\'lishi kerak' });
    const s = await Settings.getSingleton();
    s.activeSlot = slot;
    await s.save();
    res.json(s);
  } catch (e) {
    next(e);
  }
});

// Joriy (faol) xotiradagi barcha ma'lumotlarni tozalash (reset)
router.post('/reset', async (req, res, next) => {
  try {
    const slot = req.slot;
    const [c, t, p] = await Promise.all([
      Category.deleteMany({ slot }),
      Transaction.deleteMany({ slot }),
      PeachBatch.deleteMany({ slot }),
    ]);
    res.json({
      ok: true,
      slot,
      deleted: { categories: c.deletedCount, transactions: t.deletedCount, batches: p.deletedCount },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
