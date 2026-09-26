import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createApp,
  createUser,
  tokenFor,
  stubStripe,
} from "./helpers.js";

describe("checkout", () => {
  let app;
  let Product;
  let Order;
  let User;
  let fake;
  let shoes;
  let jacket;

  before(async () => {
    await setupDatabase();
    fake = await stubStripe();
    app = await createApp();
    ({ default: Product } = await import("../src/models/Product.js"));
    ({ default: Order } = await import("../src/models/Order.js"));
    ({ default: User } = await import("../src/models/User.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
    shoes = await Product.create({
      title: "Suede Loafers",
      image: "loafers-key",
      category: ["Men"],
      price: 250,
    });
    jacket = await Product.create({
      title: "Black Leather Jacket",
      image: "jacket-key",
      category: ["Men"],
      price: 299.99,
    });
  });

  const checkout = (body, token) => {
    const req = request(app).post("/checkout/create-checkout-session");
    if (token) req.set("Authorization", `Bearer ${token}`);
    return req.send(body);
  };

  describe("POST /checkout/create-checkout-session", () => {
    it("builds line items from database prices, ignoring client prices", async () => {
      const res = await checkout({
        items: [
          { productId: shoes.id, quantity: 2, size: "US 9", color: "Brown", price: 1 },
          { productId: jacket.id, quantity: 1, price: 0.01 },
        ],
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data, "https://checkout.stripe.com/c/pay/cs_test_1");

      const [params] = fake.calls["sessions.create"];
      assert.equal(params.mode, "payment");
      assert.deepEqual(
        params.line_items.map((li) => [li.quantity, li.price_data.unit_amount]),
        [
          [2, 25000],
          [1, 29999],
        ]
      );
      assert.equal(params.line_items[0].price_data.currency, "sgd");
      assert.equal(params.line_items[0].price_data.product_data.name, "Suede Loafers");
      assert.equal(
        params.line_items[0].price_data.product_data.description,
        "Size: US 9, Color: Brown"
      );
      const [image] = params.line_items[0].price_data.product_data.images;
      assert.ok(
        image.startsWith("https://test-bucket.s3.ap-southeast-1.amazonaws.com/loafers-key?"),
        image
      );
      assert.match(image, /X-Amz-Signature=/);
      assert.match(image, /X-Amz-Expires=86400/);
      assert.equal(
        params.success_url,
        "https://shop.example.com/success?session_id={CHECKOUT_SESSION_ID}"
      );
      assert.deepEqual(params.shipping_address_collection, {
        allowed_countries: ["SG"],
      });
    });

    it("creates a pending guest order linked to the session", async () => {
      const res = await checkout({ items: [{ productId: shoes.id, quantity: 3 }] });
      assert.equal(res.status, 200);

      const orders = await Order.find();
      assert.equal(orders.length, 1);
      const [order] = orders;
      assert.equal(order.status, "pending");
      assert.equal(order.user, undefined);
      assert.equal(order.stripeSessionId, "cs_test_1");
      assert.equal(order.subtotal, 750);
      assert.equal(order.items[0].title, "Suede Loafers");

      const [params] = fake.calls["sessions.create"];
      assert.equal(params.metadata.orderId, order.id);
      assert.equal(params.customer, undefined);
      assert.equal(fake.calls["customers.create"], undefined);
    });

    it("attaches logged-in users to a Stripe customer and enables saving cards", async () => {
      const user = await createUser({ email: "shopper@example.com" });
      const res = await checkout(
        { items: [{ productId: shoes.id, quantity: 1 }] },
        tokenFor(user.email)
      );
      assert.equal(res.status, 200);

      const saved = await User.findById(user.id);
      assert.equal(saved.stripeCustomerId, "cus_test_1");
      const [params] = fake.calls["sessions.create"];
      assert.equal(params.customer, "cus_test_1");
      assert.deepEqual(params.saved_payment_method_options, {
        payment_method_save: "enabled",
      });

      const order = await Order.findOne();
      assert.equal(order.user.toString(), user.id);
      assert.equal(order.email, "shopper@example.com");

      // A second checkout reuses the same customer.
      await checkout({ items: [{ productId: shoes.id, quantity: 1 }] }, tokenFor(user.email));
      assert.equal(fake.calls["customers.create"].length, 1);
    });

    it("pre-fills the shipping address from a saved address", async () => {
      const user = await createUser({ email: "shopper@example.com" });
      user.addresses.push({
        fullName: "Sam Tan",
        line1: "1 Orchard Road",
        city: "Singapore",
        postalCode: "238800",
        country: "SG",
      });
      await user.save();

      const res = await checkout(
        {
          items: [{ productId: shoes.id, quantity: 1 }],
          addressId: user.addresses[0].id,
        },
        tokenFor(user.email)
      );
      assert.equal(res.status, 200);
      const [[customerId, update]] = fake.calls["customers.update"];
      assert.equal(customerId, "cus_test_1");
      assert.equal(update.shipping.name, "Sam Tan");
      assert.equal(update.shipping.address.postal_code, "238800");
    });

    it("rejects another user's or a guest's address id", async () => {
      const res = await checkout({
        items: [{ productId: shoes.id, quantity: 1 }],
        addressId: new mongoose.Types.ObjectId().toString(),
      });
      assert.equal(res.status, 400);
      assert.equal(await Order.countDocuments(), 0);
    });

    it("treats an invalid token as a guest checkout", async () => {
      const res = await checkout(
        { items: [{ productId: shoes.id, quantity: 1 }] },
        "not-a-real-token"
      );
      assert.equal(res.status, 200);
      assert.equal((await Order.findOne()).user, undefined);
    });

    it("rejects empty carts, unknown products and bad quantities", async () => {
      const cases = [
        {},
        { items: [] },
        { items: [{ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 }] },
        { items: [{ productId: "not-an-id", quantity: 1 }] },
        { items: [{ productId: shoes.id, quantity: 0 }] },
        { items: [{ productId: shoes.id, quantity: 1.5 }] },
        { items: [{ productId: shoes.id, quantity: 100 }] },
      ];
      for (const body of cases) {
        const res = await checkout(body);
        assert.equal(res.status, 400, JSON.stringify(body));
      }
      assert.equal(fake.calls["sessions.create"], undefined);
      assert.equal(await Order.countDocuments(), 0);
    });

    it("removes the pending order and hides Stripe's message if Stripe fails", async () => {
      const original = fake.stripe.checkout.sessions.create;
      fake.stripe.checkout.sessions.create = async () => {
        const error = new Error("You did not provide an API key. See https://stripe.com/docs");
        error.type = "StripeAuthenticationError";
        throw error;
      };
      try {
        const res = await checkout({ items: [{ productId: shoes.id, quantity: 1 }] });
        assert.equal(res.status, 502);
        assert.equal(
          res.body.error,
          "We couldn't reach our payment provider. Please try again in a moment."
        );
        assert.doesNotMatch(JSON.stringify(res.body), /API key|stripe\.com/);
        assert.equal(await Order.countDocuments(), 0);
      } finally {
        fake.stripe.checkout.sessions.create = original;
      }
    });

    it("explains that payments aren't set up when the Stripe key is missing", async () => {
      const key = process.env.STRIPE_PRIVATE_KEY;
      delete process.env.STRIPE_PRIVATE_KEY;
      try {
        const res = await checkout({ items: [{ productId: shoes.id, quantity: 1 }] });
        assert.equal(res.status, 503);
        assert.equal(res.body.error, "Payments aren't set up yet. Please try again later.");
        assert.equal(await Order.countDocuments(), 0);
        assert.equal(fake.calls["sessions.create"], undefined);
      } finally {
        process.env.STRIPE_PRIVATE_KEY = key;
      }
    });
  });

  describe("POST /checkout/webhook", () => {
    const sendEvent = (event, { tamper = false } = {}) => {
      const { payload, signature } = fake.signedWebhook(event);
      return request(app)
        .post("/checkout/webhook")
        .set("Content-Type", "application/json")
        .set("Stripe-Signature", signature)
        .send(tamper ? payload.replace("paid", "unpaid") : payload);
    };

    const completedEvent = (sessionId, overrides = {}) => ({
      id: "evt_test",
      type: "checkout.session.completed",
      data: {
        object: {
          id: sessionId,
          mode: "payment",
          payment_status: "paid",
          payment_intent: "pi_test_1",
          customer_details: { email: "guest@example.com" },
          shipping_details: {
            name: "Guest Buyer",
            address: {
              line1: "10 Bayfront Ave",
              line2: null,
              city: "Singapore",
              state: null,
              postal_code: "018956",
              country: "SG",
            },
          },
          ...overrides,
        },
      },
    });

    const startCheckout = async () => {
      await checkout({ items: [{ productId: shoes.id, quantity: 1 }] });
      return Order.findOne();
    };

    it("rejects requests with an invalid signature", async () => {
      const order = await startCheckout();
      const res = await sendEvent(completedEvent(order.stripeSessionId), { tamper: true });
      assert.equal(res.status, 400);
      assert.equal((await Order.findById(order.id)).status, "pending");
    });

    it("marks the order paid with shipping, email and card details", async () => {
      const order = await startCheckout();
      const res = await sendEvent(completedEvent(order.stripeSessionId));
      assert.equal(res.status, 200);

      const paid = await Order.findById(order.id);
      assert.equal(paid.status, "paid");
      assert.equal(paid.email, "guest@example.com");
      assert.equal(paid.shippingAddress.name, "Guest Buyer");
      assert.equal(paid.shippingAddress.postalCode, "018956");
      assert.equal(paid.paymentMethod.brand, "visa");
      assert.equal(paid.paymentMethod.last4, "4242");
      assert.equal(paid.stripePaymentIntentId, "pi_test_1");
    });

    it("does not change an order that was already processed", async () => {
      const order = await startCheckout();
      await sendEvent(completedEvent(order.stripeSessionId));
      await Order.updateOne({ _id: order.id }, { status: "shipped" });

      const res = await sendEvent(completedEvent(order.stripeSessionId));
      assert.equal(res.status, 200);
      assert.equal((await Order.findById(order.id)).status, "shipped");
    });

    it("leaves unpaid sessions pending", async () => {
      const order = await startCheckout();
      await sendEvent(
        completedEvent(order.stripeSessionId, { payment_status: "unpaid" })
      );
      assert.equal((await Order.findById(order.id)).status, "pending");
    });

    it("deletes the pending order when the session expires", async () => {
      const order = await startCheckout();
      const res = await sendEvent({
        id: "evt_test",
        type: "checkout.session.expired",
        data: { object: { id: order.stripeSessionId, mode: "payment" } },
      });
      assert.equal(res.status, 200);
      assert.equal(await Order.countDocuments(), 0);
    });
  });

  describe("GET /checkout/order/:sessionId", () => {
    it("returns the order summary for a session", async () => {
      await checkout({ items: [{ productId: jacket.id, quantity: 2 }] });
      const res = await request(app).get("/checkout/order/cs_test_1");
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, "pending");
      assert.equal(res.body.data.subtotal, 599.98);
      assert.equal(res.body.data.items[0].title, "Black Leather Jacket");
      assert.equal(res.body.data.shippingAddress, undefined);
    });

    it("returns 404 for unknown or malformed session ids", async () => {
      assert.equal((await request(app).get("/checkout/order/cs_test_404")).status, 404);
      assert.equal((await request(app).get("/checkout/order/abc")).status, 404);
    });
  });
});
