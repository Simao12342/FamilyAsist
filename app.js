const STORAGE_KEY = 'family_assistant_v1';

const SHIFT_TYPES = [
  { id: 'work', label: 'Робота', short: 'Р' },
  { id: 'off', label: 'Вихідний', short: 'В' },
  { id: 'half', label: 'Чергування', short: 'Ч' },
  { id: 'vacation', label: 'Відпустка', short: 'Від' }
];

const SHOP_CATEGORIES = ['Продукти', 'Дім і побут', 'Дитяче', 'Авто / Інструменти', 'Аптека / Інше'];

let state = {
  users: [
    { id: 'u1', name: 'Сергій', color: '#2563eb' },
    { id: 'u2', name: 'Оля', color: '#db2777' },
    { id: 'u3', name: 'Мама', color: '#16a34a' },
    { id: 'u4', name: 'Тато', color: '#ea580c' }
  ],
  shifts: {},
  events: [],
  shopping: []
};

let ui = {
  currentTab: 'shifts',
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedUserFilter: 'all',
  calendarMode: 'view',
  stampUser: 'u1',
  stampStatus: 'work',
  activeDayModal: null,
  plannerFilter: 'day',
  selectedShopCategory: 'Продукти',
  shopFilterCategory: 'all'
};

function formatDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayKey() {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { state = JSON.parse(saved); } catch (e) { console.error(e); }
  } else {
    seedInitialData();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedInitialData() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  const k1 = formatDateKey(y, m, d);
  const k2 = formatDateKey(y, m, Math.min(28, d + 1));

  state.shifts[k1] = { u1: 'work', u2: 'off', u3: 'off', u4: 'work' };
  state.shifts[k2] = { u1: 'off', u2: 'work', u3: 'work', u4: 'off' };

  state.events = [
    { id: 'e1', date: k1, time: '10:00', title: 'Заїхати на пошту за посилкою', user: 'u1', priority: 'normal', note: 'Відділення №3', done: false },
    { id: 'e2', date: k1, time: '16:30', title: 'Дитячий садок / прогулянка', user: 'u2', priority: 'high', note: '', done: false }
  ];

  state.shopping = [
    { id: 's1', title: 'Молоко та хліб', qty: '2 шт', category: 'Продукти', bought: false },
    { id: 's2', title: 'Вологі серветки', qty: '1 уп', category: 'Дитяче', bought: false },
    { id: 's3', title: 'Омивач скла', qty: '4 л', category: 'Авто / Інструменти', bought: true }
  ];
  saveState();
}

function switchTab(tab) {
  ui.currentTab = tab;
  ['shifts', 'planner', 'shopping'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== tab);
    const btn = document.getElementById(`nav-${t}`);
    if (t === tab) {
      btn.className = 'flex flex-col items-center py-1.5 rounded-xl text-blue-600 font-semibold';
    } else {
      btn.className = 'flex flex-col items-center py-1.5 rounded-xl text-slate-400 font-medium';
    }
  });
  renderAll();
}

function renderUserFilters() {
  const container = document.getElementById('user-filters');
  let html = `<button onclick="setUserFilter('all')" class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${ui.selectedUserFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}">Усі</button>`;
  state.users.forEach(u => {
    const active = ui.selectedUserFilter === u.id;
    html += `<button onclick="setUserFilter('${u.id}')" style="${active ? `background-color:${u.color};color:white` : ''}" class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${active ? '' : 'bg-slate-100 text-slate-700'}">
      <span class="w-2 h-2 rounded-full" style="background-color:${active ? '#fff' : u.color}"></span>${u.name}
    </button>`;
  });
  container.innerHTML = html;
}

function setUserFilter(uid) {
  ui.selectedUserFilter = uid;
  renderUserFilters();
  renderCalendar();
}

function setCalendarMode(mode) {
  ui.calendarMode = mode;
  document.getElementById('mode-view-btn').className = mode === 'view'
    ? 'py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-white text-slate-900 shadow-sm'
    : 'py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 text-slate-600';
  document.getElementById('mode-stamp-btn').className = mode === 'stamp'
    ? 'py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-blue-600 text-white shadow-sm'
    : 'py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 text-slate-600';
  document.getElementById('stamp-controls').classList.toggle('hidden', mode !== 'stamp');
  renderStampControls();
  lucide.createIcons();
}

function renderStampControls() {
  if (ui.calendarMode !== 'stamp') return;
  const uContainer = document.getElementById('stamp-users');
  uContainer.innerHTML = state.users.map(u => {
    const active = ui.stampUser === u.id;
    return `<button onclick="ui.stampUser='${u.id}';renderStampControls()" style="${active ? `background:${u.color};color:#fff` : ''}" class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${active ? '' : 'bg-slate-100 text-slate-700'}">${u.name}</button>`;
  }).join('');

  const sContainer = document.getElementById('stamp-statuses');
  sContainer.innerHTML = SHIFT_TYPES.map(s => {
    const active = ui.stampStatus === s.id;
    return `<button onclick="ui.stampStatus='${s.id}';renderStampControls()" class="py-1.5 px-2 rounded-xl text-[11px] font-semibold border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200'}">${s.label}</button>`;
  }).join('');
}

function changeMonth(delta) {
  ui.currentMonth += delta;
  if (ui.currentMonth > 11) { ui.currentMonth = 0; ui.currentYear++; }
  if (ui.currentMonth < 0) { ui.currentMonth = 11; ui.currentYear--; }
  renderCalendar();
}

function goToToday() {
  const now = new Date();
  ui.currentYear = now.getFullYear();
  ui.currentMonth = now.getMonth();
  renderCalendar();
}

function renderCalendar() {
  const monthNames = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
  document.getElementById('calendar-month-title').textContent = `${monthNames[ui.currentMonth]} ${ui.currentYear}`;

  const firstDay = new Date(ui.currentYear, ui.currentMonth, 1).get
