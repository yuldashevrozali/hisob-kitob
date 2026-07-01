// ============ Router ============
const routes = {
  '/': renderHome,
  '/kirim-chiqim': renderKirimChiqim,
  '/shaftoli-kuni': renderShaftoliKuni,
  '/statistika': renderStatistika,
  '/sozlamalar': renderSozlamalar,
};

const view = document.getElementById('view');

async function router() {
  const hash = location.hash.replace('#', '') || '/';
  const fn = routes[hash] || renderHome;
  document.querySelectorAll('#nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === hash);
  });
  document.querySelector('.sidebar').classList.remove('open');
  view.innerHTML = '<div class="empty">Yuklanmoqda...</div>';
  try {
    await fn();
  } catch (e) {
    view.innerHTML = `<div class="empty">Xatolik: ${e.message}</div>`;
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', async () => {
  // Sozlamalarni (valyuta) oldindan yuklab olamiz
  try {
    const s = await api('/settings');
    App.currency = s.currency || "so'm";
  } catch (_) {}
  router();
});
document.getElementById('menuBtn').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

// ============ Bosh sahifa ============
async function renderHome() {
  const [stats, batches, txns] = await Promise.all([
    api('/stats'),
    api('/peach-batches?status=open'),
    api('/transactions'),
  ]);
  const recent = txns.slice(0, 8);

  view.innerHTML = `
    <h1 class="page-title">Bosh sahifa</h1>
    <p class="page-sub">Shaftoli bog'i hisob-kitobining umumiy holati</p>

    <div class="grid grid-3">
      <div class="card stat-card">
        <div class="label">Umumiy kirim</div>
        <div class="value green">${money(stats.totalKirim)}</div>
      </div>
      <div class="card stat-card">
        <div class="label">Umumiy chiqim</div>
        <div class="value red">${money(stats.totalChiqim)}</div>
      </div>
      <div class="card stat-card">
        <div class="label">Sof balans</div>
        <div class="value ${stats.balance >= 0 ? 'green' : 'red'}">${money(stats.balance)}</div>
      </div>
    </div>

    <div class="grid grid-3" style="margin-top:18px">
      <div class="card stat-card">
        <div class="label">Ochiq partiyalar</div>
        <div class="value blue">${batches.length} ta</div>
      </div>
      <div class="card stat-card">
        <div class="label">Topshirilgan yashik</div>
        <div class="value">${fmt(stats.peach.totalCrates)} ta</div>
      </div>
      <div class="card stat-card">
        <div class="label">Shaftolidan foyda</div>
        <div class="value green">${money(stats.peach.totalPeachProfit)}</div>
      </div>
    </div>

    <div class="section-head">
      <h2>So'nggi yozuvlar</h2>
      <a href="#/kirim-chiqim" class="btn btn-ghost btn-sm">Barchasi →</a>
    </div>
    <div class="card">
      ${recent.length ? txnTable(recent) : '<div class="empty">Hozircha yozuvlar yo\'q</div>'}
    </div>

    ${
      batches.length
        ? `<div class="section-head"><h2>Topshirilmagan partiyalar</h2>
           <a href="#/shaftoli-kuni" class="btn btn-ghost btn-sm">Shaftoli kuni →</a></div>
           <div class="card">${batchTable(batches, false)}</div>`
        : ''
    }
  `;
}

