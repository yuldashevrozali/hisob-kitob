require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shaftoli';

app.use(cors());
app.use(express.json());

// Auth (login) — ochiq yo'nalishlar shu yerda
const { router: authRouter, authRequired } = require('./routes/auth');
app.use('/api/auth', authRouter);

// Qolgan barcha API yo'nalishlari faqat login qilingandan keyin ishlaydi
app.use('/api/categories', authRequired, require('./routes/categories'));
app.use('/api/transactions', authRequired, require('./routes/transactions'));
app.use('/api/peach-batches', authRequired, require('./routes/peachBatches'));
app.use('/api/settings', authRequired, require('./routes/settings'));
app.use('/api/stats', authRequired, require('./routes/stats'));

// Frontend (statik fayllar)
app.use(express.static(path.join(__dirname, 'public')));

// Xatoliklarni qayta ishlash
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server xatosi' });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB ulandi:', MONGODB_URI);

    // Eski yuz skaneri ma'lumotlarini tozalaymiz (endi qo'l skaneri ishlatiladi)
    try {
      const res = await mongoose.connection.collection('auths').updateMany({}, { $unset: { faces: '' } });
      if (res.modifiedCount) console.log('🧹 Eski yuz skaneri tozalandi:', res.modifiedCount);
    } catch (_) {}
    app.listen(PORT, () => {
      console.log(`🍑 Server ishlayapti: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB ulanmadi:', err.message);
    console.error("   .env faylida MONGODB_URI to'g'ri ekanini tekshiring.");
    process.exit(1);
  }
}

start();
