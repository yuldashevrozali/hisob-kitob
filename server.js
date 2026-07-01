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