// ============ Kirim / Chiqim ============
let kcTab = 'chiqim';
async function renderKirimChiqim() {
  const [cats, txns] = await Promise.all([api('/categories'), api('/transactions')]);

  view.innerHTML = `
    <h1 class="page-title">Kirim / Chiqim</h1>
    <p class="page-sub">Pul tushumi va xarajatlarni qo'shing</p>

    <div class="grid grid-2">
      <div class="card">
        <div class="seg" style="margin-bottom:18px">
          <button id="tabKirim" class="${kcTab === 'kirim' ? 'active' : ''}">＋ Kirim</button>
          <button id="tabChiqim" class="${kcTab === 'chiqim' ? 'active' : ''}">－ Chiqim</button>
        </div>
        <form id="txnForm">
          <div class="field">
            <label>Summa (${App.currency})</label>
            <input type="number" id="amount" min="0" step="any" placeholder="0" required />
          </div>
          <div class="field" id="catField" style="${kcTab === 'chiqim' ? '' : 'display:none'}">
            <label>Kategoriya</label>
            <select id="category">
              ${
                cats.length
                  ? cats.map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')
                  : '<option value="">— Avval sozlamalarda kategoriya qo\'shing —</option>'
              }
            </select>
            <div class="hint">Yangi kategoriyani <a href="#/sozlamalar" style="color:var(--accent-2)">Sozlamalar</a> bo'limida qo'shasiz</div>
          </div>
          <div class="field">
            <label>Izoh (ixtiyoriy)</label>
            <input type="text" id="note" placeholder="Masalan: ishchilar haqi" />
          </div>
          <div class="field">
            <label>Sana</label>
            <input type="date" id="date" value="${todayISO()}" />
          </div>
          <button type="submit" class="btn ${kcTab === 'kirim' ? 'btn-green' : 'btn-primary'} btn-block">
            ${kcTab === 'kirim' ? 'Kirim qo\'shish' : 'Chiqim qo\'shish'}
          </button>
        </form>
      </div>

      <div class="card">
        <div class="section-head" style="margin-top:0">
          <h2>Yozuvlar tarixi</h2>
        </div>
        ${txns.length ? txnTable(txns, true) : '<div class="empty">Hozircha yozuvlar yo\'q</div>'}
      </div>
    </div>
  `;

  document.getElementById('tabKirim').onclick = () => { kcTab = 'kirim'; renderKirimChiqim(); };
  document.getElementById('tabChiqim').onclick = () => { kcTab = 'chiqim'; renderKirimChiqim(); };

  document.getElementById('txnForm').onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      type: kcTab,
      amount: document.getElementById('amount').value,
      note: document.getElementById('note').value,
      date: document.getElementById('date').value,
    };
    if (kcTab === 'chiqim') body.category = document.getElementById('category').value;
    try {
      await api('/transactions', { method: 'POST', body });
      toast(kcTab === 'kirim' ? 'Kirim qo\'shildi' : 'Chiqim qo\'shildi', 'ok');
      renderKirimChiqim();
    } catch (err) {
      toast(err.message, 'err');
    }
  };
}

async function deleteTxn(id) {
  if (!confirm('Yozuvni o\'chirishni tasdiqlaysizmi?')) return;
  try {
    await api('/transactions/' + id, { method: 'DELETE' });
    toast('O\'chirildi', 'ok');
    router();
  } catch (e) {
    toast(e.message, 'err');
  }
}

// ============ Shaftoli kuni ============
async function renderShaftoliKuni() {
  const [open, delivered] = await Promise.all([
    api('/peach-batches?status=open'),
    api('/peach-batches?status=delivered'),
  ]);

  view.innerHTML = `
    <h1 class="page-title">🍑 Shaftoli kuni</h1>
    <p class="page-sub">Yashik oling, keyin topshiring — sof foyda avtomatik kirimga o'tadi</p>

    <button class="btn btn-primary" id="unoBtn" style="font-size:16px;padding:14px 26px">
      🟥 UNO — Yashik olish
    </button>

    <div class="section-head"><h2>Ochiq partiyalar (topshirilmagan)</h2></div>
    <div class="card">
      ${open.length ? batchTable(open, true) : '<div class="empty">Ochiq partiya yo\'q. "UNO — Yashik olish" tugmasini bosing.</div>'}
    </div>

    <div class="section-head"><h2>Topshirilgan partiyalar</h2></div>
    <div class="card">
      ${delivered.length ? deliveredTable(delivered) : '<div class="empty">Hali topshirilgan partiya yo\'q</div>'}
    </div>
  `;

  document.getElementById('unoBtn').onclick = openTakeCratesModal;
}

