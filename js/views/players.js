// "Igrači" — overview of every player's stats, plus a per-player detail page
// reachable via #/igraci/<player>.

import { BETS } from '../data.js';
import { PLAYERS, PLAYER_META } from '../config.js';
import { computeStandings, scoreMatch, outcomeOf } from '../scoring.js';
import { el, esc, statusIcon, prettyDate } from '../ui.js';

function statBox(label, value, accent) {
  return `<div class="statbox"><div class="statbox-val" style="${accent ? 'color:' + accent : ''}">${value}</div><div class="statbox-lbl">${label}</div></div>`;
}

// Best group for a player by points earned there.
function bestGroup(player, results) {
  const byGroup = {};
  BETS.forEach((m, idx) => {
    const actual = results[String(idx)];
    if (!outcomeOf(actual)) return;
    const s = scoreMatch(m[player], actual);
    byGroup[m.grupa] = (byGroup[m.grupa] || 0) + s.pts;
  });
  let best = null;
  for (const [g, pts] of Object.entries(byGroup)) {
    if (!best || pts > best.pts) best = { g, pts };
  }
  return best;
}

export function renderPlayers(results) {
  const standings = computeStandings(results);
  const wrap = el('div', { class: 'view view--players' });
  wrap.appendChild(el('h2', { class: 'section-title', text: 'Igrači' }));

  const grid = el('div', { class: 'player-grid' });
  standings.forEach((row) => {
    const meta = PLAYER_META[row.player];
    const bg = bestGroup(row.player, results);
    const card = el('a', { class: 'pcard', href: '#/igraci/' + row.player });
    card.innerHTML = `
      <div class="pcard-top">
        <span class="avatar" style="--c:${meta.color};width:48px;height:48px;font-size:19px">${esc(meta.initials)}</span>
        <div>
          <div class="pcard-name">${esc(meta.name)}</div>
          <div class="pcard-rank">${row.rank}. mjesto</div>
        </div>
        <div class="pcard-pts">${row.pts}<span>bod.</span></div>
      </div>
      <div class="pcard-stats">
        ${statBox('Točan rez.', row.perfect, meta.color)}
        ${statBox('Točan ishod', row.correct)}
        ${statBox('Preciznost', row.accuracy + '%')}
        ${statBox('Najbolja grupa', bg ? bg.g : '—')}
      </div>
      <div class="pcard-go">Pogledaj sve tipove →</div>`;
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}

export function renderPlayerDetail(player, results) {
  const meta = PLAYER_META[player];
  const wrap = el('div', { class: 'view view--player-detail' });

  if (!meta) {
    wrap.appendChild(el('div', { class: 'empty', text: 'Nepoznat igrač.' }));
    return wrap;
  }

  const row = computeStandings(results).find((r) => r.player === player);

  wrap.appendChild(el('a', { class: 'back-link', href: '#/igraci', text: '← Svi igrači' }));

  const header = el('div', { class: 'player-hero' });
  header.innerHTML = `
    <span class="avatar" style="--c:${meta.color};width:64px;height:64px;font-size:26px">${esc(meta.initials)}</span>
    <div class="player-hero-info">
      <div class="player-hero-name">${esc(meta.name)}</div>
      <div class="player-hero-sub">${row.rank}. mjesto · ${row.played} odigranih</div>
    </div>
    <div class="player-hero-stats">
      ${statBox('Bodovi', row.pts, meta.color)}
      ${statBox('Točan rez.', row.perfect)}
      ${statBox('Točan ishod', row.correct)}
      ${statBox('Preciznost', row.accuracy + '%')}
    </div>`;
  wrap.appendChild(header);

  wrap.appendChild(el('h2', { class: 'section-title', text: 'Svi tipovi' }));

  const list = el('div', { class: 'tip-list' });
  BETS.forEach((m, idx) => {
    const actual = results[String(idx)];
    const played = !!outcomeOf(actual);
    const s = played ? scoreMatch(m[player], actual) : { kind: 'pending', pts: 0 };
    const tip = el('div', { class: 'tip-row tip-row--' + s.kind });
    tip.innerHTML = `
      <span class="chip chip--group">${esc(m.grupa)}</span>
      <span class="tip-teams">${esc(m.tim1)} – ${esc(m.tim2)}</span>
      <span class="tip-date">${esc(prettyDate(m.datum))}</span>
      <span class="tip-guess">tip <b>${esc(m[player].rezultat)}</b></span>
      <span class="tip-actual">${played ? esc(actual) : '—'}</span>
      ${statusIcon(s.kind)}
      <span class="tip-pts">${played ? '+' + s.pts : ''}</span>`;
    list.appendChild(tip);
  });
  wrap.appendChild(list);

  return wrap;
}
