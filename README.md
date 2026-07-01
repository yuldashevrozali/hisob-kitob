# 🍑 Shaftoli bog'i — Hisob-kitob tizimi

Shaftoli bog'i uchun kirim-chiqim, shaftoli kuni (yashik olish/topshirish) va statistika web-sayti.
Texnologiyalar: **Node.js + Express + MongoDB (Mongoose)** + vanilla JS frontend.

## Bo'limlar

- **Bosh sahifa** — umumiy balans, so'nggi yozuvlar, ochiq partiyalar.
- **Kirim / Chiqim** — pul tushumi va xarajat qo'shish. Chiqimda kategoriya tanlanadi.
- **Shaftoli kuni** — "UNO" tugmasi bilan yashik olinadi (yashik bepul — faqat soni), keyin topshiriladi:
  - nechta yashik to'lgani (sotilgani) so'raladi, bo'sh qolgani ham saqlanadi;
  - kg kiritishni **umumiy kg** yoki **har 10 yashik uchun kg** tarzida tanlash mumkin;
  - **har bir yashik uchun tara** (kg) topshirishda so'raladi va to'lgan yashiklar soniga ko'paytirilib ayriladi;
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
tolgan_yashik = topshirishda kiritiladi (bo'sh = olingan − to'lgan)
guruhlar      = tolgan_yashik / 10
brutto_kg     = (umumiy kg)  yoki  (har_10_uchun_kg × guruhlar)
tara_kg       = tara_per_yashik × tolgan_yashik   (tara topshirishda so'raladi)
sof_kg        = brutto_kg − tara_kg
sof_foyda     = sof_kg × 1kg_narxi                (yashik bepul — xarajat yo'q)
```
Tasdiqlangach `sof_foyda` **kirim** yozuvi sifatida saqlanadi.