function openTakeCratesModal() {
  openModal(`
    <h3>🟥 Yashik olish</h3>
    <form id="takeForm">
      <div class="field">
        <label>Nechta yashik?</label>
        <input type="number" id="crateCount" min="1" step="1" placeholder="Masalan: 50" required autofocus />
        <div class="hint">Yashik bepul — faqat sonini kiriting</div>
      </div>
      <div class="row" style="margin-top:6px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Bekor qilish</button>
        <button type="submit" class="btn btn-primary">Olish</button>
      </div>
    </form>
  `);

  const cc = document.getElementById('crateCount');

  document.getElementById('takeForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/peach-batches', {
        method: 'POST',
        body: { crateCount: cc.value },
      });
      toast('Yashik olindi — partiya ochildi', 'ok');
      closeModal();
      renderShaftoliKuni();
    } catch (err) {
      toast(err.message, 'err');
    }
  };
}

let deliverKgMode = 'total';
function openDeliverModal(batch) {
  deliverKgMode = 'total';
  openModal(`
    <h3>📦 Topshirish — ${batch.crateCount} yashik olingan</h3>
    <form id="deliverForm">
      <div class="field">
        <label>Nechta yashik to'ldi (sotildi)?</label>
        <input type="number" id="deliveredCrates" min="0" max="${batch.crateCount}" step="1" value="${batch.crateCount}" required />
        <div class="hint" id="emptyHint">Bo'sh qolgan: 0 ta</div>
      </div>
      <div class="field">
        <label>Kg kiritish usuli</label>
        <div class="seg">
          <button type="button" id="modeTotal" class="active">Umumiy kg</button>
          <button type="button" id="modePer10">Har 10 yashik uchun kg</button>
        </div>
        <div class="hint" id="modeHint">Jami necha kg ketganini kiriting</div>
      </div>
      <div class="field">
        <label id="kgLabel">Umumiy kg</label>
        <input type="number" id="kgInput" min="0" step="any" placeholder="0" required />
      </div>
      <div class="field">
        <label>1 kg nechpuldan? (${App.currency})</label>
        <input type="number" id="sellPrice" min="0" step="any" placeholder="0" required />
      </div>

      <div class="summary-box" id="calcBox" style="display:none">
        <div class="line"><span>To'lgan yashik:</span> <span id="cFilled">—</span></div>
        <div class="line"><span class="muted">Bo'sh qolgan:</span> <span class="muted" id="cEmpty">—</span></div>
        <div class="line"><span>Brutto vazn:</span> <span id="cGross">—</span></div>
        <div class="line"><span class="muted">Tara (har 10 yashik):</span> <span class="amount-neg" id="cTara">—</span></div>
        <div class="line"><span>Sof vazn:</span> <span id="cNet">—</span></div>
        <div class="line total"><span>Sof foyda (sof kg × narx):</span> <span id="cProfit">—</span></div>
      </div>

      <div class="row" style="margin-top:6px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Bekor qilish</button>
        <button type="submit" class="btn btn-green" id="confirmBtn" disabled>Tasdiqlash → Kirimga</button>
      </div>
    </form>
  `);

  const kgInput = document.getElementById('kgInput');
  const sellPrice = document.getElementById('sellPrice');
  const crates = document.getElementById('deliveredCrates');
  const modeTotal = document.getElementById('modeTotal');
  const modePer10 = document.getElementById('modePer10');

  // To'lgan yashik o'zgarsa - bo'sh qolganini ko'rsatamiz
  crates.oninput = () => {
    const filled = Math.max(0, Math.min(Number(crates.value) || 0, batch.crateCount));
    document.getElementById('emptyHint').textContent = `Bo'sh qolgan: ${batch.crateCount - filled} ta`;
    preview();
  };

  modeTotal.onclick = () => {
    deliverKgMode = 'total';
    modeTotal.classList.add('active');
    modePer10.classList.remove('active');
    document.getElementById('kgLabel').textContent = 'Umumiy kg';
    document.getElementById('modeHint').textContent = 'Jami necha kg ketganini kiriting';
    preview();
  };
  modePer10.onclick = () => {
    deliverKgMode = 'per10';
    modePer10.classList.add('active');
    modeTotal.classList.remove('active');
    document.getElementById('kgLabel').textContent = 'Har 10 yashik uchun kg';
    document.getElementById('modeHint').textContent = 'Har 10 yashikka to\'g\'ri keladigan kg (tizim umumiyga aylantiradi)';
    preview();
  };

  let lastCalc = null;
  async function preview() {
    if (!kgInput.value || !sellPrice.value) {
      document.getElementById('calcBox').style.display = 'none';
      document.getElementById('confirmBtn').disabled = true;
      return;
    }
    try {
      const calc = await api(`/peach-batches/${batch._id}/preview`, {
        method: 'POST',
        body: { deliveredCrates: crates.value, kgMode: deliverKgMode, kgInput: kgInput.value, sellPricePerKg: sellPrice.value },
      });
      lastCalc = calc;
      document.getElementById('calcBox').style.display = 'block';
      document.getElementById('cFilled').textContent = fmt(calc.deliveredCrates) + ' ta';
      document.getElementById('cEmpty').textContent = fmt(calc.emptyCrates) + ' ta';
      document.getElementById('cGross').textContent = fmtKg(calc.grossKg);
      document.getElementById('cTara').textContent = '− ' + fmtKg(calc.taraKg);
      document.getElementById('cNet').textContent = fmtKg(calc.netKg);
      const pEl = document.getElementById('cProfit');
      pEl.textContent = money(calc.netProfit);
      pEl.className = calc.netProfit >= 0 ? 'amount-pos' : 'amount-neg';
      document.getElementById('confirmBtn').disabled = false;
    } catch (err) {
      toast(err.message, 'err');
    }
  }

  kgInput.oninput = preview;
  sellPrice.oninput = preview;

  document.getElementById('deliverForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!lastCalc) return;
    try {
      await api(`/peach-batches/${batch._id}/deliver`, {
        method: 'POST',
        body: { deliveredCrates: crates.value, kgMode: deliverKgMode, kgInput: kgInput.value, sellPricePerKg: sellPrice.value },
      });
      const p = lastCalc.netProfit;
      toast(`Topshirildi! ${p >= 0 ? 'Sof foyda' : 'Zarar'} ${money(Math.abs(p))} kirimga o'tdi`, 'ok');
      closeModal();
      renderShaftoliKuni();
    } catch (err) {
      toast(err.message, 'err');
    }
  };
}

