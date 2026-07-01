// API bilan ishlash va yordamchi funksiyalar
const App = {
  currency: "so'm",
};

function authToken() {
  return localStorage.getItem('token') || '';
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const t = authToken();
  if (t) headers.Authorization = 'Bearer ' + t;

  const res = await fetch('/api' + path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}

  // Token eskirgan / yo'q bo'lsa - login oynasiga qaytaramiz
  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/status')) {
    localStorage.removeItem('token');
    if (typeof showLogin === 'function') showLogin();
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Server xatosi');
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

// Sonni chiroyli formatlash: 1234567 -> "1 234 567"
function fmt(n) {
  const num = Math.round(Number(n) || 0);
  return num.toLocaleString('ru-RU').replace(/,/g, ' ');
}
function money(n) {
  return fmt(n) + ' ' + App.currency;
}
function fmtKg(n) {
  const num = Number(n) || 0;
  return (Math.round(num * 10) / 10).toLocaleString('ru-RU').replace(/,/g, ' ') + ' kg';
}
function fmtDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Toast bildirishnoma
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// Modal ochish / yopish
function openModal(html) {
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});
