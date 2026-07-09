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

// Har bir so'rovda faol xotirani (slot) aniqlab, req.slot ga qo'yamiz
const Settings = require('./models/Settings');
app.use('/api', async (req, res, next) => {
  try {
    const s = await Settings.getSingleton();
    req.slot = s.activeSlot || 1;
    next();
  } catch (e) {
    next(e);
  }
});

// API yo'nalishlari (login talab qilinmaydi)
app.use('/api/categories', require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/peach-batches', require('./routes/peachBatches'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/stats', require('./routes/stats'));

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

    // Migratsiya: eski ma'lumotlarni 1-xotiraga bog'laymiz
    try {
      const Category = require('./models/Category');
      const Transaction = require('./models/Transaction');
      const PeachBatch = require('./models/PeachBatch');
      for (const M of [Category, Transaction, PeachBatch]) {
        await M.updateMany({ slot: { $exists: false } }, { $set: { slot: 1 } });
      }
      // Kategoriya nomidagi eski global unique indeksni olib tashlaymiz (endi xotira bo'yicha)
      try {
        await Category.collection.dropIndex('name_1');
      } catch (_) {}
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