async function deleteBatch(id) {
  if (!confirm('Partiyani o\'chirasizmi? Unga bog\'liq kirim yozuvi ham o\'chadi.')) return;
  try {
    await api('/peach-batches/' + id, { method: 'DELETE' });
    toast('O\'chirildi', 'ok');
    renderShaftoliKuni();
  } catch (e) {
    toast(e.message, 'err');
  }
}

// ============ Statistika (faqat o'qish) ============
async function renderStatistika() {
  const stats = await api('/stats');

  view.innerHTML = `
    <h1 class="page-title">📊 Statistika</h1>
    <p class="page-sub">Faqat ko'rish uchun — umumiy tahlil</p>

    <div class="grid grid-3">
      <div class="card stat-card"><div class="label">Umumiy kirim</div><div class="value green">${money(stats.totalKirim)}</div></div>
      <div class="card stat-card"><div class="label">Umumiy chiqim</div><div class="value red">${money(stats.totalChiqim)}</div></div>
      <div class="card stat-card"><div class="label">Sof balans</div><div class="value ${stats.balance >= 0 ? 'green' : 'red'}">${money(stats.balance)}</div></div>
    </div>

    <div class="card" style="margin-top:18px">
      <div class="section-head" style="margin-top:0">
        <h2 style="font-size:17px;margin:0">Kirim / Chiqim / Foyda</h2>
        <div class="seg" style="width:auto;flex:0 0 auto">
          <button type="button" id="pKun">Kunlik</button>
          <button type="button" id="pHafta">Haftalik</button>
          <button type="button" id="pOy" class="active">Oylik</button>
        </div>
      </div>
      <canvas id="periodChart" height="110"></canvas>
      <div id="periodTotals" class="grid grid-3" style="margin-top:16px"></div>
    </div>

    <div class="grid grid-2" style="margin-top:18px">
      <div class="card">
        <h2 style="margin-top:0;font-size:17px">🍑 Shaftoli narxi trendi (so'm/kg)</h2>
        ${
          stats.priceHistory.length
            ? `<canvas id="priceChart" height="200"></canvas>
               <div class="hint" style="margin-top:8px">Oxirgi narx: <b>${money(stats.priceHistory[stats.priceHistory.length - 1].price)}</b> / kg — grafik shaftolining oxirgi qo'yilgan narxlariga qarab o'zgaradi (yashil = ko'tarildi, qizil = tushdi)</div>`
            : '<div class="empty">Hali topshirilgan partiya yo\'q</div>'
        }
      </div>
      <div class="card">
        <h2 style="margin-top:0;font-size:17px">Chiqim kategoriyalari</h2>
        ${stats.byCategory.length ? '<canvas id="catChart" height="200"></canvas>' : '<div class="empty">Chiqim yozuvlari yo\'q</div>'}
      </div>
    </div>

    <div class="section-head"><h2>Shaftoli partiyalari</h2></div>
    <div class="grid grid-3">
      <div class="card stat-card"><div class="label">Topshirilgan partiya</div><div class="value blue">${stats.peach.deliveredBatches} ta</div></div>
      <div class="card stat-card"><div class="label">To'lgan / Bo'sh yashik</div><div class="value">${fmt(stats.peach.totalDeliveredCrates)} / <span class="muted">${fmt(stats.peach.totalEmptyCrates)}</span></div></div>
      <div class="card stat-card"><div class="label">Shaftolidan sof foyda</div><div class="value green">${money(stats.peach.totalPeachProfit)}</div></div>
    </div>

    <div class="section-head"><h2>Kategoriyalar bo'yicha chiqim</h2></div>
    <div class="card">
      ${
        stats.byCategory.length
          ? `<table class="table"><thead><tr><th>Kategoriya</th><th style="text-align:right">Summa</th></tr></thead><tbody>
             ${stats.byCategory.map((c) => `<tr><td>${esc(c.category)}</td><td style="text-align:right" class="amount-neg">${money(c.amount)}</td></tr>`).join('')}
             </tbody></table>`
          : '<div class="empty">Ma\'lumot yo\'q</div>'
      }
    </div>
  `;

  // Davr grafigi (kunlik / haftalik / oylik) — kirim, chiqim va foyda
  let periodChartObj = null;
  const periodBtns = {
    daily: document.getElementById('pKun'),
    weekly: document.getElementById('pHafta'),
    monthly: document.getElementById('pOy'),
  };
  function drawPeriod(period) {
    Object.entries(periodBtns).forEach(([k, b]) => b.classList.toggle('active', k === period));
    const rows = stats.periods[period] || [];
    const tk = rows.reduce((s, r) => s + r.kirim, 0);
    const tc = rows.reduce((s, r) => s + r.chiqim, 0);
    document.getElementById('periodTotals').innerHTML = `
      <div class="card stat-card"><div class="label">Davr kirimi</div><div class="value green">${money(tk)}</div></div>
      <div class="card stat-card"><div class="label">Davr chiqimi</div><div class="value red">${money(tc)}</div></div>
      <div class="card stat-card"><div class="label">Davr foydasi</div><div class="value ${tk - tc >= 0 ? 'green' : 'red'}">${money(tk - tc)}</div></div>`;
    if (periodChartObj) periodChartObj.destroy();
    periodChartObj = new Chart(document.getElementById('periodChart'), {
      data: {
        labels: rows.map((r) => r.label),
        datasets: [
          { type: 'bar', label: 'Kirim', data: rows.map((r) => r.kirim), backgroundColor: '#34d399' },
          { type: 'bar', label: 'Chiqim', data: rows.map((r) => r.chiqim), backgroundColor: '#f87171' },
          { type: 'line', label: 'Foyda', data: rows.map((r) => r.foyda), borderColor: '#ff8a3d', backgroundColor: '#ff8a3d', tension: 0.3, borderWidth: 2, pointRadius: 3 },
        ],
      },
      options: chartOpts(),
    });
  }
  periodBtns.daily.onclick = () => drawPeriod('daily');
  periodBtns.weekly.onclick = () => drawPeriod('weekly');
  periodBtns.monthly.onclick = () => drawPeriod('monthly');
  drawPeriod('monthly');

  // Shaftoli narx trendi — qizil/yashil (savdo grafigi uslubida)
  if (stats.priceHistory.length) {
    const prices = stats.priceHistory.map((p) => p.price);
    new Chart(document.getElementById('priceChart'), {
      type: 'line',
      data: {
        labels: stats.priceHistory.map((p) => fmtDate(p.date)),
        datasets: [
          {
            label: "Narx (so'm/kg)",
            data: prices,
            borderWidth: 2,
            tension: 0.25,
            fill: false,
            pointRadius: 4,
            pointBackgroundColor: prices.map((v, i) => (i === 0 ? '#9aa3b2' : v >= prices[i - 1] ? '#34d399' : '#f87171')),
            // Har bir bo'lak: narx ko'tarilsa yashil, tushsa qizil
            segment: { borderColor: (ctx) => (ctx.p1.parsed.y >= ctx.p0.parsed.y ? '#34d399' : '#f87171') },
          },
        ],
      },
      options: { ...chartOpts(), plugins: { legend: { display: false } } },
    });
  }

  // Kategoriya grafigi
  if (stats.byCategory.length) {
    new Chart(document.getElementById('catChart'), {
      type: 'doughnut',
      data: {
        labels: stats.byCategory.map((c) => c.category),
        datasets: [{ data: stats.byCategory.map((c) => c.amount), backgroundColor: ['#ff8a3d', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#f472b6', '#22d3ee'] }],
      },
      options: { plugins: { legend: { labels: { color: '#9aa3b2' } } } },
    });
  }
}

function chartOpts() {
  return {
    plugins: { legend: { labels: { color: '#9aa3b2' } } },
    scales: {
      x: { ticks: { color: '#9aa3b2' }, grid: { color: '#2a2f3a' } },
      y: { ticks: { color: '#9aa3b2' }, grid: { color: '#2a2f3a' } },
    },
  };
}

// ============ Sozlamalar ============
async function renderSozlamalar() {
  const [cats, settings] = await Promise.all([api('/categories'), api('/settings')]);

  view.innerHTML = `
    <h1 class="page-title">⚙️ Sozlamalar</h1>
    <p class="page-sub">Kategoriyalar va hisob-kitob parametrlari</p>

    <div class="grid grid-2">
      <div class="card">
        <h2 style="margin-top:0;font-size:17px">Chiqim kategoriyalari</h2>
        <form id="catForm" class="row" style="margin:14px 0">
          <input type="text" id="catName" placeholder="Yangi kategoriya nomi" required />
          <button type="submit" class="btn btn-primary" style="flex:0 0 auto">＋ Qo'shish</button>
        </form>
        <div id="catList" style="display:flex;flex-wrap:wrap;gap:10px">
          ${
            cats.length
              ? cats.map((c) => `<span class="chip">${esc(c.name)} <button onclick="deleteCategory('${c._id}')" title="O'chirish">×</button></span>`).join('')
              : '<div class="empty" style="width:100%">Kategoriya yo\'q. Birinchisini qo\'shing.</div>'
          }
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0;font-size:17px">Hisob-kitob parametrlari</h2>
        <form id="settingsForm" style="margin-top:14px">
          <div class="field">
            <label>Tara — har 10 yashik uchun (kg)</label>
            <input type="number" id="tara" min="0" step="any" value="${settings.taraKgPer10Crates}" />
            <div class="hint">Topshirishda har 10 yashik uchun shu vazn brutto kg'dan ayriladi</div>
          </div>
          <div class="field">
            <label>Valyuta belgisi</label>
            <input type="text" id="currency" value="${esc(settings.currency)}" />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Saqlash</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('catForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/categories', { method: 'POST', body: { name: document.getElementById('catName').value } });
      toast('Kategoriya qo\'shildi', 'ok');
      renderSozlamalar();
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  document.getElementById('settingsForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const s = await api('/settings', {
        method: 'PUT',
        body: {
          taraKgPer10Crates: document.getElementById('tara').value,
          currency: document.getElementById('currency').value,
        },
      });
      App.currency = s.currency;
      toast('Saqlandi', 'ok');
      renderSozlamalar();
    } catch (err) {
      toast(err.message, 'err');
    }
  };
}

