import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

router.post("/create-checkout-session", async (req, res) => {
  res.json("test stripe");
});

export default router;
