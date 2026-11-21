/* =========================================================
   Bakery Sales Dashboard – app logic (Vanilla JS)
   הנתונים נשמרים ב-localStorage תחת המפתח bakery-poc-v1
   ========================================================= */
'use strict';

const STORAGE_KEY = 'bakery-poc-v1';
const SCREENS = ['home', 'pos', 'products', 'reports'];
const CATEGORIES = ['לחמים', 'מאפים', 'עוגות', 'שתייה'];
const EMOJIS = ['🍞', '🥖', '🥐', '🥯', '🥨', '🥟', '🫓', '🥪', '🍕', '🧀', '🥧', '🎂',
  '🍰', '🧁', '🍩', '🍪', '🍫', '🥮', '☕', '🍵', '🧃', '🥛', '🍊', '🍓'];

const DEMO_PRODUCTS = [
  { id: 'p1', name: 'חלה', price: 18, category: 'לחמים', emoji: '🍞' },
  { id: 'p2', name: 'באגט', price: 12, category: 'לחמים', emoji: '🥖' },
  { id: 'p3', name: 'פיתה', price: 4, category: 'לחמים', emoji: '🫓' },
  { id: 'p4', name: 'קרואסון', price: 9, category: 'מאפים', emoji: '🥐' },
  { id: 'p5', name: 'בורקס', price: 8, category: 'מאפים', emoji: '🥟' },
  { id: 'p6', name: 'רוגלך', price: 6, category: 'מאפים', emoji: '🥨' },
  { id: 'p7', name: 'עוגת שוקולד', price: 65, category: 'עוגות', emoji: '🎂' },
  { id: 'p8', name: 'מאפין', price: 12, category: 'עוגות', emoji: '🧁' },
  { id: 'p9', name: 'עוגיות', price: 15, category: 'עוגות', emoji: '🍪' },
  { id: 'p10', name: 'קפה', price: 12, category: 'שתייה', emoji: '☕' },
];
// פופולריות יחסית של כל מוצר בנתוני הדמו
const PRODUCT_WEIGHTS = { p1: 8, p2: 6, p3: 7, p4: 9, p5: 8, p6: 6, p7: 1, p8: 4, p9: 3, p10: 10 };
// שעות פעילות ומשקל לכל שעה (שיא בבוקר)
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const HOUR_WEIGHTS = [3, 8, 10, 9, 7, 5, 5, 4, 3, 3, 4, 4, 3, 2];

/* ---------- עזרים ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round2 = (n) => Math.round(n * 100) / 100;
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const moneyFmt = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtMoney = (n) => moneyFmt.format(n);
const timeFmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
const shortDateFmt = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit' });
const longDateFmt = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const pad2 = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ---------- נתונים ---------- */
function makeSale(items, payment, ts = new Date(), suffix) {
  return {
    id: `s_${ts.getTime()}_${suffix ?? Math.random().toString(36).slice(2, 6)}`,
    timestamp: ts.toISOString(),
    items,
    total: round2(items.reduce((sum, it) => sum + it.price * it.qty, 0)),
    payment,
  };
}

function seedDemoData() {
  const products = DEMO_PRODUCTS.map((p) => ({ ...p, active: true }));
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const ids = products.map((p) => p.id);
  const weights = ids.map((id) => PRODUCT_WEIGHTS[id] || 1);
  const now = new Date();
  const today = startOfDay(now);
  const sales = [];

  for (let d = 29; d >= 0; d--) {
    const day = addDays(today, -d);
    const dow = day.getDay(); // 5 = שישי, 6 = שבת
    let n = randInt(20, 60);
    if (dow === 5) n = Math.round(n * 1.4);
    if (dow === 6) n = Math.round(n * 0.6);

    for (let i = 0; i < n; i++) {
      const ts = new Date(day);
      ts.setHours(weightedPick(HOURS, HOUR_WEIGHTS), randInt(0, 59), randInt(0, 59));
      if (ts > now) continue;

      const chosen = new Set();
      const k = randInt(1, 3);
      while (chosen.size < k) chosen.add(weightedPick(ids, weights));
      const items = [...chosen].map((id) => {
        const p = byId[id];
        return { productId: id, name: p.name, price: p.price, category: p.category, qty: p.price >= 50 ? 1 : randInt(1, 3) };
      });
      sales.push(makeSale(items, Math.random() < 0.6 ? 'card' : 'cash', ts, i));
    }
  }
  sales.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return { products, sales };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.products) && Array.isArray(s.sales)) return s;
    }
  } catch (e) { /* נתונים פגומים או אחסון חסום – טוענים דמו */ }
  const seeded = seedDemoData();
  saveState(seeded);
  return seeded;
}

