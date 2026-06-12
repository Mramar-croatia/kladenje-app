const { supabase } = require('./_shared/supabase');

// Returns all admin edits: match-info changes and per-player tip changes.
// Readable by viewer and admin (everyone must see the corrected data).
exports.handler = async (event) => {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');

  const viewer = process.env.VIEWER_PASSWORD;
  const admin = process.env.ADMIN_PASSWORD;

  if (token !== viewer && token !== admin) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const [matchRes, betRes] = await Promise.all([
    supabase
      .from('match_overrides')
      .select('match_index, grupa, datum, vrijeme, tim1, tim2'),
    supabase
      .from('bet_overrides')
      .select('match_index, player, ishod, rezultat'),
  ]);

  if (matchRes.error) {
    return { statusCode: 500, body: JSON.stringify({ error: matchRes.error.message }) };
  }
  if (betRes.error) {
    return { statusCode: 500, body: JSON.stringify({ error: betRes.error.message }) };
  }

  // matches: { "20": { grupa, datum, vrijeme, tim1, tim2 } }
  const matches = {};
  for (const row of matchRes.data || []) {
    matches[String(row.match_index)] = {
      grupa: row.grupa,
      datum: row.datum,
      vrijeme: row.vrijeme,
      tim1: row.tim1,
      tim2: row.tim2,
    };
  }

  // bets: { "20": { filip: { ishod, rezultat }, ... } }
  const bets = {};
  for (const row of betRes.data || []) {
    const key = String(row.match_index);
    if (!bets[key]) bets[key] = {};
    bets[key][row.player] = { ishod: row.ishod, rezultat: row.rezultat };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matches, bets }),
  };
};
