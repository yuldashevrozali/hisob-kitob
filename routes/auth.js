const express = require('express');
const crypto = require('crypto');
const Auth = require('../models/Auth');

const router = express.Router();

// Faol sessiyalar QURILMA bo'yicha: deviceId -> { token, createdAt }
// tokenIndex: token -> deviceId (tez qidirish uchun)
// Xotirada saqlanadi. Server qayta ishga tushsa - qayta login kerak.
const devices = new Map();
const tokenIndex = new Map();

const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 soat
const MAX_DEVICES = 2; // bir vaqtda faqat 2 qurilma

function dropDevice(deviceId) {
  const s = devices.get(deviceId);
  if (s) tokenIndex.delete(s.token);
  devices.delete(deviceId);
}

// 24 soatdan oshgan (eskirgan) sessiyalarni tozalash
function pruneExpired() {
  const now = Date.now();
  for (const [id, s] of devices) {
    if (now - s.createdAt > TOKEN_TTL) dropDevice(id);
  }
}

// Himoyalangan yo'nalishlar uchun middleware
function authRequired(req, res, next) {
  pruneExpired();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const deviceId = tokenIndex.get(token);
  const s = deviceId ? devices.get(deviceId) : null;
  if (!token || !s) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
  }
  if (Date.now() - s.createdAt > TOKEN_TTL) {
    dropDevice(deviceId);
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
    const deviceId = (req.body.deviceId || '').trim() || crypto.randomBytes(8).toString('hex');

    // Kalit so'z tekshiruvi
    if ((passphrase || '') !== auth.passphrase) {
      return res.status(401).json({ error: "Kalit so'z noto'g'ri" });
    }

    if (devices.has(deviceId)) {
      // Shu qurilma allaqachon kirgan — eski tokenni almashtiramiz (yangi qurilma emas)
      dropDevice(deviceId);
    } else if (devices.size >= MAX_DEVICES) {
      // 3-qurilma urinishi: barcha sessiyalar bekor qilinadi (hamma chiqadi)
      devices.clear();
      tokenIndex.clear();
      return res.status(403).json({
        error: '3-qurilma aniqlandi! Barcha qurilmalar tizimdan chiqarildi. Qaytadan kiring.',
        allLoggedOut: true,
      });
    }

    const token = crypto.randomBytes(24).toString('hex');
    devices.set(deviceId, { token, createdAt: Date.now() });
    tokenIndex.set(token, deviceId);
    res.json({ token, expiresIn: TOKEN_TTL, devices: devices.size });
  } catch (e) {
    next(e);
  }
});

// --- HIMOYALANGAN yo'nalishlar ---

// Token to'g'riligini tekshirish
router.get('/me', authRequired, (req, res) => {
  res.json({ ok: true, devices: devices.size });
});

// Faol qurilmalar soni
router.get('/sessions', authRequired, (req, res) => {
  res.json({ devices: devices.size, max: MAX_DEVICES });
});

// Chiqish (shu qurilma)
router.post('/logout', authRequired, (req, res) => {
  const token = req.headers.authorization.slice(7);
  const deviceId = tokenIndex.get(token);
  if (deviceId) dropDevice(deviceId);
  res.json({ ok: true });
});

// Barcha qurilmalardan chiqish
router.post('/logout-all', authRequired, (req, res) => {
  devices.clear();
  tokenIndex.clear();
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