function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch (e) {
    return false;
  }
}

let state = loadState();
let storageWarned = false;

function persist() {
  if (!saveState(state) && !storageWarned) {
    storageWarned = true;
    showToast('⚠ הדפדפן חוסם שמירה – הנתונים יימחקו ברענון', 'danger');
  }
}

const productById = (id) => state.products.find((p) => p.id === id);
const catIndex = (c) => { const i = CATEGORIES.indexOf(c); return i === -1 ? CATEGORIES.length : i; };
const sortedProducts = () => [...state.products].sort((a, b) => catIndex(a.category) - catIndex(b.category));
const itemCategory = (it) => it.category || productById(it.productId)?.category || 'אחר';

function getSalesInRange(from, to) {
  const f = from.getTime();
  const t = to.getTime();
  return state.sales.filter((s) => {
    const x = Date.parse(s.timestamp);
    return x >= f && x < t;
  });
}

function calcKpis(sales) {
  const revenue = round2(sales.reduce((a, s) => a + s.total, 0));
  const count = sales.length;
  return { revenue, count, avg: count ? round2(revenue / count) : 0 };
}

function topProducts(sales, n = 3, sortBy = 'qty') {
  const map = new Map();
  for (const s of sales) {
    for (const it of s.items) {
      const key = it.productId || it.name;
      const e = map.get(key) || { key, name: it.name, qty: 0, revenue: 0 };
      e.qty += it.qty;
      e.revenue += it.price * it.qty;
      e.name = it.name;
      map.set(key, e);
    }
  }
  return [...map.values()]
    .map((e) => ({ ...e, revenue: round2(e.revenue), emoji: productById(e.key)?.emoji || '🧺' }))
    .sort((a, b) => b[sortBy] - a[sortBy] || b.revenue - a.revenue)
    .slice(0, n);
}

/* ---------- הודעות ואישורים ---------- */
let toastTimer;
function showToast(msg, type = 'success') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${type === 'success' ? '' : type}`;
  void t.offsetWidth; // מאתחל את האנימציה
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function askConfirm(message, okLabel = 'אישור', danger = true) {
  return new Promise((resolve) => {
    const d = $('#confirm-dialog');
    $('#confirm-msg').textContent = message;
    const ok = $('#confirm-ok');
    ok.textContent = okLabel;
    ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    d.returnValue = '';
    d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
    d.showModal();
  });
}

/* ---------- ניווט ---------- */
const renderers = {
  home: renderHome,
  pos: renderPOS,
  products: renderProducts,
  reports: renderReports,
};

function navigate(screen) {
  if (!SCREENS.includes(screen)) screen = 'home';
  document.body.dataset.screen = screen;
  for (const s of SCREENS) $(`#screen-${s}`).classList.toggle('active', s === screen);
  for (const a of $$('.nav-btn')) {
    if (a.dataset.screen === screen) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  renderers[screen]();
  window.scrollTo(0, 0);
}

/* =========================================================
   🏠 בית
   ========================================================= */
function setDelta(el, cur, prev) {
  if (!prev) {
    el.textContent = '';
    el.className = 'delta';
    return;
  }
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct >= 0;
  el.textContent = `${up ? '↑' : '↓'} ${Math.abs(pct)}% מאתמול`;
  el.className = `delta ${up ? 'up' : 'down'}`;
}

