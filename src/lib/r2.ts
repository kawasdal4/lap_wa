import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// R2 Configuration
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "lap-wa";
const R2_ENDPOINT = process.env.R2_ENDPOINT || "https://f8bdefda808aa952cd77b12e7cafa38c.r2.cloudflarestorage.com";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Initialize S3 client for Cloudflare R2
export const r2Client = R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

// Check if R2 is configured
export const isR2Configured = (): boolean => {
  return !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && r2Client);
};

// Get public URL for a file
export const getPublicUrl = (key: string): string => {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  // Fallback: construct from endpoint
  return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
};

// Upload file to R2
export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export const uploadToR2 = async (options: UploadOptions): Promise<string> => {
  if (!r2Client) {
    throw new Error("R2 is not configured. Please set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY");
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
  });

  await r2Client.send(command);
  return getPublicUrl(options.key);
};

// Delete file from R2
export const deleteFromR2 = async (key: string): Promise<void> => {
  if (!r2Client) {
    throw new Error("R2 is not configured");
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
};

// Generate unique file key
export const generateFileKey = (prefix: string, extension: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}/${timestamp}-${random}.${extension}`;
};

// Upload image from base64 data
export const uploadBase64Image = async (
  base64Data: string,
  prefix: string = "images"
): Promise<string> => {
  // Extract the base64 content (remove data:image/xxx;base64, prefix)
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 image data");
  }

  const extension = matches[1] || "jpg";
  const base64Content = matches[2];
  const buffer = Buffer.from(base64Content, "base64");

  const key = generateFileKey(prefix, extension);
  const contentType = `image/${extension}`;

  return uploadToR2({ key, body: buffer, contentType });
};

// Upload image from URL
export const uploadImageFromUrl = async (
  url: string,
  prefix: string = "images"
): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const extension = contentType.split("/")[1] || "jpg";
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const key = generateFileKey(prefix, extension);

  return uploadToR2({ key, body: buffer, contentType });
};