async function deleteCategory(id) {
  if (!confirm('Kategoriyani o\'chirasizmi?')) return;
  try {
    await api('/categories/' + id, { method: 'DELETE' });
    toast('O\'chirildi', 'ok');
    renderSozlamalar();
  } catch (e) {
    toast(e.message, 'err');
  }
}

// ============ Umumiy jadval/komponentlar ============
function txnTable(txns, withDelete) {
  return `
    <table class="table">
      <thead><tr>
        <th>Sana</th><th>Tur</th><th>Kategoriya / Izoh</th>
        <th style="text-align:right">Summa</th>${withDelete ? '<th></th>' : ''}
      </tr></thead>
      <tbody>
        ${txns
          .map(
            (t) => `<tr>
          <td class="muted">${fmtDate(t.date)}</td>
          <td><span class="badge ${t.type}">${t.type}</span></td>
          <td>${esc(t.category || '')}${t.category && t.note ? ' · ' : ''}<span class="muted">${esc(t.note || '')}</span></td>
          <td style="text-align:right" class="${t.type === 'kirim' ? 'amount-pos' : 'amount-neg'}">
            ${t.type === 'kirim' ? '+' : '−'} ${money(t.amount)}
          </td>
          ${withDelete ? `<td style="text-align:right"><button class="btn btn-red btn-sm" onclick="deleteTxn('${t._id}')">O'chirish</button></td>` : ''}
        </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}

