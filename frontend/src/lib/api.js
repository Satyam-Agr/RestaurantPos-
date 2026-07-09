import axios from "axios";
import { logError, logInfo } from "./debugStore";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Read the freshest customer token from localStorage on every request
const readCustomerToken = () => {
  try {
    const raw = localStorage.getItem("trattoria_customer");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.customerToken || null;
  } catch {
    return null;
  }
};

// Attach the right token per endpoint
api.interceptors.request.use((config) => {
  const url = config.url || "";
  const staffToken = localStorage.getItem("staff_token");
  const customerToken = readCustomerToken();

  // Staff endpoints
  if (
    staffToken &&
    (url.includes("/waiter/") ||
      url.includes("/kitchen/") ||
      url.includes("/cashier/") ||
      url.includes("/bills") ||
      url.includes("/admin/") ||
      url.includes("/staff/me"))
  ) {
    config.headers.Authorization = `Bearer ${staffToken}`;
    logInfo("api", `→ auth: staff token attached (${url})`);
  }
  // Customer session create/join AND customer identity endpoints require Bearer <customerToken>
  else if (
    /\/api\/sessions\/(create|join)\//.test(url) ||
    /\/api\/customers\/(me|logout)/.test(url)
  ) {
    if (customerToken) {
      config.headers.Authorization = `Bearer ${customerToken}`;
      logInfo("api", `→ auth: customer token attached (${url})`);
    } else {
      logError("api", `→ auth: NO customer token in localStorage for ${url}`);
    }
  }

  logInfo("api", `${config.method?.toUpperCase()} ${url}`);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    let backendMsg;
    if (err.response) {
      backendMsg =
        err.response.data?.message ||
        err.response.data?.error ||
        err.message ||
        "Request failed";
    } else if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
      // Browser couldn't reach the server at all — CORS block or server down
      backendMsg = `Cannot reach backend at ${BASE_URL}. Check that (1) the Spring Boot server is running on port 8080, (2) it binds to 0.0.0.0 (not just 127.0.0.1), and (3) CORS allows origin ${window.location.origin}.`;
    } else if (err.code === "ECONNABORTED") {
      backendMsg = `Request timed out (${BASE_URL}).`;
    } else {
      backendMsg = err.message || "Request failed";
    }
    logError(
      "api",
      `${status || err.code || "ERR"} ${err.config?.url || ""} — ${backendMsg}`,
      err.response?.data
    );
    return Promise.reject({ status, message: backendMsg, raw: err.response?.data });
  }
);

export const API_BASE_URL = BASE_URL;

// ---------- Endpoint helpers ----------

// Public
export const getMenu = () => api.get("/api/menu").then((r) => r.data);

// Customer identity
export const customerLogin = (phoneNumber) =>
  api.post("/api/customers/login", { phoneNumber }).then((r) => r.data);

export const customerLogout = () =>
  api.post("/api/customers/logout").then((r) => r.data);

// Customer's current session (resume flow)
export const getMySession = () =>
  api.get("/api/customers/me/session").then((r) => r.data);

// Leave the current table
export const leaveTable = () =>
  api.post("/api/customers/me/session/leave").then((r) => r.data);

export const getSessionStatus = (qrToken) =>
  api.get(`/api/sessions/status/${qrToken}`).then((r) => r.data);
export const createSession = (qrToken) =>
  api.post(`/api/sessions/create/${qrToken}`).then((r) => r.data);
export const joinSession = (qrToken, pin) =>
  api.post(`/api/sessions/join/${qrToken}`, { pin }).then((r) => r.data);

// Cart
export const getCart = (sessionToken) =>
  api.get(`/api/cart/${sessionToken}`).then((r) => r.data);
export const addCartItem = (sessionToken, body) =>
  api.post(`/api/cart/${sessionToken}/items`, body).then((r) => r.data);
export const updateCartItem = (sessionToken, itemId, body) =>
  api.patch(`/api/cart/${sessionToken}/items/${itemId}`, body).then((r) => r.data);
export const removeCartItem = (sessionToken, itemId) =>
  api.delete(`/api/cart/${sessionToken}/items/${itemId}`).then((r) => r.data);
export const submitCart = (sessionToken) =>
  api.post(`/api/cart/${sessionToken}/submit`).then((r) => r.data);

// Orders
export const getSessionOrders = (sessionToken) =>
  api.get(`/api/sessions/${sessionToken}/orders`).then((r) => r.data);
export const getOrder = (orderId) =>
  api.get(`/api/orders/${orderId}`).then((r) => r.data);
export const requestBill = (sessionToken) =>
  api.post(`/api/orders/bill-request/${sessionToken}`).then((r) => r.data);

// Auth
export const login = (username, password) =>
  api.post("/api/auth/login", { username, password }).then((r) => r.data);

// Waiter
export const waiterTablesList = () => api.get("/api/waiter/tables").then((r) => r.data);
export const waiterTableDetail = (tableId) =>
  api.get(`/api/waiter/tables/${tableId}`).then((r) => r.data);
export const waiterStartTableSession = (tableId) =>
  api.post(`/api/waiter/tables/${tableId}/session`).then((r) => r.data);
export const waiterPlaceOrder = (tableId, items) =>
  api.post(`/api/waiter/tables/${tableId}/orders`, { items }).then((r) => r.data);
export const waiterRequestBillForTable = (tableId) =>
  api.post(`/api/waiter/tables/${tableId}/request-bill`).then((r) => r.data);
