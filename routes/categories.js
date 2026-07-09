const express = require('express');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Barcha kategoriyalar (faol xotira bo'yicha)
router.get('/', async (req, res, next) => {
  try {
    const items = await Category.find({ slot: req.slot }).sort({ name: 1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Yangi kategoriya qo'shish
router.post('/', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Kategoriya nomini kiriting' });
    const exists = await Category.findOne({ name, slot: req.slot });
    if (exists) return res.status(409).json({ error: 'Bu kategoriya allaqachon mavjud' });
    const item = await Category.create({ name, slot: req.slot });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

// Kategoriyani o'chirish
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Category.findOneAndDelete({ _id: req.params.id, slot: req.slot });
    if (!item) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
