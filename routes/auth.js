const express = require('express');
const crypto = require('crypto');
const Auth = require('../models/Auth');

const router = express.Router();

// Faol sessiyalar (qurilmalar): token -> { createdAt }
// Xotirada saqlanadi. Server qayta ishga tushsa - qayta login kerak.
const sessions = new Map();

const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 soat
const MAX_DEVICES = 2; // bir vaqtda faqat 2 qurilma

// 24 soatdan oshgan (eskirgan) sessiyalarni tozalash
function pruneExpired() {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (now - s.createdAt > TOKEN_TTL) sessions.delete(token);
  }
}

// Himoyalangan yo'nalishlar uchun middleware
function authRequired(req, res, next) {
  pruneExpired();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const s = sessions.get(token);
  if (!token || !s) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
  }
  if (Date.now() - s.createdAt > TOKEN_TTL) {
    sessions.delete(token);
    return res.status(401).json({ error: '24 soat tugadi — qaytadan kiring' });
  }
  next();
}

// --- OCHIQ yo'nalishlar ---

// Login (faqat kalit so'z)
router.post('/login', async (req, res, next) => {
  try {
    pruneExpired();
    const auth = await Auth.getSingleton();
    const { passphrase } = req.body;

    // Kalit so'z tekshiruvi
    if ((passphrase || '') !== auth.passphrase) {
      return res.status(401).json({ error: "Kalit so'z noto'g'ri" });
    }

    // Qurilmalar limiti: allaqachon 2 ta qurilma kirgan bo'lsa,
    // 3-qurilma urinishi barcha sessiyalarni bekor qiladi (hamma chiqadi).
    if (sessions.size >= MAX_DEVICES) {
      sessions.clear();
      return res.status(403).json({
        error: "3-qurilma aniqlandi! Barcha qurilmalar tizimdan chiqarildi. Qaytadan kiring.",
        allLoggedOut: true,
      });
    }

    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { createdAt: Date.now() });
    res.json({ token, expiresIn: TOKEN_TTL, devices: sessions.size });
  } catch (e) {
    next(e);
  }
});

// --- HIMOYALANGAN yo'nalishlar ---

// Token to'g'riligini tekshirish
router.get('/me', authRequired, (req, res) => {
  res.json({ ok: true, devices: sessions.size });
});

// Faol qurilmalar soni
router.get('/sessions', authRequired, (req, res) => {
  res.json({ devices: sessions.size, max: MAX_DEVICES });
});

// Chiqish (shu qurilma)
router.post('/logout', authRequired, (req, res) => {
  const token = req.headers.authorization.slice(7);
  sessions.delete(token);
  res.json({ ok: true });
});

// Barcha qurilmalardan chiqish
router.post('/logout-all', authRequired, (req, res) => {
  sessions.clear();
  res.json({ ok: true });
});

// Kalit so'zni o'zgartirish
router.put('/passphrase', authRequired, async (req, res, next) => {
  try {
    const np = (req.body.passphrase || '').trim();
    if (np.length < 3) return res.status(400).json({ error: 'Kalit so\'z kamida 3 belgidan iborat bo\'lsin' });
    const auth = await Auth.getSingleton();
    auth.passphrase = np;
    await auth.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = { router, authRequired };
