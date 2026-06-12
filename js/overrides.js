// Merges admin edits (from the server) on top of the seed predictions in
// data.js. We MUTATE the BETS array in place so every module that already
// imported BETS (scoring, all views) transparently sees the corrected data —
// no other file needs to know overrides exist.

import { BETS } from './data.js';

// Match-info fields the admin is allowed to change.
const MATCH_FIELDS = ['grupa', 'datum', 'vrijeme', 'tim1', 'tim2'];

// Pristine snapshot of the original seed, captured once at load. Every apply
// starts from this clean base so removing/replacing an edit can't leave stale
// values behind.
const SEED = BETS.map((m) => JSON.parse(JSON.stringify(m)));

// Player keys = everything on a match that isn't match-info or the match number.
const PLAYER_KEYS = Object.keys(SEED[0]).filter(
  (k) => k !== 'match' && !MATCH_FIELDS.includes(k)
);

export function applyOverrides(overrides) {
  const matches = (overrides && overrides.matches) || {};
  const bets = (overrides && overrides.bets) || {};

  BETS.forEach((m, idx) => {
    const seed = SEED[idx];
    const key = String(idx);

    // 1. Reset match-info to seed, then apply any non-empty overrides.
    const mo = matches[key];
    MATCH_FIELDS.forEach((f) => {
      m[f] = mo && mo[f] != null && mo[f] !== '' ? mo[f] : seed[f];
    });

    // 2. Reset every player's tip to seed, then apply any tip overrides.
    const bo = bets[key];
    PLAYER_KEYS.forEach((p) => {
      const over = bo && bo[p];
      m[p] = over ? { ...seed[p], ...over } : { ...seed[p] };
    });
  });
}