function saleTime(s) {
  const d = new Date(s.timestamp);
  return dayKey(d) === dayKey(new Date()) ? timeFmt.format(d) : `${shortDateFmt.format(d)} · ${timeFmt.format(d)}`;
}
const saleLabel = (s) => s.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(', ');

function renderHome() {
  const now = new Date();
  const today = startOfDay(now);
  const todaySales = getSalesInRange(today, addDays(today, 1));
  const ySales = getSalesInRange(addDays(today, -1), new Date(now.getTime() - 86400000));
  const k = calcKpis(todaySales);
  const ky = calcKpis(ySales);

  $('#kpi-revenue').textContent = fmtMoney(k.revenue);
  $('#kpi-count').textContent = k.count;
  $('#kpi-avg').textContent = fmtMoney(Math.round(k.avg));
  setDelta($('#delta-revenue'), k.revenue, ky.revenue);
  setDelta($('#delta-count'), k.count, ky.count);
  setDelta($('#delta-avg'), k.avg, ky.avg);

  const top = topProducts(todaySales, 3, 'qty');
  $('#top-products').innerHTML = top.length
    ? top.map((p, i) => `
      <div class="list-row">
        <span class="rank">${i + 1}</span>
        <span class="row-emoji" aria-hidden="true">${esc(p.emoji)}</span>
        <span class="row-main"><span class="row-title">${esc(p.name)}</span><div class="row-sub">${fmtMoney(p.revenue)}</div></span>
        <span class="row-end">${p.qty} יח׳</span>
      </div>`).join('')
    : '<p class="empty">עוד אין מכירות היום</p>';

  const recent = state.sales.slice(-5).reverse();
  $('#recent-sales').innerHTML = recent.length
    ? recent.map((s) => `
      <button type="button" class="list-row" data-sale="${esc(s.id)}" aria-label="ביטול מכירה מ-${esc(saleTime(s))} על סך ${esc(fmtMoney(s.total))}">
        <span class="row-emoji" aria-hidden="true">${s.payment === 'card' ? '💳' : '💵'}</span>
        <span class="row-main"><span class="row-title">${esc(saleTime(s))}</span><div class="row-sub">${esc(saleLabel(s))}</div></span>
        <span class="row-end">${fmtMoney(s.total)}</span>
      </button>`).join('')
    : '<p class="empty">אין מכירות עדיין</p>';
}

async function cancelSale(id) {
  const s = state.sales.find((x) => x.id === id);
  if (!s) return;
  const ok = await askConfirm(`לבטל את המכירה מ-${saleTime(s)} על סך ${fmtMoney(s.total)}?`, '🗑 ביטול המכירה');
  if (!ok) return;
  state.sales = state.sales.filter((x) => x.id !== id);
  persist();
  renderHome();
  showToast('המכירה בוטלה', 'info');
}

/* =========================================================
   ➕ מכירה
   ========================================================= */
let cart = [];          // [{ productId, qty }]
let payment = 'cash';
let cartOpen = false;

const cartCount = () => cart.reduce((a, c) => a + c.qty, 0);
const cartTotal = () => round2(cart.reduce((a, c) => a + (productById(c.productId)?.price || 0) * c.qty, 0));

function renderPOS() {
  const prods = sortedProducts().filter((p) => p.active);
  $('#pos-grid').innerHTML = prods.length
    ? prods.map((p) => `
      <button type="button" class="tile" data-id="${esc(p.id)}">
        <span class="badge" hidden></span>
        <span class="emoji" aria-hidden="true">${esc(p.emoji)}</span>
        <span class="name">${esc(p.name)}</span>
        <span class="price">${fmtMoney(p.price)}</span>
      </button>`).join('')
    : '<p class="empty">אין מוצרים פעילים. הוסיפו מוצרים במסך "מוצרים".</p>';

  // מוצרים שנמחקו או הושבתו יוצאים מהעגלה
  cart = cart.filter((c) => productById(c.productId)?.active);
  updateCartUI();
}

