/* =========================================================
   ExoCoins — demo de apuestas simuladas
   TODO ES FICTICIO: sin dinero real, sin pagos, sin backend.
   Los datos se guardan en localStorage del navegador.
   ========================================================= */

const STORAGE_KEYS = {
  users: 'exo_users',
  session: 'exo_session',
  events: 'exo_events',
  bets: 'exo_bets',
};

const WELCOME_BONUS = 5000;

/* ---------- helpers de storage ---------- */
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- seed inicial ---------- */
function seedIfEmpty() {
  let users = load(STORAGE_KEYS.users, null);
  if (!users) {
    users = {
      admin: {
        username: 'admin',
        password: 'admin123',
        balance: 0,
        isAdmin: true,
        claimedBonus: true,
        tx: [],
      },
    };
    save(STORAGE_KEYS.users, users);
  }

  let events = load(STORAGE_KEYS.events, null);
  if (!events) {
    const now = Date.now();
    events = [
      {
        id: uid(),
        home: 'Estrella del Sur',
        away: 'Halcones FC',
        kickoff: new Date(now + 3 * 3600 * 1000).toISOString(),
        oddsHome: 2.10,
        oddsDraw: 3.20,
        oddsAway: 3.40,
        status: 'open',
        result: null,
      },
      {
        id: uid(),
        home: 'Norte Unido',
        away: 'Puerto Rival',
        kickoff: new Date(now + 26 * 3600 * 1000).toISOString(),
        oddsHome: 1.85,
        oddsDraw: 3.40,
        oddsAway: 4.10,
        status: 'open',
        result: null,
      },
      {
        id: uid(),
        home: 'Atlético Meridiano',
        away: 'Real Cometa',
        kickoff: new Date(now + 50 * 3600 * 1000).toISOString(),
        oddsHome: 2.60,
        oddsDraw: 3.05,
        oddsAway: 2.75,
        status: 'open',
        result: null,
      },
    ];
    save(STORAGE_KEYS.events, events);
  }

  if (!load(STORAGE_KEYS.bets, null)) {
    save(STORAGE_KEYS.bets, []);
  }
}
seedIfEmpty();

/* ---------- estado en memoria ---------- */
let currentUser = null; // username string
let betslip = []; // [{eventId, selection, odds, home, away}]

/* ---------- DOM refs ---------- */
const authScreen = document.getElementById('authScreen');
const appEl = document.getElementById('app');
const topbarRight = document.getElementById('topbarRight');
const bonusOverlay = document.getElementById('bonusOverlay');

/* ============ AUTH TABS ============ */
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('loginForm').classList.toggle('hidden', target !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', target !== 'register');
  });
});

/* ============ LOGIN ============ */
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const users = load(STORAGE_KEYS.users, {});
  const errEl = document.getElementById('loginError');

  const user = users[username];
  if (!user || user.password !== password) {
    errEl.textContent = 'Usuario o contraseña incorrectos.';
    return;
  }
  errEl.textContent = '';
  logIn(username);
});

/* ============ REGISTER ============ */
document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('regUser').value.trim();
  const password = document.getElementById('regPass').value;
  const errEl = document.getElementById('registerError');
  const users = load(STORAGE_KEYS.users, {});

  if (users[username]) {
    errEl.textContent = 'Ese usuario ya existe.';
    return;
  }
  if (username.length < 3 || password.length < 4) {
    errEl.textContent = 'Usuario mín. 3 caracteres, contraseña mín. 4.';
    return;
  }
  errEl.textContent = '';

  users[username] = {
    username,
    password,
    balance: WELCOME_BONUS,
    isAdmin: false,
    claimedBonus: false,
    tx: [{ id: uid(), desc: 'Bono de bienvenida', amount: WELCOME_BONUS, date: new Date().toISOString() }],
  };
  save(STORAGE_KEYS.users, users);

  showBonusOverlay(username);
});

