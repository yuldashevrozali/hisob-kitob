# 🍑 Shaftoli bog'i — Hisob-kitob tizimi

Shaftoli bog'i uchun kirim-chiqim, shaftoli kuni (yashik olish/topshirish) va statistika web-sayti.
Texnologiyalar: **Node.js + Express + MongoDB (Mongoose)** + vanilla JS frontend.

## Kirish (login)

- Saytga faqat **kalit so'z** bilan kiriladi. Standart: **`300million`**.
- **Sessiya 24 soat** amal qiladi — keyin avtomatik logout bo'ladi (qaytadan kirish kerak).
- Bir vaqtda faqat **2 ta qurilma** kira oladi. **3-qurilma** kirmoqchi bo'lsa — **barcha qurilmalar avtomatik tizimdan chiqariladi** (xavfsizlik chorasi), keyin hamma qaytadan kiradi.
- **Sozlamalar → Kirish sozlamalari** bo'limida: faol qurilmalar soni ko'rinadi, kalit so'zni o'zgartirish va "Barcha qurilmalardan chiqish" tugmasi bor.

> ℹ️ Sessiyalar serverning xotirasida saqlanadi — server qayta ishga tushsa, hamma qaytadan login qiladi.

## Bo'limlar

- **Bosh sahifa** — umumiy balans, so'nggi yozuvlar, ochiq partiyalar.
- **Kirim / Chiqim** — pul tushumi va xarajat qo'shish. Chiqimda kategoriya tanlanadi.
- **Shaftoli kuni** — "UNO" tugmasi bilan yashik olinadi (yashik bepul — faqat soni), keyin topshiriladi:
  - kg kiritishni **umumiy kg** yoki **har 10 yashik uchun kg** tarzida tanlash mumkin;
  - har 10 yashik uchun tara (standart **20 kg**) ayriladi;
  - sof foyda hisoblanadi va **tasdiqlanganda avtomatik kirimga** o'tadi.
- **Statistika** — faqat o'qish uchun grafiklar va jami ko'rsatkichlar.
- **Sozlamalar** — chiqim kategoriyalarini qo'shish/o'chirish, tara va valyutani sozlash.

## Ishga tushirish

### 1. MongoDB tayyorlash
Ikki variantdan biri:

**a) Bepul bulutli baza — MongoDB Atlas (tavsiya etiladi):**
1. https://www.mongodb.com/atlas saytida bepul cluster oching.
2. Connection string'ni oling: `mongodb+srv://...`

**b) Lokal MongoDB:**
```bash
brew install mongodb-community   # macOS
brew services start mongodb-community
```

### 2. Loyihani sozlash
```bash
cd hisob-kitob
npm install
cp .env.example .env
```
`.env` faylida `MONGODB_URI` ni o'zingiznikiga moslang.

### 3. Serverni ishga tushirish
```bash
npm start
```
Brauzerda oching: **http://localhost:3000**

## Sof foyda hisobi (formula)

```
guruhlar      = yashik_soni / 10
brutto_kg     = (umumiy kg)  yoki  (har_10_uchun_kg × guruhlar)
tara_kg       = tara_per_10  × guruhlar          (standart 20 kg)
sof_kg        = brutto_kg − tara_kg
sof_foyda     = sof_kg × 1kg_narxi               (yashik bepul — xarajat yo'q)
```
Tasdiqlangach `sof_foyda` **kirim** yozuvi sifatida saqlanadi.
