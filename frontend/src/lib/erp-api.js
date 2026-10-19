// Decorous ERP — API client (reuses REACT_APP_BACKEND_URL)
import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";

const TOKEN_KEY = "erp_token";
const USER_KEY = "erp_user";

export const erpAuth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get user() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set(payload) {
    localStorage.setItem(TOKEN_KEY, payload.access_token);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        user_id: payload.user_id,
        org_id: payload.org_id,
        role: payload.role,
        email: payload.email,
        full_name: payload.full_name,
      }),
    );
  },
  /** Update the cached user (e.g. after /me says the role changed). */
  update(patch) {
    const u = this.user;
    if (u) localStorage.setItem(USER_KEY, JSON.stringify({ ...u, ...patch }));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const client = axios.create({ baseURL: BASE });

client.interceptors.request.use((config) => {
  const t = erpAuth.token;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      erpAuth.clear();
      if (!window.location.pathname.startsWith("/erp/login")) {
        window.location.href = "/erp/login";
      }
    }
    return Promise.reject(err);
  },
);

// An idempotency key identifies ONE user intent. Callers create it when the form
// opens (newKey()) and pass it on every attempt, so a retry after a flaky network
// is recognised by the server instead of creating a duplicate record.
export function newKey() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 12) +
    Math.random().toString(36).slice(2, 8)
  );
}

const idem = (key) => ({ headers: { "Idempotency-Key": key || newKey() } });
const get = (url, params) => client.get(url, { params }).then((r) => r.data);
const post = (url, body, key) =>
  client.post(url, body ?? null, key === false ? undefined : idem(key)).then((r) => r.data);
const patch = (url, body) => client.patch(url, body).then((r) => r.data);
const put = (url, body) => client.put(url, body).then((r) => r.data);

export const erpApi = {
  // auth
  signup: (data) => client.post("/api/erp/auth/signup", data).then((r) => r.data),
  login: (data) => client.post("/api/erp/auth/login", data).then((r) => r.data),
  me: () => get("/api/erp/me"),

  // overview + dashboards
  overview: () => get("/api/erp/overview"),
  dashboardProjects: () => get("/api/erp/dashboard/projects"),
  dashboardProject: (id) => get(`/api/erp/dashboard/projects/${id}`),
  activity: (limit = 20) => get("/api/erp/dashboard/activity", { limit }),

  // projects
  listProjects: () => get("/api/erp/projects"),
  getProject: (id) => get(`/api/erp/projects/${id}`),
  createProject: (body) => post("/api/erp/projects", body, false),
  updateProject: (id, body) => patch(`/api/erp/projects/${id}`, body),

  // vendors (+ what we owe them)
  listVendors: (params) => get("/api/erp/vendors", params),
  createVendor: (body) => post("/api/erp/vendors", body, false),
  updateVendor: (id, body) => patch(`/api/erp/vendors/${id}`, body),
  vendorBalances: () => get("/api/erp/vendors/balances"),
  vendorStatement: (id) => get(`/api/erp/vendors/${id}/statement`),
  listBills: (params) => get("/api/erp/vendor-bills", params),
  createBill: (body, key) => post("/api/erp/vendor-bills", body, key),
  listVendorPayments: (params) => get("/api/erp/vendor-payments", params),
  createVendorPayment: (body, key) => post("/api/erp/vendor-payments", body, key),

  // materials + stock
  listMaterials: (params) => get("/api/erp/materials", params),
  createMaterial: (body) => post("/api/erp/materials", body, false),
  updateMaterial: (id, body) => patch(`/api/erp/materials/${id}`, body),
  listGrns: (params) => get("/api/erp/grns", params),
  createGrn: (body, key) => post("/api/erp/grns", body, key),
  stock: (params) => get("/api/erp/stock", params),
  listIssues: (params) => get("/api/erp/stock/issues", params),
  createIssue: (body, key) => post("/api/erp/stock/issues", body, key),

  // labour
  listWorkers: (params) => get("/api/erp/workers", params),
  createWorker: (body) => post("/api/erp/workers", body, false),
  updateWorker: (id, body) => patch(`/api/erp/workers/${id}`, body),
  workerStatement: (id, params) => get(`/api/erp/workers/${id}/statement`, params),
  roster: (project_id, date) => get("/api/erp/attendance/roster", { project_id, date }),
  listAttendance: (params) => get("/api/erp/attendance", params),
  saveAttendance: (body) => put("/api/erp/attendance", body),
  submitAttendance: (id, key) => post(`/api/erp/attendance/${id}/submit`, null, key),
  listWorkerPayments: (params) => get("/api/erp/worker-payments", params),
  createWorkerPayment: (body, key) => post("/api/erp/worker-payments", body, key),

  // DPR
  listDpr: (params) => get("/api/erp/dpr", params),
  createDpr: (body, key) => post("/api/erp/dpr", body, key),
  submitDpr: (id, key) => post(`/api/erp/dpr/${id}/submit`, null, key),

  // expenses
  listExpenses: (params) => get("/api/erp/expenses", params),
  createExpense: (body, key) => post("/api/erp/expenses", body, key),
  submitExpense: (id, key) => post(`/api/erp/expenses/${id}/submit`, null, key),

  // approvals
  listPendingApprovals: (params) => get("/api/erp/approvals/pending", params),
  approvalHistory: (params) => get("/api/erp/approvals/history", params),
  getApproval: (id) => get(`/api/erp/approvals/${id}`),
  decideApproval: (id, body) => client.post(`/api/erp/approvals/${id}/decide`, body).then((r) => r.data),

  // org + users
  getMyOrg: () => get("/api/erp/orgs/me"),
  listMembers: () => get("/api/erp/users"),
  inviteMember: (body) => client.post("/api/erp/users/invite", body).then((r) => r.data),
  updateMember: (id, body) => patch(`/api/erp/users/${id}`, body),
  setPin: (pin) => client.post("/api/erp/users/pin", { pin }).then((r) => r.data),

  // uploads (inline, stored server-side; the old presign stub discarded files and is gone)
  uploadInline: (body) => client.post("/api/erp/uploads/inline", body).then((r) => r.data),
  getUpload: (key) => get(`/api/erp/uploads/${encodeURIComponent(key)}`),
};

export function formatPaise(paise) {
  if (paise == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(paise) / 100);
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Today's calendar date in India (YYYY-MM-DD) — never the browser's UTC date. */
export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/**
 * "1,234.5" → 123450 paise. Parsed from the STRING so float error can't creep in
 * (1.005 * 100 === 100.49999999999999). Returns null for anything that isn't a
 * non-negative amount with at most two decimals.
 */
export function toPaise(input) {
  const t = String(input ?? "").replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

/** "12.5" → 12500 milli-units. At most three decimals; null if invalid. */
export function toMilli(input) {
  const t = String(input ?? "").replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{0,3})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  return Number(whole) * 1000 + Number((frac + "000").slice(0, 3));
}

/** Integer milli-units (12500) → "12.5". */
export function formatQty(milli) {
  if (milli == null) return "—";
  return (Number(milli) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

/** Whole-number rupees with Indian grouping and no symbol: 123450 paise → "1,234.50". */
export function formatRupees(paise) {
  if (paise == null) return "—";
  return (Number(paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Client-side resize + JPEG compress, returning base64 (no data: prefix).
 * Keeps DPR/expense photos small enough to store inline in Mongo.
 */
export async function fileToCompressedBase64(file, { maxDim = 1280, quality = 0.72 } = {}) {
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const jpeg = canvas.toDataURL("image/jpeg", quality);
  return jpeg.split(",")[1]; // strip "data:image/jpeg;base64,"
}
