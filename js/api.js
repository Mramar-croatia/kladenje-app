// Backend access — talks to the Netlify functions / Supabase store.

import { getToken } from './auth.js';

// Thrown so callers can detect an expired/invalid session (HTTP 401).
export class AuthError extends Error {}

export async function fetchResults() {
  const res = await fetch('/api/results', {
    headers: { Authorization: 'Bearer ' + getToken() },
  });
  if (res.status === 401) throw new AuthError('Unauthorized');
  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {}
    throw new Error('HTTP ' + res.status + ' ' + body);
  }
  return res.json();
}

export async function saveResult(matchIndex, rezultat) {
  return postJson('/api/result', { matchIndex, rezultat });
}

// Admin edits ("overrides") that sit on top of the seed data in data.js.
// Shape: { matches: { "20": {grupa,datum,vrijeme,tim1,tim2} },
//          bets:    { "20": { filip: {ishod,rezultat} } } }
export async function fetchOverrides() {
  const res = await fetch('/api/overrides', {
    headers: { Authorization: 'Bearer ' + getToken() },
  });
  if (res.status === 401) throw new AuthError('Unauthorized');
  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {}
    throw new Error('HTTP ' + res.status + ' ' + body);
  }
  return res.json();
}

// Change a match's info (group, date, time, team names).
export async function saveMatchOverride(matchIndex, fields) {
  return postJson('/api/match-override', { matchIndex, ...fields });
}

// Change one player's tip for a match.
export async function saveBetOverride(matchIndex, player, ishod, rezultat) {
  return postJson('/api/bet-override', { matchIndex, player, ishod, rezultat });
}

// Shared POST helper with auth + JSON error handling.
async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken(),
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) throw new AuthError('Unauthorized');
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return true;
}
