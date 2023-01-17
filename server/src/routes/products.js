import express from "express";
import Product from "../models/Product.js";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const hashedImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.AWS_REGION;
const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_ACCESS_KEY_SECRET;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion,
});

router.post("/upload", upload.single("image"), async (req, res) => {
  console.log("req.body", req.body);
  console.log("req.file", req.file);

  req.file.buffer;

  const imageName = hashedImageName();

  const params = {
    Bucket: bucketName,
    Key: imageName,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  const product = await Product.create({
    title: req.body.title,
    description: req.body.description,
    image: imageName,
    category: req.body.category,
    size: req.body.size,
    color: req.body.color,
    price: req.body.price,
    inStock: req.body.inStock,
  });

  res.send(product);
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
    const getObjectParams = {
      Bucket: bucketName,
      Key: getProduct.image,
    };
    console.log(getProduct);
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    Product.imageUrl = url;

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
