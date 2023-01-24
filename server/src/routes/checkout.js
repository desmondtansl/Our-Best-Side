import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

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

router.post("/create-checkout-session", async (req, res) => {
  try {
    const defaultPrices = req.body.map((subArray) => {
      return subArray.map((subsubArray) => {
        return {
          price: subsubArray.default_price,
          quantity: subsubArray.quantity,
        };
      });
    });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: defaultPrices.flat(),
      success_url: `${process.env.BASE_URL}/success.hmtl`,
      cancel_url: `${process.env.BASE_URL}/cancel.hmtl`,
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

export default router;
