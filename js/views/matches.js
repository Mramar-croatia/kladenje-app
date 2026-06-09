// "Utakmice" — all matches grouped by date, with status/group/search filters
// and every player's prediction shown against the actual result.

import { BETS } from '../data.js';
import { PLAYERS, PLAYER_META } from '../config.js';
import { scoreMatch, outcomeOf } from '../scoring.js';
import { el, esc, statusIcon, prettyDate } from '../ui.js';

// Filter state persists while the user is in the session.
const filters = { status: 'all', grupa: 'all', q: '' };

const GROUPS = [...new Set(BETS.map((b) => b.grupa))].sort();

function matchCard(match, idx, actual) {
  const played = !!outcomeOf(actual);
  const card = el('div', { class: 'match-card' + (played ? '' : ' match-card--upcoming') });

  const preds = PLAYERS.map((p) => {
    const meta = PLAYER_META[p];
    const s = played ? scoreMatch(match[p], actual) : { kind: 'pending', pts: 0 };
    return `
      <div class="pred pred--${s.kind}">
        <span class="pred-who" style="--c:${meta.color}">${esc(meta.name)}</span>
        <span class="pred-score">${esc(match[p].rezultat)}</span>
        ${statusIcon(s.kind)}
      </div>`;
  }).join('');

  card.innerHTML = `
    <div class="match-head">
      <span class="chip chip--group">Grupa ${esc(match.grupa)}</span>
      <span class="chip chip--date">${esc(prettyDate(match.datum))}</span>
      <span class="match-status ${played ? 'is-played' : 'is-upcoming'}">${played ? 'Odigrano' : 'Nije odigrano'}</span>
    </div>
    <div class="match-teams">
      <span class="team team--home">${esc(match.tim1)}</span>
      <span class="match-score">${played ? esc(actual) : '<small>vs</small>'}</span>
      <span class="team team--away">${esc(match.tim2)}</span>
    </div>
    <div class="preds">${preds}</div>`;
  return card;
}

function passesFilter(match, idx, results) {
  const actual = results[String(idx)];
  const played = !!outcomeOf(actual);
  if (filters.status === 'played' && !played) return false;
  if (filters.status === 'upcoming' && played) return false;
  if (filters.grupa !== 'all' && match.grupa !== filters.grupa) return false;
  if (filters.q) {
    const hay = (match.tim1 + ' ' + match.tim2).toLowerCase();
    if (!hay.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

export function renderMatches(results, rerender) {
  const wrap = el('div', { class: 'view view--matches' });

  // Toolbar
  const toolbar = el('div', { class: 'toolbar' });
  const groupOpts = ['<option value="all">Sve grupe</option>']
    .concat(GROUPS.map((g) => `<option value="${g}"${filters.grupa === g ? ' selected' : ''}>Grupa ${g}</option>`))
    .join('');
  toolbar.innerHTML = `
    <div class="segmented" role="tablist">
      <button data-status="all" class="${filters.status === 'all' ? 'active' : ''}">Sve</button>
      <button data-status="played" class="${filters.status === 'played' ? 'active' : ''}">Odigrane</button>
      <button data-status="upcoming" class="${filters.status === 'upcoming' ? 'active' : ''}">Nadolazeće</button>
    </div>
    <select class="select" id="grp-select">${groupOpts}</select>
    <input class="search" id="match-search" type="search" placeholder="Traži reprezentaciju…" value="${esc(filters.q)}" />`;

  toolbar.querySelectorAll('.segmented button').forEach((b) => {
    b.addEventListener('click', () => {
      filters.status = b.dataset.status;
      rerender();
    });
  });
  toolbar.querySelector('#grp-select').addEventListener('change', (e) => {
    filters.grupa = e.target.value;
    rerender();
  });
  const search = toolbar.querySelector('#match-search');
  search.addEventListener('input', (e) => {
    filters.q = e.target.value;
    rerender();
  });
  wrap.appendChild(toolbar);

  // Filtered + grouped by date
  const items = BETS
    .map((match, idx) => ({ match, idx }))
    .filter(({ match, idx }) => passesFilter(match, idx, results));

  if (items.length === 0) {
    wrap.appendChild(el('div', { class: 'empty', text: 'Nema utakmica za odabrane filtere.' }));
    queueMicrotask(() => search.focus());
    return wrap;
  }

  const byDate = new Map();
  items.forEach((it) => {
    if (!byDate.has(it.match.datum)) byDate.set(it.match.datum, []);
    byDate.get(it.match.datum).push(it);
  });

  byDate.forEach((group, datum) => {
    wrap.appendChild(el('div', {
      class: 'date-divider',
      html: `<span>${esc(prettyDate(datum))}</span><small>${group.length} ${group.length === 1 ? 'utakmica' : 'utakmice'}</small>`,
    }));
    const grid = el('div', { class: 'match-grid' });
    group.forEach(({ match, idx }) => grid.appendChild(matchCard(match, idx, results[String(idx)])));
    wrap.appendChild(grid);
  });

  return wrap;
}
