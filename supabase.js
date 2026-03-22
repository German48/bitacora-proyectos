// Configuración Supabase
const SUPABASE_URL = 'https://orypvcwpeomplyhqwzdh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BaoQp9hf2xoEc5fUKGAXTA_xcvZmAIt';
const RECORD_ID = 'bitacora-main';

async function sbLoad() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/proyectos_bitacora?id=eq.${RECORD_ID}&select=data`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    if (rows && rows.length > 0) return rows[0].data;
    return null;
  } catch { return null; }
}

async function sbSave(projects) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/proyectos_bitacora`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: RECORD_ID, data: projects, updated_at: new Date().toISOString() })
    });
  } catch { /* guardado local como fallback */ }
}