function updateCartUI() {
  for (const tile of $$('#pos-grid .tile')) {
    const p = productById(tile.dataset.id);
    const c = cart.find((x) => x.productId === tile.dataset.id);
    const badge = $('.badge', tile);
    tile.classList.toggle('in-cart', !!c);
    badge.hidden = !c;
    if (c) badge.textContent = c.qty;
    tile.setAttribute('aria-label', `${p.name}, ${fmtMoney(p.price)}${c ? `, בעגלה: ${c.qty}` : ''}`);
  }

  const count = cartCount();
  if (!count) cartOpen = false;
  $('#cart').hidden = !count;
  document.body.classList.toggle('has-cart', !!count);
  $('#cart-count').textContent = `🛒 ${count} ${count === 1 ? 'פריט' : 'פריטים'}`;
  $('#cart-total').textContent = fmtMoney(cartTotal());
  $('#cart-toggle').setAttribute('aria-expanded', String(cartOpen));

  const list = $('#cart-items');
  list.hidden = !cartOpen;
  list.innerHTML = cart.map((c) => {
    const p = productById(c.productId);
    return `
      <div class="cart-item">
        <span class="ci-emoji" aria-hidden="true">${esc(p.emoji)}</span>
        <span class="ci-name">${esc(p.name)}<small>${fmtMoney(round2(p.price * c.qty))}</small></span>
        <div class="qty">
          <button type="button" class="qty-btn" data-id="${esc(p.id)}" data-delta="1" aria-label="הוספת ${esc(p.name)}">+</button>
          <span class="qty-n">${c.qty}</span>
          <button type="button" class="qty-btn" data-id="${esc(p.id)}" data-delta="-1" aria-label="הפחתת ${esc(p.name)}">−</button>
        </div>
      </div>`;
  }).join('') + '<button type="button" class="btn btn-secondary btn-block clear-cart" id="clear-cart">🗑 ניקוי העגלה</button>';

  for (const b of $$('.pay-btn')) b.setAttribute('aria-pressed', String(b.dataset.pay === payment));
}

function addToCart(productId) {
  const c = cart.find((x) => x.productId === productId);
  if (c) c.qty += 1;
  else cart.push({ productId, qty: 1 });
  updateCartUI();
}

function changeQty(productId, delta) {
  const c = cart.find((x) => x.productId === productId);
  if (!c) return;
  c.qty += delta;
  if (c.qty <= 0) cart = cart.filter((x) => x !== c);
  updateCartUI();
}

function checkout() {
  if (!cart.length) return;
  const items = cart.map((c) => {
    const p = productById(c.productId);
    return { productId: p.id, name: p.name, price: p.price, category: p.category, qty: c.qty };
  });
  const sale = makeSale(items, payment);
  state.sales.push(sale);
  persist();
  cart = [];
  payment = 'cash';
  cartOpen = false;
  updateCartUI();
  showToast(`✓ המכירה נשמרה · ${fmtMoney(sale.total)}`);
  try { navigator.vibrate?.(80); } catch (e) { /* לא נתמך */ }
}

/* =========================================================
   🥐 מוצרים
   ========================================================= */
let editingId = null;
let selectedEmoji = EMOJIS[0];

function renderProducts() {
  const list = sortedProducts();
  $('#product-list').innerHTML = list.length
    ? list.map((p) => `
      <div class="product-row ${p.active ? '' : 'inactive'}">
        <button type="button" class="product-main" data-edit="${esc(p.id)}" aria-label="עריכת ${esc(p.name)}">
          <span class="pr-emoji" aria-hidden="true">${esc(p.emoji)}</span>
          <span class="pr-text"><span class="pr-name">${esc(p.name)}</span><span class="pr-cat">${esc(p.category)}</span></span>
          <span class="pr-price">${fmtMoney(p.price)}</span>
        </button>
        <label class="switch-wrap">
          <span class="switch">
            <input type="checkbox" data-toggle="${esc(p.id)}" ${p.active ? 'checked' : ''} aria-label="${esc(p.name)} פעיל במכירה">
            <span class="track"></span>
          </span>
          <span>${p.active ? 'פעיל' : 'מושבת'}</span>
        </label>
      </div>`).join('')
    : '<p class="empty">אין מוצרים עדיין. לחצו "הוסף מוצר".</p>';
}

