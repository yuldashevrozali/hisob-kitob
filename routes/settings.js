const express = require('express');
const Settings = require('../models/Settings');

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
    if (req.body.taraKgPer10Crates !== undefined) {
      const v = Number(req.body.taraKgPer10Crates);
      if (Number.isNaN(v) || v < 0)
        return res.status(400).json({ error: "Tara qiymatini to'g'ri kiriting" });
      s.taraKgPer10Crates = v;
    }
    if (req.body.currency !== undefined) s.currency = String(req.body.currency).trim() || "so'm";
    await s.save();
    res.json(s);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
