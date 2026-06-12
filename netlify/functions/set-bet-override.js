const { supabase } = require('./_shared/supabase');

// Admin-only. Overrides a single player's tip (outcome + exact score) for a match.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');

  if (token !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { matchIndex, player, ishod, rezultat } = body;

  if (!Number.isInteger(matchIndex) || matchIndex < 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid matchIndex' }) };
  }
  if (typeof player !== 'string' || !/^[a-z0-9_]+$/i.test(player)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid player' }) };
  }
  if (ishod !== '1' && ishod !== 'X' && ishod !== '2') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid ishod' }) };
  }
  if (typeof rezultat !== 'string' || !/^\d+:\d+$/.test(rezultat)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid rezultat format' }) };
  }

  const { error } = await supabase.from('bet_overrides').upsert(
    {
      match_index: matchIndex,
      player,
      ishod,
      rezultat,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'match_index,player' }
  );

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
