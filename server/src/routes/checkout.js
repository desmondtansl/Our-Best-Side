import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

router.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price: "price_1MTTbCLBLPex7nyMX33f2D5d",
          quantity: 1,
        },
      ],
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
