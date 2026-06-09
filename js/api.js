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
  const res = await fetch('/api/result', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken(),
    },
    body: JSON.stringify({ matchIndex, rezultat }),
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
