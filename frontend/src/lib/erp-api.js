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

function ulid() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 12) +
    Math.random().toString(36).slice(2, 8)
  );
}

export const erpApi = {
  // auth
  signup: (data) => client.post("/api/erp/auth/signup", data).then((r) => r.data),
  login: (data) => client.post("/api/erp/auth/login", data).then((r) => r.data),
  me: () => client.get("/api/erp/me").then((r) => r.data),

  // overview
  overview: () => client.get("/api/erp/overview").then((r) => r.data),

  // projects
  listProjects: () => client.get("/api/erp/projects").then((r) => r.data),
  createProject: (body) =>
    client.post("/api/erp/projects", body).then((r) => r.data),

  // vendors
  listVendors: () => client.get("/api/erp/vendors").then((r) => r.data),
  createVendor: (body) =>
    client.post("/api/erp/vendors", body).then((r) => r.data),

  // materials
  listMaterials: () => client.get("/api/erp/materials").then((r) => r.data),
  createMaterial: (body) =>
    client.post("/api/erp/materials", body).then((r) => r.data),

  // DPR
  listDpr: () => client.get("/api/erp/dpr").then((r) => r.data),
  createDpr: (body) =>
    client
      .post("/api/erp/dpr", body, {
        headers: { "Idempotency-Key": ulid() },
      })
      .then((r) => r.data),
  submitDpr: (id) =>
    client
      .post(`/api/erp/dpr/${id}/submit`, null, {
        headers: { "Idempotency-Key": ulid() },
      })
      .then((r) => r.data),

  // expenses
  listExpenses: () => client.get("/api/erp/expenses").then((r) => r.data),
  createExpense: (body) =>
    client
      .post("/api/erp/expenses", body, {
        headers: { "Idempotency-Key": ulid() },
      })
      .then((r) => r.data),
  submitExpense: (id) =>
    client
      .post(`/api/erp/expenses/${id}/submit`, null, {
        headers: { "Idempotency-Key": ulid() },
      })
      .then((r) => r.data),

  // approvals
  listPendingApprovals: () =>
    client.get("/api/erp/approvals/pending").then((r) => r.data),
  decideApproval: (id, body) =>
    client.post(`/api/erp/approvals/${id}/decide`, body).then((r) => r.data),

  // org + users
  getMyOrg: () => client.get("/api/erp/orgs/me").then((r) => r.data),
  listMembers: () => client.get("/api/erp/users").then((r) => r.data),
  inviteMember: (body) =>
    client.post("/api/erp/users/invite", body).then((r) => r.data),
  setPin: (pin) => client.post("/api/erp/users/pin", { pin }).then((r) => r.data),

  // uploads
  presignUpload: (body) =>
    client.post("/api/erp/uploads/presign", body).then((r) => r.data),
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