function showBonusOverlay(username) {
  bonusOverlay.classList.remove('hidden');
  const burst = document.getElementById('coinBurst');
  burst.innerHTML = '';
  for (let i = 0; i < 18; i++) {
    const span = document.createElement('span');
    span.textContent = '◎';
    span.style.setProperty('--rot', `${Math.random() * 360}deg`);
    span.style.left = `${40 + Math.random() * 20}%`;
    span.style.animationDelay = `${Math.random() * 0.3}s`;
    burst.appendChild(span);
  }
  document.getElementById('bonusContinue').onclick = () => {
    bonusOverlay.classList.add('hidden');
    const users = load(STORAGE_KEYS.users, {});
    users[username].claimedBonus = true;
    save(STORAGE_KEYS.users, users);
    logIn(username);
  };
}

/* ============ SESSION ============ */
function logIn(username) {
  currentUser = username;
  save(STORAGE_KEYS.session, username);
  renderAll();
}
function logOut() {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.session);
  betslip = [];
  renderAll();
}
function getUser() {
  const users = load(STORAGE_KEYS.users, {});
  return users[currentUser];
}
function updateUser(mutator) {
  const users = load(STORAGE_KEYS.users, {});
  mutator(users[currentUser]);
  save(STORAGE_KEYS.users, users);
}

/* ============ RENDER: TOPBAR ============ */
function renderTopbar() {
  if (!currentUser) {
    topbarRight.innerHTML = '';
    return;
  }
  const user = getUser();
  topbarRight.innerHTML = `
    <div class="wallet-pill"><span class="coin-dot">◎</span> ${user.balance.toLocaleString('es')} EXO</div>
    <span class="user-pill">${user.username}${user.isAdmin ? ' · admin' : ''}</span>
    <button class="btn-logout" id="logoutBtn">Salir</button>
  `;
  document.getElementById('logoutBtn').onclick = logOut;
}

/* ============ RENDER: TICKER ============ */
function renderTicker() {
  const events = load(STORAGE_KEYS.events, []);
  const track = document.getElementById('tickerTrack');
  const items = events.map(ev => `
    <span><span class="ticker-live">● SIM</span> ${ev.home} vs ${ev.away} — 1: ${ev.oddsHome.toFixed(2)} · X: ${ev.oddsDraw.toFixed(2)} · 2: ${ev.oddsAway.toFixed(2)}</span>
  `).join('');
  track.innerHTML = items + items; // duplicado para loop continuo
}

/* ============ NAV ============ */
document.querySelectorAll('.side-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.side-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');
    if (view === 'mybets') renderMyBets();
    if (view === 'wallet') renderWallet();
    if (view === 'admin') renderAdmin();
  });
});

