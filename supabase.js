// Configuración Supabase
const SUPABASE_URL = 'https://orypvcwpeomplyhqwzdh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BaoQp9hf2xoEc5fUKGAXTA_xcvZmAIt';
const SYNC_INTERVAL_MS = 30000; // 30 segundos
const SESSION_KEY = 'bitacora-session';

// ──────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────

function sbGetSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function sbSaveSession(data) {
  // data: { access_token, refresh_token, user, expires_in }
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user?.id || data.user_id,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function sbClearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function sbIsTokenExpired(session) {
  if (!session || !session.expires_at) return true;
  return Date.now() >= session.expires_at - 60000; // 1min de margen
}

async function sbRefreshSession() {
  const session = sbGetSession();
  if (!session?.refresh_token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!res.ok) { sbClearSession(); return null; }
    const data = await res.json();
    return sbSaveSession(data);
  } catch { return null; }
}

async function sbGetValidSession() {
  let session = sbGetSession();
  if (!session) return null;
  if (sbIsTokenExpired(session)) {
    session = await sbRefreshSession();
  }
  return session;
}

async function sbSignIn(email, pass) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password: pass })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Error al iniciar sesión');
  return sbSaveSession(data);
}

async function sbSignUp(email, pass) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password: pass })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Error al registrarse');
  // Si requiere confirmación de email, access_token puede no estar presente
  if (data.access_token) {
    return sbSaveSession(data);
  }
  // Devolver indicación de que hay que confirmar email
  return { needsConfirmation: true };
}

function sbSignInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
}

async function sbHandleOAuthCallback() {
  // Supabase redirige con el token en el hash: #access_token=...&refresh_token=...
  const hash = window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace('#', ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const expires_in = params.get('expires_in');
  if (!access_token) return null;
  // Obtener datos del usuario
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${access_token}` }
    });
    const user = await res.json();
    const session = sbSaveSession({ access_token, refresh_token, expires_in: Number(expires_in) || 3600, user });
    // Limpiar el hash de la URL sin recargar
    history.replaceState(null, '', window.location.pathname);
    return session;
  } catch { return null; }
}

async function sbSignOut() {
  const session = sbGetSession();
  if (session?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`
        }
      });
    } catch { /* ignorar errores de red al cerrar sesión */ }
  }
  sbClearSession();
}

// ──────────────────────────────────────────────
// DATA (usa user_id como RECORD_ID)
// ──────────────────────────────────────────────

async function sbLoad() {
  const session = await sbGetValidSession();
  if (!session) return null;
  const recordId = session.user_id;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/proyectos_bitacora?id=eq.${recordId}&select=data,updated_at`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`
        }
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (rows && rows.length > 0) return rows[0];
    return null;
  } catch { return null; }
}

async function sbSave(projects) {
  sbSetSyncStatus('saving');
  const session = await sbGetValidSession();
  if (!session) { sbSetSyncStatus('error'); return; }
  const recordId = session.user_id;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/proyectos_bitacora`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: recordId,
        user_id: recordId,
        data: projects,
        updated_at: new Date().toISOString()
      })
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

// Auto-sync periódico
let sbLastUpdatedAt = null;

async function sbAutoSync(onUpdate) {
  try {
    sbSetSyncStatus('saving');
    const row = await sbLoad();
    if (!row) { sbSetSyncStatus('error'); return; }
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
