import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// CREATE PRODUCT

router.post("/create", async (req, res) => {
  const data = req.body;
  const product = new Product({
    title: data.data.title,
    description: data.data.description,
    image: data.data.image,
    category: data.data.category,
    size: data.data.size,
    color: data.data.color,
    price: data.data.price,
    inStock: data.data.inStock,
  });

  try {
    const savedProduct = await product.save();
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

// EDIT PRODUCT

// router.put("/edit", async (req, res) => {
//   try {
//     const updatedProduct = await Product.findByIdAndUpdate(
//       req.params.id,
//       {
//         $set: req.body,
//       },
//       { new: true }
//     );
//     res.status(200).json({
//       data: updatedProduct,
//       error: "",
//     });
//   } catch (error) {
//     res.status(400).json({
//       data: "",
//       error: error.message,
//     });
//   }
// });

// GET PRODUCT

router.get("/:params", async (req, res) => {
  try {
    const getProduct = await Product.findOne();
    if (!getProduct) {
      return res.status(400).json({
        data: "",
        error: "No Product Found",
      });
    }
    res.status(200).json({
      data: getProduct,
      error: "",
    });
  } catch (error) {
    return res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});
export default router;