/* ============ RENDER: FOOTBALL EVENTS ============ */
function renderEvents() {
  const events = load(STORAGE_KEYS.events, []);
  const grid = document.getElementById('eventsGrid');
  const empty = document.getElementById('eventsEmpty');
  const openEvents = events.filter(ev => ev.status === 'open');

  if (openEvents.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = openEvents.map(ev => {
    const dt = new Date(ev.kickoff);
    const dateStr = dt.toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `
    <div class="event-card">
      <div class="event-top">
        <span class="event-league">Liga simulada</span>
        <span class="event-time">${dateStr}</span>
      </div>
      <div class="event-teams">
        <span class="team">${ev.home}</span>
        <span class="event-vs">VS</span>
        <span class="team">${ev.away}</span>
      </div>
      <div class="odds-buttons">
        <button class="odds-btn" data-event="${ev.id}" data-sel="home" data-odds="${ev.oddsHome}">
          <span class="odds-btn-label">1</span><span class="odds-btn-value">${ev.oddsHome.toFixed(2)}</span>
        </button>
        <button class="odds-btn" data-event="${ev.id}" data-sel="draw" data-odds="${ev.oddsDraw}">
          <span class="odds-btn-label">X</span><span class="odds-btn-value">${ev.oddsDraw.toFixed(2)}</span>
        </button>
        <button class="odds-btn" data-event="${ev.id}" data-sel="away" data-odds="${ev.oddsAway}">
          <span class="odds-btn-label">2</span><span class="odds-btn-value">${ev.oddsAway.toFixed(2)}</span>
        </button>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.odds-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleBetslipItem(btn, openEvents));
  });
  syncOddsButtonStates();
}

function syncOddsButtonStates() {
  document.querySelectorAll('.odds-btn').forEach(btn => {
    const inSlip = betslip.some(i => i.eventId === btn.dataset.event && i.selection === btn.dataset.sel);
    btn.classList.toggle('selected', inSlip);
  });
}

/* ============ BETSLIP ============ */
function toggleBetslipItem(btn, events) {
  const eventId = btn.dataset.event;
  const selection = btn.dataset.sel;
  const odds = parseFloat(btn.dataset.odds);
  const ev = events.find(e => e.id === eventId);

  // remove any existing pick for this event (solo una selección por evento)
  betslip = betslip.filter(i => i.eventId !== eventId);

  const wasSelected = btn.classList.contains('selected');
  if (!wasSelected) {
    betslip.push({
      eventId, selection, odds,
      home: ev.home, away: ev.away,
    });
  }
  renderBetslip();
  syncOddsButtonStates();
}

function selectionLabel(sel, home, away) {
  if (sel === 'home') return `Gana ${home}`;
  if (sel === 'away') return `Gana ${away}`;
  return 'Empate';
}

function renderBetslip() {
  const items = document.getElementById('betslipItems');
  const empty = document.getElementById('betslipEmpty');
  const footer = document.getElementById('betslipFooter');
  const countEl = document.getElementById('betslipCount');

  countEl.textContent = betslip.length;

  if (betslip.length === 0) {
    items.innerHTML = '';
    empty.classList.remove('hidden');
    footer.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  footer.classList.remove('hidden');

  items.innerHTML = betslip.map((it, idx) => `
    <div class="betslip-item">
      <button class="remove-item" data-idx="${idx}">✕</button>
      <span class="odds-tag">${it.odds.toFixed(2)}</span>
      <h4>${it.home} vs ${it.away}</h4>
      <span class="pick">${selectionLabel(it.selection, it.home, it.away)}</span>
    </div>
  `).join('');

  items.querySelectorAll('.remove-item').forEach(b => {
    b.addEventListener('click', () => {
      betslip.splice(parseInt(b.dataset.idx), 1);
      renderBetslip();
      syncOddsButtonStates();
    });
  });

  updatePotentialWin();
}

function combinedOdds() {
  return betslip.reduce((acc, it) => acc * it.odds, 1);
}
function updatePotentialWin() {
  const stake = parseFloat(document.getElementById('stakeInput').value) || 0;
  const potential = stake * combinedOdds();
  document.getElementById('potentialWin').textContent = potential.toLocaleString('es', { maximumFractionDigits: 0 });
}
document.getElementById('stakeInput').addEventListener('input', updatePotentialWin);

document.getElementById('placeBetBtn').addEventListener('click', () => {
  const errEl = document.getElementById('betError');
  const stake = parseFloat(document.getElementById('stakeInput').value);
  const user = getUser();

  if (!stake || stake <= 0) { errEl.textContent = 'Ingresá un monto válido.'; return; }
  if (stake > user.balance) { errEl.textContent = 'Saldo insuficiente.'; return; }
  if (betslip.length === 0) { errEl.textContent = 'Agregá al menos una selección.'; return; }

  errEl.textContent = '';
  const potentialWin = stake * combinedOdds();

  const bets = load(STORAGE_KEYS.bets, []);
  const betId = uid();
  bets.push({
    id: betId,
    username: currentUser,
    selections: betslip.map(i => ({ ...i })),
    stake,
    combinedOdds: combinedOdds(),
    potentialWin,
    status: 'pending',
    placedAt: new Date().toISOString(),
  });
  save(STORAGE_KEYS.bets, bets);

  updateUser(u => {
    u.balance -= stake;
    u.tx.unshift({ id: uid(), desc: `Apuesta (${betslip.length} selección/es)`, amount: -stake, date: new Date().toISOString() });
  });

  betslip = [];
  renderBetslip();
  renderEvents();
  renderTopbar();
});

/* ============ MY BETS ============ */
function renderMyBets() {
  const bets = load(STORAGE_KEYS.bets, []).filter(b => b.username === currentUser).reverse();
  const list = document.getElementById('betsList');
  const empty = document.getElementById('betsEmpty');

  if (bets.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = bets.map(b => {
    const picks = b.selections.map(s => `${selectionLabel(s.selection, s.home, s.away)} (${s.home} vs ${s.away})`).join(' + ');
    return `
    <div class="bet-row">
      <div class="bet-info">
        <h4>${picks}</h4>
        <span>Cuota combinada ${b.combinedOdds.toFixed(2)} · ${new Date(b.placedAt).toLocaleString('es')}</span>
      </div>
      <div class="bet-amounts">
        <span class="stake">Apostado: ${b.stake.toLocaleString('es')} EXO</span>
        <span class="win">${b.status === 'won' ? '+' + Math.round(b.potentialWin).toLocaleString('es') : Math.round(b.potentialWin).toLocaleString('es')} EXO</span>
      </div>
      <span class="bet-status ${b.status}">${b.status === 'pending' ? 'Pendiente' : b.status === 'won' ? 'Ganada' : 'Perdida'}</span>
    </div>`;
  }).join('');
}

/* ============ WALLET ============ */
function renderWallet() {
  const user = getUser();
  document.getElementById('walletBalance').textContent = user.balance.toLocaleString('es');
  const txList = document.getElementById('txList');
  txList.innerHTML = (user.tx || []).map(t => `
    <div class="tx-row">
      <span class="tx-desc">${t.desc} · ${new Date(t.date).toLocaleString('es')}</span>
      <span class="tx-amount ${t.amount >= 0 ? 'positive' : 'negative'}">${t.amount >= 0 ? '+' : ''}${t.amount.toLocaleString('es')} EXO</span>
    </div>
  `).join('') || '<p class="empty-sub">Sin movimientos todavía.</p>';
}

/* ============ ADMIN ============ */
document.getElementById('createEventForm').addEventListener('submit', e => {
  e.preventDefault();
  const events = load(STORAGE_KEYS.events, []);
  events.push({
    id: uid(),
    home: document.getElementById('evHome').value.trim(),
    away: document.getElementById('evAway').value.trim(),
    kickoff: new Date(document.getElementById('evDate').value).toISOString(),
    oddsHome: parseFloat(document.getElementById('evOddsHome').value),
    oddsDraw: parseFloat(document.getElementById('evOddsDraw').value),
    oddsAway: parseFloat(document.getElementById('evOddsAway').value),
    status: 'open',
    result: null,
  });
  save(STORAGE_KEYS.events, events);
  e.target.reset();
  document.getElementById('evOddsHome').value = '2.10';
  document.getElementById('evOddsDraw').value = '3.20';
  document.getElementById('evOddsAway').value = '3.40';
  renderAdmin();
  renderEvents();
  renderTicker();
});

function renderAdmin() {
  const events = load(STORAGE_KEYS.events, []);
  const list = document.getElementById('adminEventsList');

  if (events.length === 0) {
    list.innerHTML = '<p class="empty-sub">No hay eventos creados.</p>';
    return;
  }

  list.innerHTML = events.slice().reverse().map(ev => {
    const dt = new Date(ev.kickoff).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const statusTag = ev.status === 'open'
      ? '<span class="tag-status open">Abierto</span>'
      : `<span class="tag-status settled">Liquidado: ${ev.result}</span>`;
    return `
    <div class="admin-event-row">
      <div class="admin-event-info">
        <h4>${ev.home} vs ${ev.away} ${statusTag}</h4>
        <span>${dt} · 1: ${ev.oddsHome.toFixed(2)} X: ${ev.oddsDraw.toFixed(2)} 2: ${ev.oddsAway.toFixed(2)}</span>
      </div>
      <div class="admin-event-actions">
        ${ev.status === 'open' ? `
          <button class="mini-btn win" data-act="settle" data-id="${ev.id}" data-result="home">Ganó local</button>
          <button class="mini-btn draw" data-act="settle" data-id="${ev.id}" data-result="draw">Empate</button>
          <button class="mini-btn lose" data-act="settle" data-id="${ev.id}" data-result="away">Ganó visitante</button>
        ` : ''}
        <button class="mini-btn delete" data-act="delete" data-id="${ev.id}">Eliminar</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-act="settle"]').forEach(btn => {
    btn.addEventListener('click', () => settleEvent(btn.dataset.id, btn.dataset.result));
  });
  list.querySelectorAll('[data-act="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
  });
}

