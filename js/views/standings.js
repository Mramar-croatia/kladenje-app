// "Poredak" — leaderboard with a podium for the top three and a detailed table.

import { BETS } from '../data.js';
import { PLAYER_META } from '../config.js';
import { computeStandings, playedCount } from '../scoring.js';
import { el, esc, avatar } from '../ui.js';

function formDots(form) {
  if (!form.length) return '<span class="form-empty">—</span>';
  return (
    '<span class="form-dots">' +
    form.map((k) => `<span class="form-dot form-dot--${k}"></span>`).join('') +
    '</span>'
  );
}

function podiumCard(row, place) {
  const meta = PLAYER_META[row.player];
  const medal = { 1: '🥇', 2: '🥈', 3: '🥉' }[place] || '';
  return `
    <div class="podium-card podium-card--${place}">
      <div class="podium-medal">${medal}</div>
      ${avatar(meta, 56)}
      <div class="podium-name">${esc(meta.name)}</div>
      <div class="podium-pts">${row.pts}<span>bod.</span></div>
      <div class="podium-sub">${row.perfect} pogodaka · ${row.accuracy}%</div>
      <div class="podium-stand" style="--h:${place === 1 ? 96 : place === 2 ? 72 : 56}px">${place}</div>
    </div>`;
}

export function renderStandings(results) {
  const standings = computeStandings(results);
  const played = playedCount(results);
  const total = BETS.length;
  const leader = standings[0];

  const wrap = el('div', { class: 'view view--standings' });

  // Progress banner
  const pct = Math.round((played / total) * 100);
  const leadTitle = played && leader
    ? `<span class="banner-lead">${avatar(PLAYER_META[leader.player], 30)} ${esc(PLAYER_META[leader.player].name)} vodi</span>`
    : 'Poredak';
  wrap.appendChild(el('div', {
    class: 'banner',
    html: `
      <div class="banner-row">
        <div>
          <div class="banner-kicker">Svjetsko prvenstvo 2026 · grupna faza</div>
          <div class="banner-title">${leadTitle}</div>
        </div>
        <div class="banner-progress">
          <div class="banner-progress-num">${played}<span>/${total}</span></div>
          <div class="banner-progress-lbl">odigrano</div>
        </div>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>`,
  }));

  // Podium (top 3, arranged 2 - 1 - 3)
  const top = standings.slice(0, 3);
  if (played > 0 && top.length === 3) {
    const order = [top[1], top[0], top[2]];
    const places = [2, 1, 3];
    wrap.appendChild(el('div', {
      class: 'podium',
      html: order.map((r, i) => podiumCard(r, places[i])).join(''),
    }));
  }

  // Full table
  wrap.appendChild(el('h2', { class: 'section-title', text: 'Potpuni poredak' }));

  const table = el('div', { class: 'lead-table' });
  table.innerHTML = `
    <div class="lead-head">
      <span class="lh-rank">#</span>
      <span class="lh-player">Igrač</span>
      <span class="lh-num">Bod.</span>
      <span class="lh-num">Točan rez.</span>
      <span class="lh-num">Točan ishod</span>
      <span class="lh-acc">Preciznost</span>
      <span class="lh-form">Forma</span>
    </div>`;

  standings.forEach((row) => {
    const meta = PLAYER_META[row.player];
    const r = el('a', {
      class: 'lead-row' + (row.rank === 1 && played ? ' lead-row--leader' : ''),
      href: '#/igraci/' + row.player,
    });
    r.innerHTML = `
      <span class="lh-rank"><span class="rank-badge rank-${row.rank}">${row.rank}</span></span>
      <span class="lh-player">${avatar(meta, 36)}<span class="lr-name">${esc(meta.name)}</span></span>
      <span class="lh-num lr-pts">${row.pts}</span>
      <span class="lh-num lr-num-2">${row.perfect}</span>
      <span class="lh-num lr-num-2">${row.correct}</span>
      <span class="lh-acc">
        <span class="acc-cell">
          <span class="acc-bar"><span class="acc-fill" style="width:${row.accuracy}%;--c:${meta.color}"></span></span>
          <span class="acc-val">${row.accuracy}%</span>
        </span>
      </span>
      <span class="lh-form">${formDots(row.form)}</span>`;
    table.appendChild(r);
  });

  wrap.appendChild(table);

  // Scoring legend
  wrap.appendChild(el('div', {
    class: 'legend',
    html: `
      <span><span class="status status--perfect">★</span> Točan rezultat = <b>3 boda</b></span>
      <span><span class="status status--correct">✓</span> Točan ishod = <b>1 bod</b></span>
      <span><span class="status status--wrong">✕</span> Promašaj = <b>0</b></span>`,
  }));

  return wrap;
}
