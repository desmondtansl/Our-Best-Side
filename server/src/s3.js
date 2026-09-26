import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// Shared S3 client for product images (used by the product routes and the
// seed script). Created on first use so scripts can load their .env first.
let client;
const getS3 = () => {
  client ||= new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  return client;
};

const hashedImageName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

// Uploads an image and returns its S3 key, which is what Product.image stores.
export const uploadImageToS3 = async ({ buffer, mimetype }) => {
  const imageName = hashedImageName();
  await getS3().send(
    new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: imageName,
      Body: buffer,
      ContentType: mimetype,
    })
  );
  return imageName;
};

// Public URL of an image key (the bucket serves product images publicly).
export const imageUrl = (key) => {
  const { BUCKET_NAME, AWS_REGION } = process.env;
  if (!key || !BUCKET_NAME || !AWS_REGION) return undefined;
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
};
