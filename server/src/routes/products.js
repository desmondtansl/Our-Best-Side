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
import checkAuth from "../middleware/checkAuth.js";

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

router.post("/upload", checkAuth, upload.single("image"), async (req, res) => {
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
    for (let singleProduct of fetchMenProducts) {
      const getObjectParams = {
        Bucket: bucketName,
        Key: singleProduct.image,
      };

      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3, command, { expiresIn: 604800 });
      singleProduct.imageUrl = url;
      imageUrlArray.push(singleProduct.imageUrl);
      menProducts.push(singleProduct);
    }

    for (let i = 0; i < imageUrlArray.length; i++) {
      menProducts[i].url = imageUrlArray[i];
      combinedMenProducts.push(menProducts[i]);
    }
    console.log(combinedMenProducts[0], "TEST 1234");
    console.log(combinedMenProducts[0].url);
    res.status(200).send(combinedMenProducts);
  } catch (error) {
    return res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});

// GET ALL LADIES PRODUCTS

let ladiesimageUrlArray = [];
let ladiesProducts = [];
let combinedLadiesProducts = [];

router.get("/ladies", async (req, res) => {
  try {
    ladiesimageUrlArray = [];
    ladiesProducts = [];
    combinedLadiesProducts = [];
    const fetchLadiesProducts = await Product.find({
      category: "Ladies",
    }).exec();
    for (let singleProduct of fetchLadiesProducts) {
      const getObjectParams = {
        Bucket: bucketName,
        Key: singleProduct.image,
      };

      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3, command, { expiresIn: 604800 });
      singleProduct.imageUrl = url;
      ladiesimageUrlArray.push(singleProduct.imageUrl);
      ladiesProducts.push(singleProduct);
    }

    for (let i = 0; i < ladiesimageUrlArray.length; i++) {
      ladiesProducts[i].url = ladiesimageUrlArray[i];
      combinedLadiesProducts.push(ladiesProducts[i]);
    }
    res.status(200).send(combinedLadiesProducts);
  } catch (error) {
    return res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});

// GET ALL PRODUCTS

let combinedimageUrlArray = [];
let combineProducts = [];
let combinedAllProducts = [];

router.get("/combined", async (req, res) => {
  try {
    combinedimageUrlArray = [];
    combineProducts = [];
    combinedAllProducts = [];
    const fetchMenWomenProducts = await Product.find({
      $or: [{ category: "Men" }, { category: "Women" }],
    }).exec();
    for (let singleProduct of fetchMenWomenProducts) {
      const getObjectParams = {
        Bucket: bucketName,
        Key: singleProduct.image,
      };

      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3, command, { expiresIn: 604800 });
      singleProduct.imageUrl = url;
      combinedimageUrlArray.push(singleProduct.imageUrl);
      combineProducts.push(singleProduct);
    }

    for (let i = 0; i < combinedimageUrlArray.length; i++) {
      combineProducts[i].url = combinedimageUrlArray[i];
      combinedAllProducts.push(combineProducts[i]);
    }
    res.status(200).send(combinedAllProducts);
  } catch (error) {
    return res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});

// GET SPECIFIC MEN PRODUCT FROM SEARCH

router.get("/men/:params", async (req, res) => {
  try {
    const { params } = req.params;
    const fetchIndividualMenProduct = await Product.findById(params);
    res.status(200).json({
      data: fetchIndividualMenProduct,
      error: "",
    });
  } catch (error) {
    return res.status(400).json({
      data: "",
      error: error.message,
    });
  }
});

// GET SPECIFIC LADIES PRODUCT FROM SEARCH

router.get("/ladies/:params", async (req, res) => {
  try {
    const { params } = req.params;
    const fetchIndividualLadiesProduct = await Product.findById(params);
    res.status(200).json({
      data: fetchIndividualLadiesProduct,
      error: "",
    });
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

router.put("/:params", checkAuth, async (req, res) => {
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
