// LocalStorage helpers for customer session persistence
const SESSION_KEY = "trattoria_session";
const CUSTOMER_KEY = "trattoria_customer";
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

export const clearSession = () => localStorage.removeItem(SESSION_KEY);

// --- Customer identity (30-day cached) ---
export const saveCustomer = ({ customerToken, customerId, phoneNumber }) => {
  localStorage.setItem(
    CUSTOMER_KEY,
    JSON.stringify({
      customerToken,
      customerId,
      phoneNumber,
      savedAt: Date.now(),
    })
  );
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