export const waiterPending = () => api.get("/api/waiter/orders/pending").then((r) => r.data);
export const waiterReady = () => api.get("/api/waiter/orders/ready-to-serve").then((r) => r.data);
export const waiterConfirm = (orderId) =>
  api.patch(`/api/waiter/orders/${orderId}/confirm`).then((r) => r.data);
export const waiterServeItem = (itemId) =>
  api.patch(`/api/waiter/order-items/${itemId}/serve`).then((r) => r.data);
export const waiterRemoveItem = (orderId, itemId) =>
  api.delete(`/api/waiter/orders/${orderId}/items/${itemId}`).then((r) => r.data);
export const waiterUpdateItem = (orderId, itemId, body) =>
  api.patch(`/api/waiter/orders/${orderId}/items/${itemId}`, body).then((r) => r.data);

// Kitchen
export const kitchenQueue = () => api.get("/api/kitchen/queue").then((r) => r.data);
export const kitchenSetItemStatus = (itemId, itemStatus) =>
  api
    .patch(`/api/kitchen/order-items/${itemId}/status`, { itemStatus })
    .then((r) => r.data);

// Cashier
export const cashierTablesList = () => api.get("/api/cashier/tables").then((r) => r.data);
export const cashierTableDetail = (tableId) =>
  api.get(`/api/cashier/tables/${tableId}`).then((r) => r.data);
export const cashierRequested = () =>
  api.get("/api/bills/requested").then((r) => r.data);
export const cashierPending = () => api.get("/api/bills/pending").then((r) => r.data);
export const revertBillRequest = (sessionId) =>
  api.patch(`/api/bills/${sessionId}/revert`).then((r) => r.data);
export const generateBill = (sessionId, body) =>
  api.post(`/api/bills/${sessionId}/generate`, body).then((r) => r.data);
export const payBill = (billId, paymentMethod) =>
  api.patch(`/api/bills/${billId}/pay`, { paymentMethod }).then((r) => r.data);

// ---------- Staff profile (universal) ----------
export const getMyProfile = () => api.get("/api/staff/me").then((r) => r.data);
export const updateMyProfile = (body) => api.patch("/api/staff/me", body).then((r) => r.data);
export const changeMyPassword = (body) =>
  api.patch("/api/staff/me/password", body).then((r) => r.data);

// ---------- Admin ----------
export const adminMe = () => api.get("/api/admin/me").then((r) => r.data);
export const adminSetPin = (currentPassword, newPin) =>
  api.patch("/api/admin/me/pin", { currentPassword, newPin }).then((r) => r.data);

// Tables (admin variant + audit)
export const adminTablesList = (params) =>
  api.get("/api/admin/tables", { params }).then((r) => r.data);
export const adminTableDetail = (tableId) =>
  api.get(`/api/admin/tables/${tableId}`).then((r) => r.data);
export const adminFreeSession = (tableId, pin) =>
  api.post(`/api/admin/tables/${tableId}/free-session`, { pin }).then((r) => r.data);
export const adminRevealParticipants = (tableId, pin) =>
  api.post(`/api/admin/tables/${tableId}/reveal-participants`, { pin }).then((r) => r.data);
export const adminOrderHistory = (orderId) =>
  api.get(`/api/admin/orders/${orderId}/history`).then((r) => r.data);

// Table roster
export const adminTablesRoster = () =>
  api.get("/api/admin/tables/roster").then((r) => r.data);
export const adminCreateTable = (tableNumber) =>
  api.post("/api/admin/tables", { tableNumber }).then((r) => r.data);
export const adminUpdateTable = (tableId, body) =>
  api.patch(`/api/admin/tables/${tableId}`, body).then((r) => r.data);

// Staff
export const adminStaffList = () => api.get("/api/admin/staff").then((r) => r.data);
export const adminCreateStaff = (body) =>
  api.post("/api/admin/staff", body).then((r) => r.data);
export const adminUpdateStaff = (staffId, body) =>
  api.patch(`/api/admin/staff/${staffId}`, body).then((r) => r.data);

// Menu
export const adminMenuCategories = () =>
  api.get("/api/admin/menu/categories").then((r) => r.data);
export const adminCreateCategory = (body) =>
  api.post("/api/admin/menu/categories", body).then((r) => r.data);
export const adminUpdateCategory = (id, body) =>
  api.patch(`/api/admin/menu/categories/${id}`, body).then((r) => r.data);
export const adminDeleteCategory = (id) =>
  api.delete(`/api/admin/menu/categories/${id}`).then((r) => r.data);
export const adminMenuItems = () =>
  api.get("/api/admin/menu/items").then((r) => r.data);
export const adminCreateItem = (body) =>
  api.post("/api/admin/menu/items", body).then((r) => r.data);
export const adminUpdateItem = (id, body) =>
  api.patch(`/api/admin/menu/items/${id}`, body).then((r) => r.data);
export const adminDeleteItem = (id) =>
  api.delete(`/api/admin/menu/items/${id}`).then((r) => r.data);

// Bills history
export const adminBills = (params) =>
  api.get("/api/admin/bills", { params }).then((r) => r.data);

// Analytics
export const adminRevenue = (params) =>
  api.get("/api/admin/analytics/revenue", { params }).then((r) => r.data);
export const adminTopItems = (params) =>
  api.get("/api/admin/analytics/top-items", { params }).then((r) => r.data);
export const adminTiming = (params) =>
  api.get("/api/admin/analytics/timing", { params }).then((r) => r.data);
