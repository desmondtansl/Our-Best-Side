import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

// DISPLAY PRODUCTS IN CART FOR USER TO SEE

router.get("/get-product-info", async (req, res) => {
  let productArray = [];
  try {
    const products = await stripe.products.list({
      limit: 30,
    });
    products.data.map((product) =>
      productArray.push({
        id: product.id,
        description: product.description,
        default_price: product.default_price,
      })
    );
    return res.status(200).json({
      data: productArray,
      error: "",
    });
  } catch (error) {
    return res.status(500).json({
      data: "",
      error: error.message,
    });
  }
});

// RETURN STRIPE CHECKOUT PAGE WHEN USER CLICKS CHECKOUT NOW

router.post("/create-checkout-session", async (req, res) => {
  console.log(req.body);
  try {
    const defaultPrices = req.body.map((subArray) => {
      return {
        price: subArray.priceId.default_price,
        quantity: subArray.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: defaultPrices,
      success_url: `${process.env.BASE_URL}/success`,
      cancel_url: `${process.env.BASE_URL}/cart`,
    });

    res.status(200).json({
      data: session.url,
      error: "",
    });
  } catch (error) {
    return res.status(500).json({
      data: "",
      error: error.message,
    });
  }
});

router.get(
  "/success/success?session_id={CHECKOUT_SESSION_ID}",
  async (req, res) => {
    const { params } = req.params;
    const session = await stripe.checkout.sessions.retrieve(params);
    // const customer = await stripe.customers.retrieve(session.customer);

    res.status(200).json({
      data: session,
      error: "",
    });
  }
);

export default router;
