const { supabase } = require('./_shared/supabase');

exports.handler = async (event) => {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');

  const viewer = process.env.VIEWER_PASSWORD;
  const admin = process.env.ADMIN_PASSWORD;

  if (token !== viewer && token !== admin) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { data, error } = await supabase
    .from('results')
    .select('match_index, rezultat');

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  const map = {};
  for (const row of data || []) {
    map[String(row.match_index)] = row.rezultat;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(map),
  };
};
