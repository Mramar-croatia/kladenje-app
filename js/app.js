// App controller: auth flow, hash routing, view dispatch, data loading.

import { isAdmin, getRole, roleForPassword, login, logout } from './auth.js';
import { fetchResults, fetchOverrides, AuthError } from './api.js';
import { applyOverrides } from './overrides.js';
import { renderStandings } from './views/standings.js';
import { renderMatches } from './views/matches.js';
import { renderPlayers, renderPlayerDetail } from './views/players.js';
import { renderAdmin } from './views/admin.js';
import { el, icon } from './ui.js';

const TABS = [
  { id: 'poredak', label: 'Poredak', icon: 'trophy' },
  { id: 'utakmice', label: 'Utakmice', icon: 'ball' },
  { id: 'igraci', label: 'Igrači', icon: 'users' },
  { id: 'unos', label: 'Unos', icon: 'edit', adminOnly: true },
];

let results = {};

const $ = (id) => document.getElementById(id);

// ---- Routing (hash: #/<tab>[/<param>]) ----
function parseRoute() {
  const raw = (location.hash || '#/poredak').replace(/^#\/?/, '');
  const [tab = 'poredak', param] = raw.split('/');
  return { tab, param };
}

function go(tab) {
  location.hash = '#/' + tab;
}

// ---- Auth screens ----
function showAuth() {
  $('auth-screen').style.display = '';
  $('app').style.display = 'none';
}
function showApp() {
  $('auth-screen').style.display = 'none';
  $('app').style.display = '';
}

function handleAuthError() {
  logout();
  showAuth();
}

// ---- Chrome ----
function renderChrome(activeTab) {
  const role = getRole();
  const tabsEl = $('tabs');
  const bottomEl = $('bottom-nav');
  tabsEl.innerHTML = '';
  bottomEl.innerHTML = '';

  TABS.filter((t) => !t.adminOnly || isAdmin()).forEach((t) => {
    const active = t.id === activeTab ? ' active' : '';
    tabsEl.appendChild(el('button', {
      class: 'tab' + active,
      onClick: () => go(t.id),
      html: `${icon(t.icon, 18)}<span>${t.label}</span>`,
    }));
    bottomEl.appendChild(el('button', {
      class: 'bnav-btn' + active,
      onClick: () => go(t.id),
      html: `${icon(t.icon, 22)}<span class="bnav-lbl">${t.label}</span>`,
    }));
  });

  $('role-badge').textContent = role === 'admin' ? 'Admin' : 'Gledatelj';
  $('role-badge').className = 'role-badge role-badge--' + (role === 'admin' ? 'admin' : 'viewer');
}

// ---- View dispatch ----
function render() {
  let { tab, param } = parseRoute();
  if (tab === 'unos' && !isAdmin()) tab = 'poredak';

  renderChrome(tab);

  const c = $('content');
  c.innerHTML = '';
  c.scrollTop = 0;

  let node;
  if (tab === 'utakmice') {
    node = renderMatches(results, render);
  } else if (tab === 'igraci') {
    node = param ? renderPlayerDetail(param, results) : renderPlayers(results);
  } else if (tab === 'unos' && isAdmin()) {
    node = renderAdmin(results, render, { refreshResults, refreshOverrides }, handleAuthError);
  } else {
    node = renderStandings(results);
  }
  c.appendChild(node);
}

async function refreshResults() {
  results = await fetchResults();
}

// Load admin edits and merge them onto the seed predictions (in place).
async function refreshOverrides() {
  applyOverrides(await fetchOverrides());
}

// ---- Boot the authenticated app ----
async function init() {
  showApp();
  $('content').innerHTML = '<div class="loading"><span class="spinner"></span>Učitavanje…</div>';
  try {
    await Promise.all([refreshResults(), refreshOverrides()]);
  } catch (e) {
    if (e instanceof AuthError) return handleAuthError();
    $('content').innerHTML =
      '<div class="empty">Greška pri učitavanju: ' + (e.message || e) + '</div>';
    return;
  }
  render();
}

// ---- Wiring ----
function wire() {
  $('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('auth-pwd').value;
    const err = $('auth-err');
    const role = roleForPassword(v);
    if (role) {
      login(role, v);
      err.textContent = '';
      init();
    } else {
      err.textContent = 'Pogrešna lozinka.';
      $('auth-pwd').focus();
      $('auth-pwd').select();
    }
  });

  $('logout-btn').addEventListener('click', () => {
    logout();
    location.hash = '#/poredak';
    location.reload();
  });

  window.addEventListener('hashchange', () => {
    if (getRole()) render();
  });
}

wire();
if (getRole()) {
  init();
} else {
  showAuth();
}
