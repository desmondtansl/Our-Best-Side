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
  try {
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
    res.status(200).json({
      data: product,
      error: "",
    });
  } catch (error) {
    return res.status(400).json({
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

// GET ALL MEN PRODUCTS

let imageUrlArray = [];
let menProducts = [];
let combinedMenProducts = [];

router.get("/men", async (req, res) => {
  try {
    imageUrlArray = [];
    menProducts = [];
    combinedMenProducts = [];
    const fetchMenProducts = await Product.find({ category: "Men" }).exec();
    // console.log(fetchMenProducts);
    for (let singleProduct of fetchMenProducts) {
      const getObjectParams = {
        Bucket: bucketName,
        Key: singleProduct.image,
      };

      // console.log(fetchMenProducts[0].image);
      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3, command, { expiresIn: 604800 });
      singleProduct.imageUrl = url;
      imageUrlArray.push(singleProduct.imageUrl);
      menProducts.push(singleProduct);
      console.log(fetchMenProducts);
      console.log(imageUrlArray);
      console.log(menProducts);
    }

    for (let i = 0; i < imageUrlArray.length; i++) {
      menProducts[i].url = imageUrlArray[i];
      combinedMenProducts.push(menProducts[i]);
    }
    console.log(combinedMenProducts[0], "TEST 1234");
    console.log(combinedMenProducts[0].url);
    res.status(200).send(combinedMenProducts);
    // console.log(combinedMenProducts);
  } catch (error) {
    return res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});

// GET SPECIFIC PRODUCT FROM SEARCH

router.get("/search/:params", async (req, res) => {
  try {
    const { params } = req.params;
    const fetchAllProducts = await Product.find({
      title: { $regex: "^" + params, $options: "i" },
    });
    res.status(200).json({
      data: fetchAllProducts,
      error: "",
    });
  } catch (error) {
    return res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});

// GET 1 PRODUCT

router.get("/:params", async (req, res) => {
  try {
    const { params } = req.params;
    const getProduct = await Product.findById(params);
    const getObjectParams = {
      Bucket: bucketName,
      Key: getProduct.image,
    };
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 604800 });
    Product.imageUrl = url;

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

// EDIT 1 PRODUCT

router.put("/:params", async (req, res) => {
  try {
    const { params } = req.params;
    const getEditedProduct = await Product.findByIdAndUpdate(
      params,
      {
        $set: req.body,
      },
      { new: true }
    );
    const getObjectParams = {
      Bucket: bucketName,
      Key: getEditedProduct.image,
    };
    const command = new PutObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 604800 });
    Product.imageUrl = url;

    res.status(200).json({
      data: getEditedProduct,
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
