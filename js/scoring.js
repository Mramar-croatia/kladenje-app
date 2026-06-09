// Scoring + standings computation. Pure functions — no DOM, no globals.

import { BETS } from './data.js';
import { PLAYERS, POINTS } from './config.js';

// "2:1" -> "1" | "X" | "2" | null (invalid)
export function outcomeOf(rezultat) {
  const m = /^(\d+):(\d+)$/.exec(rezultat || '');
  if (!m) return null;
  const g1 = parseInt(m[1], 10);
  const g2 = parseInt(m[2], 10);
  if (g1 > g2) return '1';
  if (g1 < g2) return '2';
  return 'X';
}

// Score a single player's prediction against the actual result.
// kind: 'perfect' (exact score) | 'correct' (right outcome) | 'wrong' | 'pending'
export function scoreMatch(prediction, actual) {
  const actualOut = outcomeOf(actual);
  if (!actualOut) return { pts: 0, kind: 'pending' };
  if (prediction.rezultat === actual) return { pts: POINTS.perfect, kind: 'perfect' };
  if (prediction.ishod === actualOut) return { pts: POINTS.correct, kind: 'correct' };
  return { pts: 0, kind: 'wrong' };
}

// How many matches currently have an entered result.
export function playedCount(results) {
  return BETS.reduce((n, _m, idx) => (results[String(idx)] ? n + 1 : n), 0);
}

// Full standings with rich per-player stats, sorted by points then exact hits.
export function computeStandings(results) {
  const totals = {};
  PLAYERS.forEach((p) => {
    totals[p] = {
      player: p,
      pts: 0,
      correct: 0, // right outcome (includes perfect)
      perfect: 0, // exact score
      wrong: 0,
      played: 0,
      form: [], // recent kinds, oldest -> newest
    };
  });

  BETS.forEach((m, idx) => {
    const actual = results[String(idx)];
    if (!actual) return;
    PLAYERS.forEach((p) => {
      const t = totals[p];
      const s = scoreMatch(m[p], actual);
      t.pts += s.pts;
      t.played += 1;
      t.form.push(s.kind);
      if (s.kind === 'perfect') {
        t.perfect += 1;
        t.correct += 1;
      } else if (s.kind === 'correct') {
        t.correct += 1;
      } else if (s.kind === 'wrong') {
        t.wrong += 1;
      }
    });
  });

  const arr = Object.values(totals).map((t) => ({
    ...t,
    form: t.form.slice(-6),
    accuracy: t.played ? Math.round((t.correct / t.played) * 100) : 0,
  }));

  arr.sort((a, b) => b.pts - a.pts || b.perfect - a.perfect || b.correct - a.correct);

  // Dense ranking (ties share a rank).
  let lastPts = null;
  let lastRank = 0;
  arr.forEach((row, i) => {
    if (row.pts !== lastPts) {
      lastRank = i + 1;
      lastPts = row.pts;
    }
    row.rank = lastRank;
  });

  return arr;
}

// Maximum points a player could still reach (current + 3 per unplayed match).
export function maxPossible(row, results) {
  return row.pts + (BETS.length - playedCount(results)) * POINTS.perfect;
}
