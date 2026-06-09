// Central configuration and small shared helpers.

import { BETS } from './data.js';

// Fields on a bet entry that are NOT players.
const META_FIELDS = new Set(['grupa', 'datum', 'tim1', 'tim2']);

// Players are derived dynamically from the first bet entry (keeps the app
// agnostic about who is playing — add/remove a player in data.js and it works).
export const PLAYERS = Object.keys(BETS[0]).filter((k) => !META_FIELDS.has(k));

// Display names + a stable accent colour per player (used for avatars/charts).
const PLAYER_COLORS = ['#4F46E5', '#0EA5E9', '#DB2777', '#D97706', '#059669', '#7C3AED'];

export const PLAYER_META = PLAYERS.reduce((acc, p, i) => {
  acc[p] = {
    key: p,
    name: cap(p),
    initials: cap(p).slice(0, 2),
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
  };
  return acc;
}, {});

// Scoring rules (kept identical to the original app).
export const POINTS = { perfect: 3, correct: 1, wrong: 0 };

// Auth — passwords gate viewer vs admin access.
export const VIEWER_PWD = 'Lobel';
export const ADMIN_PWD = 'Robespierre';
export const AUTH_KEY = 'kp2026_auth';
export const TOKEN_KEY = 'kp2026_token';

export function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
