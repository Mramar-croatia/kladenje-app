// "Unos" — admin-only. Two modes:
//   • Rezultati: enter/correct the actual score of any match.
//   • Uredi: match-first editing of match info (date/time/teams/group)
//     and each player's tip. Edits are stored server-side (overrides) and
//     merged on top of the seed data, so no file editing or redeploy is needed.

import { BETS } from '../data.js';
import { PLAYERS, PLAYER_META } from '../config.js';
import { outcomeOf } from '../scoring.js';
import {
  saveResult,
  saveMatchOverride,
  saveBetOverride,
  AuthError,
} from '../api.js';
import { el, esc, prettyDate, prettyTime, timeMinutes } from '../ui.js';

// Persisted while in the session.
const state = { mode: 'rezultati', show: 'pending' }; // mode: 'rezultati' | 'uredi'

// ---------------------------------------------------------------------------
// Mode: Rezultati (enter the actual score)
// ---------------------------------------------------------------------------
function entryRow(match, idx, actual, onSaved, onAuthError) {
  const played = !!outcomeOf(actual);
  const [pg1, pg2] = played ? actual.split(':') : ['', ''];

  const row = el('div', { class: 'entry-row' + (played ? ' entry-row--done' : '') });
  row.innerHTML = `
    <div class="entry-match">
      <span class="chip chip--group">${esc(match.grupa)}</span>
      <span class="entry-teams">${esc(match.tim1)} – ${esc(match.tim2)}</span>
      <span class="chip chip--date">${esc(prettyDate(match.datum))}</span>
    </div>
    <div class="entry-controls">
      <div class="score-input">
        <input type="number" min="0" max="99" inputmode="numeric" value="${esc(pg1)}" aria-label="${esc(match.tim1)} golovi" />
        <span class="score-colon">:</span>
        <input type="number" min="0" max="99" inputmode="numeric" value="${esc(pg2)}" aria-label="${esc(match.tim2)} golovi" />
      </div>
      <button type="button" class="btn">${played ? 'Ažuriraj' : 'Spremi'}</button>
      <span class="entry-msg"></span>
    </div>`;

  const inputs = row.querySelectorAll('input[type="number"]');
  const btn = row.querySelector('button');
  const msg = row.querySelector('.entry-msg');

  btn.addEventListener('click', async () => {
    msg.className = 'entry-msg';
    msg.textContent = '';
    const a = inputs[0].value.trim();
    const b = inputs[1].value.trim();
    if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) {
      msg.className = 'entry-msg err';
      msg.textContent = 'Unesite oba broja.';
      return;
    }
    const rezultat = `${parseInt(a, 10)}:${parseInt(b, 10)}`;
    btn.disabled = true;
    try {
      await saveResult(idx, rezultat);
      msg.className = 'entry-msg ok';
      msg.textContent = 'Spremljeno ✓';
      await onSaved();
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      msg.className = 'entry-msg err';
      msg.textContent = 'Greška: ' + e.message;
      btn.disabled = false;
    }
  });

  return row;
}

function renderResults(wrap, results, rerender, refresh, onAuthError) {
  const total = BETS.length;
  const done = BETS.reduce((n, _m, idx) => (outcomeOf(results[String(idx)]) ? n + 1 : n), 0);

  const toolbar = el('div', { class: 'toolbar' });
  toolbar.innerHTML = `
    <div class="segmented">
      <button data-show="pending" class="${state.show === 'pending' ? 'active' : ''}">Neuneseni (${total - done})</button>
      <button data-show="all" class="${state.show === 'all' ? 'active' : ''}">Sve (${total})</button>
    </div>
    <span class="toolbar-note">Rezultate možeš naknadno ispraviti.</span>`;
  toolbar.querySelectorAll('.segmented button').forEach((b) => {
    b.addEventListener('click', () => {
      state.show = b.dataset.show;
      rerender();
    });
  });
  wrap.appendChild(toolbar);

  const onSaved = async () => {
    await refresh.refreshResults();
    setTimeout(rerender, 500);
  };

  const items = BETS
    .map((match, idx) => ({ match, idx }))
    .filter(({ idx }) => state.show === 'all' || !outcomeOf(results[String(idx)]));

  if (items.length === 0) {
    wrap.appendChild(el('div', { class: 'empty', text: 'Sve utakmice su unesene 🎉' }));
    return;
  }

  groupByDate(items).forEach((group, datum) => {
    wrap.appendChild(el('div', { class: 'date-divider', html: `<span>${esc(prettyDate(datum))}</span>` }));
    const list = el('div', { class: 'entry-list' });
    group.forEach(({ match, idx }) =>
      list.appendChild(entryRow(match, idx, results[String(idx)], onSaved, onAuthError))
    );
    wrap.appendChild(list);
  });
}

