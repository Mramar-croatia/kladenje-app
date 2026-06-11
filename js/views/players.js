// "Igrači" — overview of every player's stats, plus a per-player detail page
// reachable via #/igraci/<player>.

import { BETS } from '../data.js';
import { PLAYERS, PLAYER_META } from '../config.js';
import { computeStandings, scoreMatch, outcomeOf } from '../scoring.js';
import { el, esc, icon, statusIcon, ishodPill, prettyDate, prettyTime } from '../ui.js';

function statBox(label, value, accent) {
  return `<div class="statbox"><div class="statbox-val" style="${accent ? 'color:' + accent : ''}">${value}</div><div class="statbox-lbl">${label}</div></div>`;
}

// Longest run of consecutive scoring hits (exact result or correct outcome)
// across played matches in fixture order. A more telling stat than "best group".
function longestStreak(player, results) {
  let best = 0;
  let cur = 0;
  BETS.forEach((m, idx) => {
    const actual = results[String(idx)];
    if (!outcomeOf(actual)) return;
    const s = scoreMatch(m[player], actual);
    if (s.kind === 'perfect' || s.kind === 'correct') {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  });
  return best;
}

export function renderPlayers(results) {
  const standings = computeStandings(results);
  const wrap = el('div', { class: 'view view--players' });
  wrap.appendChild(el('h2', { class: 'section-title', text: 'Igrači' }));

  const grid = el('div', { class: 'player-grid' });
  standings.forEach((row) => {
    const meta = PLAYER_META[row.player];
    const streak = longestStreak(row.player, results);
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
        ${statBox('Najduži niz', streak)}
      </div>
      <div class="pcard-go">Pogledaj sve tipove ${icon('arrow', 15)}</div>`;
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

  wrap.appendChild(el('a', {
    class: 'back-link',
    href: '#/igraci',
    html: `${icon('back', 16)} Svi igrači`,
  }));

  const header = el('div', { class: 'player-hero', style: `--c:${meta.color}` });
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
      <div class="tip-main">
        <span class="chip chip--group">${esc(m.grupa)}</span>
        <span class="tip-teams">${esc(m.tim1)} – ${esc(m.tim2)}</span>
        <span class="tip-when">${esc(prettyDate(m.datum))}${m.vrijeme ? ' · ' + esc(prettyTime(m.vrijeme)) : ''}</span>
      </div>
      <div class="tip-info">
        ${ishodPill(m[player].ishod)}
        <span class="tip-guess"><span class="tip-lbl">tip</span> <b>${esc(m[player].rezultat)}</b></span>
        <span class="tip-arrow">→</span>
        <span class="tip-actual${played ? '' : ' is-pending'}">${played ? esc(actual) : '—'}</span>
        ${statusIcon(s.kind)}
        <span class="tip-pts${played && s.pts ? '' : ' is-zero'}">${played ? '+' + s.pts : ''}</span>
      </div>`;
    list.appendChild(tip);
  });
  wrap.appendChild(list);

  return wrap;
}
