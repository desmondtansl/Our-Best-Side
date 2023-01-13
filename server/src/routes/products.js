import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const newProduct = new Product(req.body);

  try {
    const savedProduct = await newProduct.save();
    res.status(200).json({
      data: savedProduct,
      error: "",
    });
  } catch (error) {
    res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});
export default router;
