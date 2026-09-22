// ============================================================
// STATE MANAGEMENT (API-backed)
// Replaces the original localStorage/DEFAULT_DATA approach.
// `state` keeps the exact same shape the legacy render functions
// expect (state.leads, state.approvals, ...), but the arrays are
// now populated from the backend on login/refresh, and the key
// mutating actions write through to the API before updating state.
// ============================================================

let state = {
  user: { name: '', role: '', email: '' },
  finView: 'landing',
  constrProject: 'site-a',
  approvalCounter: 0,
};

/**
 * Normalizes a backend record so legacy render code (which expects
 * `id` to be the human-readable business code, e.g. 'APR-001') keeps
 * working unmodified. The real database UUID is preserved as `_dbId`
 * for any code that needs to call the API (approve/reject/patch/etc).
 */
function normalize(record) {
  if (!record || typeof record !== 'object') return record;
  const out = { ...record };
  out._dbId = record.id;
  if (record.code) out.id = record.code;
  return out;
}
function normalizeAll(list) { return (list || []).map(normalize); }

function formatDate(iso) {
  try { return new Date(iso).toLocaleString('en-IN'); } catch (e) { return iso; }
}

/** Maps the bootstrap payload onto the exact field names the legacy UI reads. */
function applyBootstrap(data) {
  state.approvals = normalizeAll(data.approvals).map((a) => ({ ...a, raised: a.raisedBy }));
  state.approvalCounter = state.approvals.filter((a) => a.status === 'pending').length;
  state.leads = normalizeAll(data.leads);
  state.followups = normalizeAll(data.followups);
  state.units = normalizeAll(data.units);
  state.customers = normalizeAll(data.customers);
  state.bookings = normalizeAll(data.bookings);
  state.collections = normalizeAll(data.collections);
  state.transactions = normalizeAll(data.transactions);
  state.vendors = normalizeAll(data.vendors);
  state.employees = normalizeAll(data.employees);
  state.tasks = normalizeAll(data.tasks);
  state.notifications = normalizeAll(data.notifications).map((n) => ({ ...n, time: n.time || formatDate(n.createdAt) }));
  state.dprRecords = normalizeAll(data.dprRecords);
  state.boqData = normalizeAll(data.boqData);
  state.materialData = normalizeAll(data.materialData);
  state.progressData = normalizeAll(data.progressData);
  state.issues = normalizeAll(data.issues);
  state.collectionAgent = normalizeAll(data.collectionAgent);
  state.aiLogs = normalizeAll(data.aiLogs);
  state.auditLog = normalizeAll(data.auditLog).map((a) => ({ ...a, dt: a.dt || formatDate(a.createdAt) }));
  state.portfolio = normalizeAll(data.portfolio);
  state.bankAccounts = normalizeAll(data.bankAccounts);
  state.reraAccounts = normalizeAll(data.reraAccounts);

  const projects = normalizeAll(data.projects);
  state.projects = projects;
  window.PROJ_KPIS_LIVE = projects.reduce((acc, p) => {
    acc[p.code] = {
      physical: p.physicalPct, financial: p.financialPct, manpower: p.manpower,
      delayed: p.delayedTasks, safety: p.safetyScore, quality: p.qualityScore,
      contractors: p.contractors, issues: p.openIssues,
    };
    return acc;
  }, {});
  if (typeof PROJ_KPIS === 'object') Object.assign(PROJ_KPIS, window.PROJ_KPIS_LIVE);
}

/** Loads (or reloads) all tenant data from the backend. Call after login and after any write you want reflected everywhere. */
async function loadState() {
  const tenant = MavixAPI.getStoredTenant();
  const user = MavixAPI.getStoredUser();
  state.user = {
    name: user ? user.name : '',
    role: user ? prettyRole(user.role) : '',
    email: user ? user.email : '',
  };
  state.tenant = tenant;

  const res = await MavixAPI.get('/bootstrap');
  applyBootstrap(res.data);
}

function prettyRole(role) {
  const map = {
    SUPER_ADMIN: 'Super Admin', MANAGING_DIRECTOR: 'Managing Director', CFO: 'CFO',
    PROJECT_DIRECTOR: 'Project Director', SALES_HEAD: 'Sales Head', PROJECT_MANAGER: 'Project Manager',
    ACCOUNTS_MANAGER: 'Accounts Manager', CRM_MANAGER: 'CRM Manager', SITE_ENGINEER: 'Site Engineer',
    EMPLOYEE: 'Employee',
  };
  return map[role] || role;
}

/**
 * saveState is kept as a no-op shim so any legacy render code that still
 * calls it (mostly for UI-only fields like finView/constrProject) doesn't
 * throw. Real persistence now happens via explicit API calls in the
 * functions that mutate data — see app-legacy.js for the write-through
 * versions of approveItem, submitLead, resolveIssue, etc.
 */
function saveState() { /* no-op: server is now the source of truth */ }
