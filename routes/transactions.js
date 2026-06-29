const express = require('express');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Yozuvlar ro'yxati (filtr: type=kirim|chiqim)
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const items = await Transaction.find(filter).sort({ date: -1, createdAt: -1 }).limit(500);
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Yangi kirim yoki chiqim qo'shish
router.post('/', async (req, res, next) => {
  try {
    const { type, amount, category, note, date } = req.body;
    if (!['kirim', 'chiqim'].includes(type))
      return res.status(400).json({ error: "Tur noto'g'ri (kirim/chiqim)" });
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: "Summani to'g'ri kiriting" });
    if (type === 'chiqim' && !(category || '').trim())
      return res.status(400).json({ error: 'Chiqim uchun kategoriya tanlang' });

    const item = await Transaction.create({
      type,
      amount: amt,
      category: type === 'chiqim' ? category.trim() : '',
      note: (note || '').trim(),
      date: date ? new Date(date) : new Date(),
      source: 'manual',
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

// Yozuvni o'chirish
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Transaction.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
