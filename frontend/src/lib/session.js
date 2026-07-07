// LocalStorage helpers for customer session persistence
const SESSION_KEY = "trattoria_session";
const CUSTOMER_KEY = "trattoria_customer";
const ORDER_IDS_KEY = "trattoria_order_ids";
const CUSTOMER_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// --- Session (per-table order list) ---
export const saveSession = (data) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));

export const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ORDER_IDS_KEY);
};

// --- Order IDs per session (used for reconciliation across refreshes) ---
export const loadOrderIds = () => {
  try {
    const raw = localStorage.getItem(ORDER_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOrderIds = (ids) => {
  localStorage.setItem(ORDER_IDS_KEY, JSON.stringify([...new Set(ids)]));
};

// --- Customer identity (30-day cached) ---
export const saveCustomer = (raw) => {
  // Accept multiple possible field names from the backend so a naming mismatch
  // (customerToken / token / accessToken / jwt) doesn't silently fail.
  const customerToken =
    raw?.customerToken || raw?.token || raw?.accessToken || raw?.jwt || null;
  const customerId = raw?.customerId ?? raw?.id ?? null;
  const phoneNumber = raw?.phoneNumber ?? raw?.phone ?? null;

  localStorage.setItem(
    CUSTOMER_KEY,
    JSON.stringify({
      customerToken,
      customerId,
      phoneNumber,
      savedAt: Date.now(),
    })
  );
  return { customerToken, customerId, phoneNumber };
};

export const loadCustomer = () => {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c?.customerToken || !c?.savedAt) return null;
    if (Date.now() - c.savedAt > CUSTOMER_TOKEN_TTL_MS) {
      localStorage.removeItem(CUSTOMER_KEY);
      return null;
    }
    return c;
  } catch {
    return null;
  }
};

export const clearCustomer = () => localStorage.removeItem(CUSTOMER_KEY);

export const getCustomerToken = () => loadCustomer()?.customerToken || null;
