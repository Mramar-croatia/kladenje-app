// "Unos rezultata" — admin-only. Enter or edit the actual score of any match.
// Saved results can be corrected later, not just pending ones.

import { BETS } from '../data.js';
import { outcomeOf } from '../scoring.js';
import { saveResult, fetchResults, AuthError } from '../api.js';
import { el, esc, prettyDate } from '../ui.js';

const filters = { show: 'pending' }; // 'pending' | 'all'

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

export function renderAdmin(results, rerender, refreshResults, onAuthError) {
  const wrap = el('div', { class: 'view view--admin' });

  const total = BETS.length;
  const done = BETS.reduce((n, _m, idx) => (outcomeOf(results[String(idx)]) ? n + 1 : n), 0);

  const toolbar = el('div', { class: 'toolbar' });
  toolbar.innerHTML = `
    <div class="segmented">
      <button data-show="pending" class="${filters.show === 'pending' ? 'active' : ''}">Neuneseni (${total - done})</button>
      <button data-show="all" class="${filters.show === 'all' ? 'active' : ''}">Sve (${total})</button>
    </div>
    <span class="toolbar-note">Rezultate možeš naknadno ispraviti.</span>`;
  toolbar.querySelectorAll('.segmented button').forEach((b) => {
    b.addEventListener('click', () => {
      filters.show = b.dataset.show;
      rerender();
    });
  });
  wrap.appendChild(toolbar);

  // After a save: refresh results from server, then re-render the active view.
  const onSaved = async () => {
    await refreshResults();
    setTimeout(rerender, 500);
  };

  const items = BETS
    .map((match, idx) => ({ match, idx }))
    .filter(({ idx }) => filters.show === 'all' || !outcomeOf(results[String(idx)]));

  if (items.length === 0) {
    wrap.appendChild(el('div', { class: 'empty', text: 'Sve utakmice su unesene 🎉' }));
    return wrap;
  }

  const byDate = new Map();
  items.forEach((it) => {
    if (!byDate.has(it.match.datum)) byDate.set(it.match.datum, []);
    byDate.get(it.match.datum).push(it);
  });

  byDate.forEach((group, datum) => {
    wrap.appendChild(el('div', { class: 'date-divider', html: `<span>${esc(prettyDate(datum))}</span>` }));
    const list = el('div', { class: 'entry-list' });
    group.forEach(({ match, idx }) =>
      list.appendChild(entryRow(match, idx, results[String(idx)], onSaved, onAuthError))
    );
    wrap.appendChild(list);
  });

  return wrap;
}
