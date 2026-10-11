import AdminActivity from "./models/AdminActivity.js";

// Short, readable reference used across the site for orders.
export const orderRef = (id) => `#${String(id).slice(-8).toUpperCase()}`;

export const money = (amount, currency = "sgd") => {
  try {
    return new Intl.NumberFormat("en-SG", { style: "currency", currency: currency.toUpperCase() }).format(amount);
  } catch (error) {
    return `$${Number(amount).toFixed(2)}`;
  }
};

// Records an admin action. Never fails the request it belongs to: a problem
// saving the record is only logged.
export const logActivity = async (req, action, summary) => {
  try {
    await AdminActivity.create({ by: req.user, action, summary: String(summary).slice(0, 300) });
  } catch (error) {
    console.error("Couldn't record admin activity:", error?.message);
  }
};