// ---------------------------------------------------------------------------
// Mode: Uredi (edit match info + player tips, match-first)
// ---------------------------------------------------------------------------
function flash(msg, ok, text) {
  msg.className = 'entry-msg ' + (ok ? 'ok' : 'err');
  msg.textContent = text;
}

// Editable form for one match's info (group/date/time/teams).
function matchInfoForm(match, idx, onSaved, onAuthError) {
  const box = el('div', { class: 'edit-section' });
  box.innerHTML = `
    <h4 class="edit-title">Podaci o utakmici</h4>
    <div class="edit-grid">
      <label>Grupa<input class="edit-input" data-f="grupa" value="${esc(match.grupa)}" /></label>
      <label>Datum<input class="edit-input" data-f="datum" value="${esc(match.datum)}" placeholder="11.6." /></label>
      <label>Vrijeme<input class="edit-input" data-f="vrijeme" value="${esc(match.vrijeme)}" placeholder="21:00" /></label>
      <label>Domaćin<input class="edit-input" data-f="tim1" value="${esc(match.tim1)}" /></label>
      <label>Gost<input class="edit-input" data-f="tim2" value="${esc(match.tim2)}" /></label>
    </div>
    <div class="edit-actions">
      <button type="button" class="btn">Spremi podatke</button>
      <span class="entry-msg"></span>
    </div>`;

  const btn = box.querySelector('button');
  const msg = box.querySelector('.entry-msg');

  btn.addEventListener('click', async () => {
    const fields = {};
    box.querySelectorAll('.edit-input').forEach((i) => (fields[i.dataset.f] = i.value.trim()));
    if (!fields.tim1 || !fields.tim2) {
      return flash(msg, false, 'Unesite oba tima.');
    }
    btn.disabled = true;
    flash(msg, true, '…');
    try {
      await saveMatchOverride(idx, fields);
      flash(msg, true, 'Spremljeno ✓');
      await onSaved();
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      flash(msg, false, 'Greška: ' + e.message);
      btn.disabled = false;
    }
  });

  return box;
}

// One editable tip row for a single player.
function tipRow(match, idx, player, onSaved, onAuthError) {
  const meta = PLAYER_META[player];
  const tip = match[player] || { ishod: '1', rezultat: '' };

  const row = el('div', { class: 'tip-row' });
  const opt = (v, label) =>
    `<option value="${v}"${tip.ishod === v ? ' selected' : ''}>${label}</option>`;
  row.innerHTML = `
    <span class="tip-who" style="--c:${meta.color}">${esc(meta.name)}</span>
    <select class="select tip-ishod" aria-label="Ishod">
      ${opt('1', '1 (Domaćin)')}${opt('X', 'X (Neriješeno)')}${opt('2', '2 (Gost)')}
    </select>
    <input class="edit-input tip-score" value="${esc(tip.rezultat)}" placeholder="2:1" inputmode="numeric" aria-label="Rezultat tipa" />
    <button type="button" class="btn btn--ghost">Spremi</button>
    <span class="entry-msg"></span>`;

  const sel = row.querySelector('.tip-ishod');
  const score = row.querySelector('.tip-score');
  const btn = row.querySelector('button');
  const msg = row.querySelector('.entry-msg');

  btn.addEventListener('click', async () => {
    const ishod = sel.value;
    const rezultat = score.value.trim();
    if (!/^\d+:\d+$/.test(rezultat)) {
      return flash(msg, false, 'Format: npr. 2:1');
    }
    btn.disabled = true;
    flash(msg, true, '…');
    try {
      await saveBetOverride(idx, player, ishod, rezultat);
      flash(msg, true, 'Spremljeno ✓');
      await onSaved();
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      flash(msg, false, 'Greška: ' + e.message);
      btn.disabled = false;
    }
  });

  return row;
}