function renderEmojiGrid() {
  const options = EMOJIS.includes(selectedEmoji) ? EMOJIS : [selectedEmoji, ...EMOJIS];
  $('#f-emoji').innerHTML = options.map((e) =>
    `<button type="button" class="emoji-opt" data-emoji="${esc(e)}" aria-pressed="${e === selectedEmoji}" aria-label="אייקון ${esc(e)}">${esc(e)}</button>`
  ).join('');
}

function showFormError(msg) {
  const el = $('#f-error');
  el.textContent = msg;
  el.hidden = false;
}

function openProductForm(id = null) {
  editingId = id;
  const p = id ? productById(id) : null;
  $('#product-dialog-title').textContent = p ? 'עריכת מוצר' : 'מוצר חדש';
  $('#f-name').value = p ? p.name : '';
  $('#f-price').value = p ? p.price : '';
  $('#f-category').value = p ? p.category : CATEGORIES[0];
  selectedEmoji = p ? p.emoji : EMOJIS[0];
  renderEmojiGrid();
  $('#f-error').hidden = true;
  $('#product-delete').hidden = !p;
  $('#product-dialog').showModal();
  if (!p) $('#f-name').focus();
}

function saveProduct(e) {
  e.preventDefault();
  const name = $('#f-name').value.trim();
  const rawPrice = $('#f-price').value;
  const price = Number(rawPrice);
  const category = $('#f-category').value;
  if (!name) return showFormError('נא להזין שם מוצר');
  if (rawPrice === '' || !Number.isFinite(price) || price < 0) return showFormError('נא להזין מחיר תקין (0 ומעלה)');

  if (editingId) {
    Object.assign(productById(editingId), { name, price: round2(price), category, emoji: selectedEmoji });
  } else {
    state.products.push({ id: `p_${Date.now().toString(36)}`, name, price: round2(price), category, emoji: selectedEmoji, active: true });
  }
  persist();
  $('#product-dialog').close();
  renderProducts();
  showToast('✓ המוצר נשמר');
}

async function deleteProduct() {
  const p = productById(editingId);
  if (!p) return;
  const ok = await askConfirm(`למחוק את "${p.name}"? מכירות קודמות יישארו בדוחות.`, '🗑 מחיקה');
  if (!ok) return;
  state.products = state.products.filter((x) => x.id !== p.id);
  cart = cart.filter((c) => c.productId !== p.id);
  persist();
  $('#product-dialog').close();
  renderProducts();
  showToast('המוצר נמחק', 'info');
}

function toggleProduct(id, active) {
  const p = productById(id);
  if (!p) return;
  p.active = active;
  persist();
  renderProducts();
}

/* =========================================================
   📊 דוחות
   ========================================================= */
let range = 'today';
const charts = {};

function rangeBounds() {
  const today = startOfDay(new Date());
  const days = range === 'today' ? 1 : Number(range);
  return { from: addDays(today, -(days - 1)), to: addDays(today, 1), days };
}

function revenueSeries(sales, from, days) {
  const labels = [];
  const data = [];
  if (days === 1) {
    const hours = sales.map((s) => new Date(s.timestamp).getHours());
    const first = Math.min(6, ...hours);
    const last = Math.max(19, ...hours);
    for (let h = first; h <= last; h++) { labels.push(`${pad2(h)}:00`); data.push(0); }
    for (const s of sales) data[new Date(s.timestamp).getHours() - first] += s.total;
  } else {
    const index = new Map();
    for (let i = 0; i < days; i++) {
      const d = addDays(from, i);
      index.set(dayKey(d), i);
      labels.push(shortDateFmt.format(d));
      data.push(0);
    }
    for (const s of sales) {
      const i = index.get(dayKey(new Date(s.timestamp)));
      if (i !== undefined) data[i] += s.total;
    }
  }
  return { labels, data: data.map(round2) };
}

