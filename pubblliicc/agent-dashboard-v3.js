const STORAGE_KEY = 'royalbet_api_jwt';
const API_BASE = ['localhost', 'localhost'].includes(window.location.hostname)
  ? 'http://localhost:1337'
  : 'https://royalbet88.live';

function getToken() {
  if (window.RBSecurity && typeof window.RBSecurity.getToken === 'function') {
    const secureToken = window.RBSecurity.getToken();
    if (secureToken) return secureToken;
  }
  const v = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem('jwt') || localStorage.getItem('jwt') || sessionStorage.getItem('token') || localStorage.getItem('token');
  return (v && v.length > 20 && v.includes('.')) ? v : null;
}

function $(selector) { return document.querySelector(selector); }

function showLogin() {
  const root = $('#root');
  if (!root) return;
  root.innerHTML = `
    <div class="card" style="max-width:440px;margin:60px auto;padding:32px">
      <h2 style="text-align:center;margin-bottom:8px"> </h2>
      <p style="text-align:center;color:#666;margin-bottom:24px">    </p>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label"></label>
          <input class="form-input" type="text" id="login-email" required autocomplete="username" />
        </div>
        <div class="form-group">
          <label class="form-label"></label>
          <input class="form-input" type="password" id="login-password" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%"> </button>
        <p id="login-error" style="color:#dc2626;margin-top:12px;display:none;text-align:center"></p>
      </form>
    </div>
  `;

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = $('#login-email').value;
    const password = $('#login-password').value;
    const errorEl = $('#login-error');

    try {
      const res = await fetch(`${API_BASE}/api/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || ' ');
      }
      if (data.jwt) {
        if (window.RBSecurity && typeof window.RBSecurity.setToken === 'function') {
          window.RBSecurity.setToken(data.jwt);
        } else {
          sessionStorage.setItem(STORAGE_KEY, data.jwt);
        }
      }
      renderDashboard();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    }
  });
}

function renderDashboard() {
  const root = $('#root');
  if (!root) return;

  root.innerHTML = `
    <a class="back-link" href="/">   </a>
    <div class="header">
      <h1 style="font-size:24px;margin-bottom:8px"> </h1>
      <p style="opacity:0.9">, <span id="agent-name">...</span></p>
    </div>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value" id="balance">0 p</div>
        <div class="stat-label"> </div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="invite-code"></div>
        <div class="stat-label"> </div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="players-count">0</div>
        <div class="stat-label"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">  </h2>
        <button class="btn btn-primary" id="btn-create">+   </button>
      </div>
      <table>
        <thead><tr><th>ID</th><th> </th><th></th><th></th><th></th></tr></thead>
        <tbody id="players-tbody"><tr><td colspan="5" class="empty">...</td></tr></tbody>
      </table>
    </div>
    <div id="modals"></div>
  `;

  $('#btn-create').addEventListener('click', openCreateModal);
  loadData();
}

function openCreateModal() {
  const modals = $('#modals');
  if (!modals) return;
  modals.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h3 class="modal-title">  </h3>
        <form id="create-form">
          <div class="form-group">
            <label class="form-label"> </label>
            <input class="form-input" name="username" required />
          </div>
          <div class="form-group">
            <label class="form-label"></label>
            <input class="form-input" type="email" name="email" required />
          </div>
          <div class="form-group">
            <label class="form-label"></label>
            <input class="form-input" type="password" name="password" required />
          </div>
          <div class="form-group">
            <label class="form-label"> </label>
            <input class="form-input" name="invite_code" required />
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-start">
            <button type="submit" class="btn btn-success"> </button>
            <button type="button" class="btn btn-secondary" id="btn-cancel-create"></button>
          </div>
        </form>
      </div>
    </div>
  `;

  $('#create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`${API_BASE}/api/agents/register-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(fd.entries())),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || '  ');
      $('#modals').innerHTML = '';
      loadData();
    } catch (err) {
      alert(err.message);
    }
  });

  $('#btn-cancel-create').addEventListener('click', () => { $('#modals').innerHTML = ''; });
}

function openTransferModal(player) {
  const modals = $('#modals');
  if (!modals) return;
  modals.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h3 class="modal-title"> </h3>
        <p style="margin-bottom:16px">: <strong>${player.username}</strong></p>
        <form id="transfer-form">
          <div class="form-group">
            <label class="form-label"></label>
            <input class="form-input" type="number" min="1" step="0.01" name="amount" required />
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-start">
            <button type="submit" class="btn btn-primary"></button>
            <button type="button" class="btn btn-secondary" id="btn-cancel-transfer"></button>
          </div>
        </form>
      </div>
    </div>
  `;

  $('#transfer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`${API_BASE}/api/agents/transfer-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: player.id, amount: Number(fd.get('amount')) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || ' ');
      $('#modals').innerHTML = '';
      loadData();
    } catch (err) {
      alert(err.message);
    }
  });

  $('#btn-cancel-transfer').addEventListener('click', () => { $('#modals').innerHTML = ''; });
}

async function loadData() {
  try {
    const [me, playersList] = await Promise.all([
      fetch(`${API_BASE}/api/agents/me`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
      fetch(`${API_BASE}/api/agents/my-players`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
    ]);

    if (!getToken()) {
      showLogin();
      return;
    }

    $('#agent-name').textContent = me?.data?.username || '';
    $('#balance').textContent = `${me?.data?.balance || 0} p`;
    $('#invite-code').textContent = me?.data?.invite_code || '';
    $('#players-count').textContent = playersList?.data?.length || 0;

    const tbody = $('#players-tbody');
    const list = playersList?.data || [];
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">  </td></tr>';
    } else {
      tbody.innerHTML = list.map(p => `
        <tr>
          <td>#${p.id}</td>
          <td>${p.username}</td>
          <td>${p.email}</td>
          <td><span class="badge badge-green">${p.balance || 0} p</span></td>
          <td><button class="btn btn-secondary btn-transfer" data-id="${p.id}" data-name="${p.username}"> </button></td>
        </tr>
      `).join('');

      document.querySelectorAll('.btn-transfer').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.id);
          const player = list.find(p => p.id === id);
          if (player) openTransferModal(player);
        });
      });
    }
  } catch (err) {
    if ($('#root')) {
      $('#root').innerHTML = `<div class="error">${err.message}</div><a class="back-link" href="/"> </a>`;
    }
  }
}

function init() {
  const token = getToken();
  if (!token) {
    showLogin();
  } else {
    renderDashboard();
    loadData();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
