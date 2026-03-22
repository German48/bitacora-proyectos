// Configuración Supabase
const SUPABASE_URL = 'https://orypvcwpeomplyhqwzdh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BaoQp9hf2xoEc5fUKGAXTA_xcvZmAIt';
const RECORD_ID = 'bitacora-main';
const SYNC_INTERVAL_MS = 30000; // 30 segundos

async function sbLoad() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/proyectos_bitacora?id=eq.${RECORD_ID}&select=data,updated_at`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    if (rows && rows.length > 0) return rows[0];
    return null;
  } catch { return null; }
}

async function sbSave(projects) {
  sbSetSyncStatus('saving');
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
    sbSetSyncStatus('ok');
  } catch {
    sbSetSyncStatus('error');
  }
}

// Indicador visual de sincronización
function sbSetSyncStatus(status) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  el.dataset.status = status;
  el.title = status === 'saving' ? 'Guardando...' : status === 'ok' ? 'Sincronizado' : 'Error al sincronizar';
}

// Auto-sync periódico: descarga cambios remotos
let sbLastUpdatedAt = null;

async function sbAutoSync(onUpdate) {
  try {
    sbSetSyncStatus('saving');
    const row = await sbLoad();
    if (!row) { sbSetSyncStatus('error'); return; }
    // Solo actualiza si hay cambios remotos más recientes
    if (row.updated_at && row.updated_at !== sbLastUpdatedAt) {
      sbLastUpdatedAt = row.updated_at;
      if (Array.isArray(row.data) && row.data.length > 0) {
        onUpdate(row.data);
      }
    }
    sbSetSyncStatus('ok');
  } catch {
    sbSetSyncStatus('error');
  }
}

function sbStartAutoSync(onUpdate) {
  setInterval(() => sbAutoSync(onUpdate), SYNC_INTERVAL_MS);
}