function categorySeries(sales) {
  const map = new Map();
  for (const s of sales) {
    for (const it of s.items) {
      const c = itemCategory(it);
      map.set(c, (map.get(c) || 0) + it.price * it.qty);
    }
  }
  const labels = [...map.keys()].sort((a, b) => catIndex(a) - catIndex(b));
  return { labels, data: labels.map((l) => round2(map.get(l))) };
}

function drawCharts(bar, cat) {
  const ok = typeof window.Chart !== 'undefined';
  for (const el of $$('#screen-reports .chart-fallback')) el.hidden = ok;
  $$('#screen-reports .chart-box')[0].hidden = !ok;
  const catEmpty = !cat.data.length;
  $$('#screen-reports .chart-box')[1].hidden = !ok || catEmpty;
  $('#category-empty').hidden = !ok || !catEmpty;
  if (!ok) return;

  const C = {
    primary: cssVar('--color-primary'), wheat: cssVar('--color-wheat'), crust: cssVar('--color-crust'),
    olive: cssVar('--color-olive'), brown: cssVar('--color-brown'), line: cssVar('--color-line'),
  };
  Chart.defaults.font.family = "'Rubik', system-ui, sans-serif";
  Chart.defaults.font.size = 14;
  Chart.defaults.color = C.brown;

  charts.bar?.destroy();
  charts.bar = new Chart($('#chart-revenue'), {
    type: 'bar',
    data: { labels: bar.labels, datasets: [{ label: 'הכנסות', data: bar.data, backgroundColor: C.primary, hoverBackgroundColor: C.crust, borderRadius: 6, maxBarThickness: 36 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { rtl: true, callbacks: { label: (ctx) => fmtMoney(ctx.parsed.y) } },
      },
      scales: {
        x: { reverse: true, grid: { display: false } },
        y: { beginAtZero: true, position: 'right', ticks: { callback: (v) => fmtMoney(v) }, grid: { color: C.line } },
      },
    },
  });

  charts.cat?.destroy();
  charts.cat = null;
  if (catEmpty) return;
  charts.cat = new Chart($('#chart-category'), {
    type: 'doughnut',
    data: { labels: cat.labels, datasets: [{ data: cat.data, backgroundColor: [C.primary, C.wheat, C.crust, C.olive, C.brown], borderColor: '#fff', borderWidth: 3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { position: 'bottom', rtl: true, labels: { boxWidth: 18, padding: 16, font: { size: 16 } } },
        tooltip: { rtl: true, callbacks: { label: (ctx) => `${ctx.label}: ${fmtMoney(ctx.parsed)}` } },
      },
    },
  });
}

function renderReports() {
  for (const b of $$('.seg-btn')) b.setAttribute('aria-pressed', String(b.dataset.range === range));
  const { from, to, days } = rangeBounds();
  const sales = getSalesInRange(from, to);
  const k = calcKpis(sales);
  $('#r-revenue').textContent = fmtMoney(k.revenue);
  $('#r-count').textContent = k.count;
  $('#r-avg').textContent = fmtMoney(Math.round(k.avg));
  $('#bar-title').textContent = days === 1 ? '📈 הכנסות לפי שעה' : '📈 הכנסות לפי יום';

  drawCharts(revenueSeries(sales, from, days), categorySeries(sales));

  const rows = topProducts(sales, Infinity, 'revenue');
  $('#report-rows').innerHTML = rows.length
    ? rows.map((r) => `<tr><td><span class="td-emoji" aria-hidden="true">${esc(r.emoji)}</span>${esc(r.name)}</td><td class="num">${r.qty}</td><td class="num">${fmtMoney(r.revenue)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="empty">אין מכירות בטווח הזה</td></tr>';
  const totalQty = rows.reduce((a, r) => a + r.qty, 0);
  $('#report-foot').innerHTML = rows.length
    ? `<tr><td>סה״כ</td><td class="num">${totalQty}</td><td class="num">${fmtMoney(k.revenue)}</td></tr>`
    : '';
}

function csvCell(v) {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // מניעת הזרקת נוסחאות לאקסל
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv() {
  const { from, to } = rangeBounds();
  const sales = getSalesInRange(from, to);
  if (!sales.length) return showToast('אין מכירות בטווח הזה', 'info');

  const rows = [['תאריך', 'שעה', 'מזהה מכירה', 'מוצר', 'קטגוריה', 'כמות', 'מחיר יחידה', 'סה"כ שורה', 'אמצעי תשלום']];
  for (const s of sales) {
    const d = new Date(s.timestamp);
    for (const it of s.items) {
      rows.push([dayKey(d), timeFmt.format(d), s.id, it.name, itemCategory(it), it.qty, it.price, round2(it.price * it.qty), s.payment === 'card' ? 'אשראי' : 'מזומן']);
    }
  }
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bakery-sales-${range === 'today' ? 'today' : `${range}d`}-${dayKey(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('⬇ הקובץ הורד');
}

async function resetDemo() {
  const ok = await askConfirm('למחוק את כל הנתונים ולטעון מחדש את נתוני הדמו? אי אפשר לבטל את הפעולה.', '🔄 איפוס');
  if (!ok) return;
  state = seedDemoData();
  cart = [];
  persist();
  renderReports();
  showToast('נתוני הדמו נטענו מחדש', 'info');
}

/* =========================================================
   אתחול
   ========================================================= */
function init() {
  $('#today-date').textContent = longDateFmt.format(new Date());
  $('#f-category').innerHTML = CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  // ניווט לפי ה-hash בכתובת (כפתור "חזרה" עובד)
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));

  // בית
  $('#recent-sales').addEventListener('click', (e) => {
    const row = e.target.closest('[data-sale]');
    if (row) cancelSale(row.dataset.sale);
  });

  // מכירה
  $('#pos-grid').addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (tile) addToCart(tile.dataset.id);
  });
  $('#cart-toggle').addEventListener('click', () => { cartOpen = !cartOpen; updateCartUI(); });
  $('#cart-items').addEventListener('click', (e) => {
    const q = e.target.closest('.qty-btn');
    if (q) return changeQty(q.dataset.id, Number(q.dataset.delta));
    if (e.target.closest('#clear-cart')) { cart = []; updateCartUI(); }
  });
  for (const b of $$('.pay-btn')) b.addEventListener('click', () => { payment = b.dataset.pay; updateCartUI(); });
  $('#checkout-btn').addEventListener('click', checkout);

  // מוצרים
  $('#add-product-btn').addEventListener('click', () => openProductForm());
  $('#product-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-edit]');
    if (btn) openProductForm(btn.dataset.edit);
  });
  $('#product-list').addEventListener('change', (e) => {
    if (e.target.matches('[data-toggle]')) toggleProduct(e.target.dataset.toggle, e.target.checked);
  });
  $('#f-emoji').addEventListener('click', (e) => {
    const b = e.target.closest('[data-emoji]');
    if (!b) return;
    selectedEmoji = b.dataset.emoji;
    for (const x of $$('.emoji-opt')) x.setAttribute('aria-pressed', String(x === b));
  });
  $('#product-form').addEventListener('submit', saveProduct);
  $('#product-close').addEventListener('click', () => $('#product-dialog').close());
  $('#product-cancel').addEventListener('click', () => $('#product-dialog').close());
  $('#product-delete').addEventListener('click', deleteProduct);

  // דוחות
  for (const b of $$('.seg-btn')) b.addEventListener('click', () => { range = b.dataset.range; renderReports(); });
  $('#export-btn').addEventListener('click', exportCsv);
  $('#reset-btn').addEventListener('click', resetDemo);

  navigate(location.hash.slice(1));

  // מסך פתיחה
  const splash = $('#splash');
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500);
  }, 900);
}

init();