function editCard(match, idx, results, onSaved, onAuthError) {
  const played = !!outcomeOf(results[String(idx)]);
  const card = el('details', { class: 'edit-card' });

  const summary = el('summary', { class: 'edit-summary' });
  summary.innerHTML = `
    <span class="chip chip--group">${esc(match.grupa)}</span>
    <span class="entry-teams">${esc(match.tim1)} – ${esc(match.tim2)}</span>
    ${match.vrijeme ? `<span class="chip chip--time">${esc(prettyTime(match.vrijeme))}</span>` : ''}
    ${played ? '<span class="chip chip--date">odigrano</span>' : ''}`;
  card.appendChild(summary);

  const body = el('div', { class: 'edit-body' });
  body.appendChild(matchInfoForm(match, idx, onSaved, onAuthError));

  const tips = el('div', { class: 'edit-section' });
  tips.appendChild(el('h4', { class: 'edit-title', text: 'Tipovi igrača' }));
  PLAYERS.forEach((p) => tips.appendChild(tipRow(match, idx, p, onSaved, onAuthError)));
  body.appendChild(tips);

  card.appendChild(body);
  return card;
}

function renderEdit(wrap, results, rerender, refresh, onAuthError) {
  wrap.appendChild(el('div', {
    class: 'toolbar',
    html: '<span class="toolbar-note">Otvori utakmicu da urediš datum, vrijeme, timove i tipove igrača.</span>',
  }));

  // Re-fetch the merged overrides, then re-render so inputs show fresh values.
  const onSaved = async () => {
    await refresh.refreshOverrides();
    setTimeout(rerender, 400);
  };

  const items = BETS.map((match, idx) => ({ match, idx }));

  groupByDate(items).forEach((group, datum) => {
    wrap.appendChild(el('div', { class: 'date-divider', html: `<span>${esc(prettyDate(datum))}</span>` }));
    const list = el('div', { class: 'edit-list' });
    group.forEach(({ match, idx }) =>
      list.appendChild(editCard(match, idx, results, onSaved, onAuthError))
    );
    wrap.appendChild(list);
  });
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------
function groupByDate(items) {
  const byDate = new Map();
  items.forEach((it) => {
    if (!byDate.has(it.match.datum)) byDate.set(it.match.datum, []);
    byDate.get(it.match.datum).push(it);
  });
  // Within each day, order by kickoff time (0–23).
  byDate.forEach((group) =>
    group.sort((a, b) => timeMinutes(a.match.vrijeme) - timeMinutes(b.match.vrijeme))
  );
  return byDate;
}

export function renderAdmin(results, rerender, refresh, onAuthError) {
  const wrap = el('div', { class: 'view view--admin' });

  // Top-level mode switch.
  const modes = el('div', { class: 'segmented segmented--modes' });
  modes.innerHTML = `
    <button data-mode="rezultati" class="${state.mode === 'rezultati' ? 'active' : ''}">Rezultati</button>
    <button data-mode="uredi" class="${state.mode === 'uredi' ? 'active' : ''}">Uredi utakmice</button>`;
  modes.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      rerender();
    });
  });
  wrap.appendChild(modes);

  if (state.mode === 'uredi') {
    renderEdit(wrap, results, rerender, refresh, onAuthError);
  } else {
    renderResults(wrap, results, rerender, refresh, onAuthError);
  }

  return wrap;
}
