import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import Order from "../models/Order.js";
import stripe, {
  ensureStripeCustomer,
  isStripeConfigured,
  paymentErrorResponse,
  paymentsNotConfigured,
} from "../stripe.js";
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

const MAX_ADDRESSES = 10;

const ADDRESS_FIELDS = [
  "label",
  "fullName",
  "line1",
  "line2",
  "city",
  "state",
  "postalCode",
  "country",
  "phone",
  "isDefault",
];

// Every account route needs the logged-in user's document.
const loadUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user });
    if (!user) {
      return res.status(401).json({ data: "", error: "Unauthorized" });
    }
    req.account = user;
    next();
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
};

router.use(checkAuth, loadUser);

const addressValidators = (optional) => {
  const field = (name) => (optional ? body(name).optional() : body(name));
  return [
    body("label").optional().isString().trim().isLength({ max: 40 }),
    field("fullName")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Full name is required"),
    field("line1")
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Address line 1 is required"),
    body("line2").optional().isString().trim().isLength({ max: 200 }),
    field("city")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("City is required"),
    body("state").optional().isString().trim().isLength({ max: 100 }),
    field("postalCode")
      .isString()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage("Postal code is required"),
    field("country")
      .isString()
      .trim()
      .matches(/^[A-Za-z]{2}$/)
      .withMessage("Country must be a 2-letter code, e.g. SG"),
    body("phone").optional().isString().trim().isLength({ max: 30 }),
    body("isDefault").optional().isBoolean().toBoolean(),
  ];
};

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      data: "",
      error: errors.array().map((error) => ({ msg: error.msg })),
    });
  }
  next();
};

const pickAddressFields = (source) => {
  const address = {};
  for (const field of ADDRESS_FIELDS) {
    if (source[field] !== undefined) address[field] = source[field];
  }
  return address;
};

// Exactly one address is the default whenever the user has any.
const normaliseDefault = (user, preferredId) => {
  const { addresses } = user;
  if (addresses.length === 0) return;
  const preferred = preferredId && addresses.id(preferredId);
  const current = preferred || addresses.find((a) => a.isDefault) || addresses[0];
  for (const address of addresses) {
    address.isDefault = address._id.equals(current._id);
  }
};

const addressesResponse = (res, user, status = 200) =>
  res.status(status).json({ data: user.addresses, error: "" });

// ACCOUNT OVERVIEW

router.get("/", (req, res) => {
  const { account } = req;
  return res.status(200).json({
    data: { id: account.id, email: account.email, addresses: account.addresses },
    error: "",
  });
});

// SAVED ADDRESSES

router.get("/addresses", (req, res) => addressesResponse(res, req.account));

router.post("/addresses", addressValidators(false), rejectInvalid, async (req, res) => {
  try {
    const user = req.account;
    if (user.addresses.length >= MAX_ADDRESSES) {
      return res.status(400).json({
        data: "",
        error: [{ msg: `You can save up to ${MAX_ADDRESSES} addresses` }],
      });
    }
    user.addresses.push(pickAddressFields(req.body));
    const added = user.addresses[user.addresses.length - 1];
    normaliseDefault(user, req.body.isDefault ? added._id : undefined);
    await user.save();
    return addressesResponse(res, user, 201);
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

router.put(
  "/addresses/:addressId",
  addressValidators(true),
  rejectInvalid,
  async (req, res) => {
    try {
      const user = req.account;
      const address = user.addresses.id(req.params.addressId);
      if (!address) {
        return res.status(404).json({ data: "", error: "Address not found" });
      }
      const { isDefault, ...fields } = pickAddressFields(req.body);
      address.set(fields);
      if (isDefault === true) {
        normaliseDefault(user, address._id);
      } else if (isDefault === false && address.isDefault) {
        // Hand the default to another address, if there is one.
        address.isDefault = false;
        const next = user.addresses.find((a) => !a._id.equals(address._id));
        normaliseDefault(user, next ? next._id : address._id);
      }
      await user.save();
      return addressesResponse(res, user);
    } catch (error) {
      return res.status(400).json({ data: "", error: error.message });
    }
  }
);

router.delete("/addresses/:addressId", async (req, res) => {
  try {
    const user = req.account;
    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ data: "", error: "Address not found" });
    }
    user.addresses.pull(address._id);
    normaliseDefault(user);
    await user.save();
    return addressesResponse(res, user);
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

// ORDER HISTORY

router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.account._id,
      status: { $ne: "pending" },
    }).sort({ createdAt: -1 });
    return res.status(200).json({ data: orders, error: "" });
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

// SAVED PAYMENT METHODS (stored in Stripe)

router.get("/payment-methods", async (req, res) => {
  try {
    const { stripeCustomerId } = req.account;
    if (!stripeCustomerId || !isStripeConfigured()) {
      return res.status(200).json({ data: [], error: "" });
    }
    const methods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });
    return res.status(200).json({
      data: methods.data.map((method) => ({
        id: method.id,
        brand: method.card?.brand,
        last4: method.card?.last4,
        expMonth: method.card?.exp_month,
        expYear: method.card?.exp_year,
      })),
      error: "",
    });
  } catch (error) {
    return paymentErrorResponse(res, error, "list saved cards");
  }
});

router.post("/payment-methods/setup-session", async (req, res) => {
  if (!isStripeConfigured()) return paymentsNotConfigured(res);
  try {
    const customerId = await ensureStripeCustomer(req.account);
    const returnUrl = `${process.env.BASE_URL}/account?tab=payments`;
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: returnUrl,
      cancel_url: returnUrl,
    });
    return res.status(200).json({ data: session.url, error: "" });
  } catch (error) {
    return paymentErrorResponse(res, error, "start adding a card");
  }
});

router.delete("/payment-methods/:paymentMethodId", async (req, res) => {
  try {
    const { stripeCustomerId } = req.account;
    const notFound = () =>
      res.status(404).json({ data: "", error: "Payment method not found" });
    if (!stripeCustomerId) return notFound();

    let method;
    try {
      method = await stripe.paymentMethods.retrieve(req.params.paymentMethodId);
    } catch (error) {
      return notFound();
    }
    // Only allow removing cards that belong to this user.
    if (method.customer !== stripeCustomerId) return notFound();

    await stripe.paymentMethods.detach(method.id);
    return res.status(200).json({ data: { id: method.id }, error: "" });
  } catch (error) {
    return paymentErrorResponse(res, error, "remove a card");
  }
});

export default router;