function settleEvent(eventId, result) {
  const events = load(STORAGE_KEYS.events, []);
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  ev.status = 'settled';
  ev.result = result;
  save(STORAGE_KEYS.events, events);

  // liquidar apuestas relacionadas
  const bets = load(STORAGE_KEYS.bets, []);
  const users = load(STORAGE_KEYS.users, {});

  bets.forEach(bet => {
    if (bet.status !== 'pending') return;
    const relevant = bet.selections.find(s => s.eventId === eventId);
    if (!relevant) return;

    // Si es una apuesta combinada, solo la resolvemos del todo cuando
    // todas sus selecciones tienen evento liquidado. Para simplificar,
    // si cualquier selección pierde, la apuesta se marca perdida ya.
    if (relevant.selection !== result) {
      bet.status = 'lost';
      return;
    }

    // esta selección ganó: revisamos si el resto de selecciones ya están resueltas/ganadas
    const allEventsMap = {};
    load(STORAGE_KEYS.events, []).forEach(e => allEventsMap[e.id] = e);

    const allDecided = bet.selections.every(s => {
      const e = allEventsMap[s.eventId];
      if (!e || e.status !== 'settled') return false;
      return e.result === s.selection;
    });
    const anyLost = bet.selections.some(s => {
      const e = allEventsMap[s.eventId];
      return e && e.status === 'settled' && e.result !== s.selection;
    });

    if (anyLost) {
      bet.status = 'lost';
    } else if (allDecided) {
      bet.status = 'won';
      if (users[bet.username]) {
        users[bet.username].balance += bet.potentialWin;
        users[bet.username].tx.unshift({
          id: uid(),
          desc: 'Apuesta ganada',
          amount: Math.round(bet.potentialWin),
          date: new Date().toISOString(),
        });
      }
    }
    // si no está todo decidido, se queda pending hasta que se liquiden los demás eventos
  });

  save(STORAGE_KEYS.bets, bets);
  save(STORAGE_KEYS.users, users);

  renderAdmin();
  renderEvents();
  renderTicker();
  if (currentUser) renderTopbar();
}

