export const formatMoney = (amount, currency = "sgd") => {
  try {
    return new Intl.NumberFormat("en-SG", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch (error) {
    return `$${Number(amount).toFixed(2)}`;
  }
};

export const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// Short, readable order reference from a MongoDB id.
export const orderNumber = (id) => String(id).slice(-8).toUpperCase();

export const STATUS_LABELS = {
  pending: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Turns an axios error into a message the user can read. The API returns
// either a string or a list of { msg } objects in `error`.
export const errorMessage = (error, fallback = "Something went wrong") => {
  const apiError = error?.response?.data?.error;
  if (Array.isArray(apiError) && apiError.length) {
    return apiError.map((e) => e.msg || e.message).join(", ");
  }
  if (typeof apiError === "string" && apiError) return apiError;
  if (error?.request && !error?.response) return "Can't reach the server";
  return fallback;
};
