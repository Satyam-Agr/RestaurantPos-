// Restaurant-wide default values for bill generation.
// Cashier can override in the UI at bill-generation time.
// Change these to reflect your restaurant's policy.

export const BILL_DEFAULTS = {
  taxRatePercent: 5, // 5% GST default
  discount: 0, // No discount by default
};

// Validation bounds for cashier-entered overrides
export const BILL_LIMITS = {
  taxRatePercent: { min: 0, max: 30 }, // 0% to 30% max
  discount: { min: 0 }, // discount cannot be negative; upper bound is checked against subtotal at submit time
};