function deleteEvent(eventId) {
  let events = load(STORAGE_KEYS.events, []);
  events = events.filter(e => e.id !== eventId);
  save(STORAGE_KEYS.events, events);
  renderAdmin();
  renderEvents();
  renderTicker();
}

/* ============ MASTER RENDER ============ */
function renderAll() {
  const session = load(STORAGE_KEYS.session, null);
  if (session) currentUser = session;

  if (!currentUser) {
    authScreen.classList.remove('hidden');
    appEl.classList.add('hidden');
    renderTopbar();
    renderTicker();
    return;
  }

  authScreen.classList.add('hidden');
  appEl.classList.remove('hidden');

  const user = getUser();
  if (!user) { logOut(); return; }

  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !user.isAdmin));

  renderTopbar();
  renderTicker();
  renderEvents();
  renderBetslip();
}

/* ============ STARFIELD CANVAS ============ */
(function starfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.6 + 0.2,
      tw: Math.random() * 0.02 + 0.005,
    }));
  }
  window.addEventListener('resize', resize);
  resize();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      if (!reduceMotion) {
        s.a += s.tw;
        if (s.a > 0.9 || s.a < 0.15) s.tw *= -1;
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,236,249,${s.a})`;
      ctx.fill();
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
})();

/* ============ INIT ============ */
renderAll();
