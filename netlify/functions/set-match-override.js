const { supabase } = require('./_shared/supabase');

// Admin-only. Overrides a match's info (group, date, time, team names).
// The admin form always sends all five fields, so we store the whole row.
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

  const { matchIndex, grupa, datum, vrijeme, tim1, tim2 } = body;

  if (!Number.isInteger(matchIndex) || matchIndex < 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid matchIndex' }) };
  }

  const str = (v) => (v == null ? '' : String(v).trim());

  const { error } = await supabase.from('match_overrides').upsert(
    {
      match_index: matchIndex,
      grupa: str(grupa),
      datum: str(datum),
      vrijeme: str(vrijeme),
      tim1: str(tim1),
      tim2: str(tim2),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'match_index' }
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