function batchTable(batches, withActions) {
  return `
    <table class="table">
      <thead><tr>
        <th>Sana</th><th>Yashik</th><th>Holat</th>${withActions ? '<th></th>' : ''}
      </tr></thead>
      <tbody>
        ${batches
          .map(
            (b) => `<tr>
          <td class="muted">${fmtDate(b.createdAt)}</td>
          <td>${fmt(b.crateCount)} ta</td>
          <td><span class="badge ${b.status}">${b.status === 'open' ? 'Ochiq' : 'Topshirilgan'}</span></td>
          ${
            withActions
              ? `<td style="text-align:right;white-space:nowrap">
                  <button class="btn btn-green btn-sm" onclick='openDeliverModal(${JSON.stringify(b).replace(/'/g, '&#39;')})'>📦 Topshirish</button>
                  <button class="btn btn-red btn-sm" onclick="deleteBatch('${b._id}')">×</button>
                </td>`
              : ''
          }
        </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}

function deliveredTable(batches) {
  return `
    <table class="table">
      <thead><tr>
        <th>Sana</th><th>To'ldi / Olingan</th><th>Bo'sh</th><th>Sof vazn</th><th>1 kg narx</th><th style="text-align:right">Sof foyda</th><th></th>
      </tr></thead>
      <tbody>
        ${batches
          .map(
            (b) => `<tr>
          <td class="muted">${fmtDate(b.delivery.deliveredAt || b.updatedAt)}</td>
          <td>${fmt(b.delivery.deliveredCrates)} / ${fmt(b.crateCount)} ta</td>
          <td class="muted">${fmt(b.delivery.emptyCrates)} ta</td>
          <td>${fmtKg(b.delivery.netKg)}</td>
          <td>${money(b.delivery.sellPricePerKg)}</td>
          <td style="text-align:right" class="${b.delivery.netProfit >= 0 ? 'amount-pos' : 'amount-neg'}">${money(b.delivery.netProfit)}</td>
          <td style="text-align:right"><button class="btn btn-red btn-sm" onclick="deleteBatch('${b._id}')">×</button></td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}

// ============ Yordamchilar ============
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
