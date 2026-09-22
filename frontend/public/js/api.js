// ============================================================
// API CLIENT
// Talks to the MAVIX Estate Command backend. All tenant scoping
// happens server-side based on the JWT — this file never needs
// to know about tenant IDs beyond the slug used to log in.
// ============================================================
(function (global) {
  // Resolve API base at runtime: same-origin "/api" in production behind
  // the nginx reverse proxy, override via window.MAVIX_API_BASE for local dev.
  const API_BASE = global.MAVIX_API_BASE || '/api';

  const STORAGE_KEYS = {
    access: 'mavix_access_token',
    refresh: 'mavix_refresh_token',
    tenantSlug: 'mavix_tenant_slug',
    user: 'mavix_user',
    tenant: 'mavix_tenant',
  };

  function getAccessToken() { return localStorage.getItem(STORAGE_KEYS.access); }
  function getRefreshToken() { return localStorage.getItem(STORAGE_KEYS.refresh); }
  function getTenantSlug() { return localStorage.getItem(STORAGE_KEYS.tenantSlug); }
  function getStoredUser() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null'); } catch (e) { return null; }
  }
  function getStoredTenant() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.tenant) || 'null'); } catch (e) { return null; }
  }

  function setSession({ accessToken, refreshToken, user, tenant }) {
    localStorage.setItem(STORAGE_KEYS.access, accessToken);
    localStorage.setItem(STORAGE_KEYS.refresh, refreshToken);
    localStorage.setItem(STORAGE_KEYS.tenantSlug, tenant.slug);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.tenant, JSON.stringify(tenant));
  }

  function clearSession() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  }

  function isAuthenticated() { return !!getAccessToken(); }

  let refreshInFlight = null;

  async function refreshAccessToken() {
    if (refreshInFlight) return refreshInFlight;
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Refresh failed');
        const json = await res.json();
        localStorage.setItem(STORAGE_KEYS.access, json.data.accessToken);
        localStorage.setItem(STORAGE_KEYS.refresh, json.data.refreshToken);
        return json.data.accessToken;
      })
      .finally(() => { refreshInFlight = null; });

    return refreshInFlight;
  }

  /**
   * Core request helper: adds auth header, retries once on 401 after
   * refreshing the access token, and throws ApiError with server details.
   */
  async function request(path, { method = 'GET', body, retry = true } = {}) {
    const token = getAccessToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && retry && getRefreshToken()) {
      try {
        await refreshAccessToken();
        return request(path, { method, body, retry: false });
      } catch (e) {
        clearSession();
        global.location.reload();
        throw e;
      }
    }

    if (res.status === 204) return null;

    let json = null;
    try { json = await res.json(); } catch (e) { /* no body */ }

    if (!res.ok) {
      const message = (json && json.error && json.error.message) || res.statusText;
      const err = new Error(message);
      err.status = res.status;
      err.details = json && json.error && json.error.details;
      throw err;
    }
    return json;
  }

  const api = {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    del: (path) => request(path, { method: 'DELETE' }),

    async login(tenantSlug, email, password) {
      const json = await request('/auth/login', { method: 'POST', body: { tenantSlug, email, password }, retry: false });
      setSession(json.data);
      return json.data;
    },
    async signup(companyName, slug, adminName, email, password) {
      const json = await request('/auth/signup', {
        method: 'POST',
        body: { companyName, slug, adminName, email, password },
        retry: false,
      });
      setSession(json.data);
      return json.data;
    },
    async logout() {
      const refreshToken = getRefreshToken();
      try { await request('/auth/logout', { method: 'POST', body: { refreshToken } }); } catch (e) { /* ignore */ }
      clearSession();
    },

    isAuthenticated,
    getStoredUser,
    getStoredTenant,
    getTenantSlug,
  };

  global.MavixAPI = api;
})(window);
