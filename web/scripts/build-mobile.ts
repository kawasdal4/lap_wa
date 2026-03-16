import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

// Check Node.js version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);

if (majorVersion < 22) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: Node.js 22 or higher is required for Capacitor builds.');
  console.error(`Current version: ${nodeVersion}`);
  process.exit(1);
}

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });
dotenv.config(); // Fallback to .env

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
console.log(`R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID ? "Found" : "Missing"}`);
console.log(`R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY ? "Found" : "Missing"}`);
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "lap-wa";
const R2_ENDPOINT = process.env.R2_ENDPOINT || "https://f8bdefda808aa952cd77b12e7cafa38c.r2.cloudflarestorage.com";

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

async function uploadFile(filePath: string, key: string) {
  console.log(`Uploading ${filePath} to R2 as ${key}...`);
  const fileContent = fs.readFileSync(filePath);
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: key.endsWith(".apk") ? "application/vnd.android.package-archive" : "application/octet-stream",
  });

  await r2Client.send(command);
  console.log(`Successfully uploaded ${key}`);
}

async function main() {
  try {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.error("Missing R2 credentials. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
      process.exit(1);
    }

    // 1. Next.js Build
    console.log("Building Next.js application...");
    execSync("npm run build", { stdio: "inherit" });

    // 2. Capacitor Sync
    console.log("Syncing Capacitor...");
    execSync("npx cap sync", { stdio: "inherit" });

    // 3. Android Build
    console.log("Building Android APK...");
    const androidDir = path.join(process.cwd(), "android");
    if (fs.existsSync(androidDir)) {
      // Run gradlew assembleRelease
      const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
      execSync(`${gradlew} assembleRelease`, { cwd: androidDir, stdio: "inherit" });

      const apkPath = path.join(androidDir, "app/build/outputs/apk/release/app-release.apk");
      if (fs.existsSync(apkPath)) {
        await uploadFile(apkPath, "mobile-builds/android/app-release.apk");
      } else {
        console.error("APK not found after build.");
      }
    }

    // 4. iOS Build (Requires Mac - Skip if not on Mac)
    if (process.platform === "darwin") {
      console.log("Building iOS IPA (This usually requires manual steps or Fastlane)...");
      // Placeholder for iOS build commands
    } else {
      console.log("Skipping iOS IPA build (Requires Mac/Xcode).");
    }

    console.log("Mobile build and upload completed!");
  } catch (error) {
    console.error("Build/Upload failed:", error);
    process.exit(1);
  }
}

main();
