const express = require('express');
const crypto = require('crypto');
const Auth = require('../models/Auth');

const router = express.Router();

// Faol tokenlar (xotirada). Server qayta ishga tushsa - qayta login kerak.
const tokens = new Map();

// Ikki qo'l vektori orasidagi masofa (qancha kichik - shuncha o'xshash)
function distance(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}
const MATCH_THRESHOLD = 0.9; // bundan kichik bo'lsa - bir xil qo'l

function validDescriptor(d) {
  return Array.isArray(d) && d.length === 63 && d.every((x) => typeof x === 'number');
}

// Himoyalangan yo'nalishlar uchun middleware
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
  }
  next();
}

// --- OCHIQ yo'nalishlar ---

// Login holati: nechta odam (qo'l) qo'shilgan
router.get('/status', async (req, res, next) => {
  try {
    const auth = await Auth.getSingleton();
    res.json({ handsCount: auth.hands.length });
  } catch (e) {
    next(e);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const auth = await Auth.getSingleton();
    const { passphrase, descriptor } = req.body;

    // 1) Kalit so'z tekshiruvi
    if ((passphrase || '') !== auth.passphrase) {
      return res.status(401).json({ error: "Kalit so'z noto'g'ri" });
    }

    // 2) Agar odam(lar) qo'shilgan bo'lsa - qo'l skaneri majburiy
    let who = null;
    if (auth.hands.length > 0) {
      if (!validDescriptor(descriptor)) {
        return res.status(401).json({ error: "Qo'l skaneri talab qilinadi", needHand: true });
      }
      let best = Infinity;
      for (const h of auth.hands) {
        const d = distance(descriptor, h.descriptor);
        if (d < best) {
          best = d;
          who = h.label;
        }
      }
      if (best > MATCH_THRESHOLD) {
        return res.status(401).json({ error: "Qo'l tanilmadi. Qaytadan urinib ko'ring", needHand: true });
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    tokens.set(token, Date.now());
    res.json({ token, who });
  } catch (e) {
    next(e);
  }
});

// --- HIMOYALANGAN yo'nalishlar ---

// Token to'g'riligini tekshirish
router.get('/me', authRequired, (req, res) => {
  res.json({ ok: true });
});

// Logout
router.post('/logout', authRequired, (req, res) => {
  const token = req.headers.authorization.slice(7);
  tokens.delete(token);
  res.json({ ok: true });
});

// Qo'shilgan odamlar ro'yxati (vektorsiz)
router.get('/hands', authRequired, async (req, res, next) => {
  try {
    const auth = await Auth.getSingleton();
    res.json(auth.hands.map((h) => ({ _id: h._id, label: h.label, createdAt: h.createdAt })));
  } catch (e) {
    next(e);
  }
});

// Yangi odam (qo'l) qo'shish - maksimal 2 ta
router.post('/hands', authRequired, async (req, res, next) => {
  try {
    const auth = await Auth.getSingleton();
    if (auth.hands.length >= 2) {
      return res.status(400).json({ error: 'Maksimal 2 ta odam qo\'shish mumkin' });
    }
    const { descriptor, label } = req.body;
    if (!validDescriptor(descriptor)) {
      return res.status(400).json({ error: 'Skaner natijasi noto\'g\'ri. Qaytadan skaner qiling' });
    }
    auth.hands.push({ label: (label || '').trim() || `Odam ${auth.hands.length + 1}`, descriptor });
    await auth.save();
    res.status(201).json(auth.hands.map((h) => ({ _id: h._id, label: h.label, createdAt: h.createdAt })));
  } catch (e) {
    next(e);
  }
});

// Odamni o'chirish
router.delete('/hands/:id', authRequired, async (req, res, next) => {
  try {
    const auth = await Auth.getSingleton();
    auth.hands = auth.hands.filter((h) => String(h._id) !== req.params.id);
    await auth.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
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
