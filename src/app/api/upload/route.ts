import { NextRequest, NextResponse } from "next/server";
import { 
  uploadBase64Image, 
  uploadImageFromUrl, 
  isR2Configured 
} from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "R2 storage is not configured. Please set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type, data, prefix } = body;

    // Validate input
    if (!type || !data) {
      return NextResponse.json(
        { error: "Missing required fields: type, data" },
        { status: 400 }
      );
    }

    let url: string;
    const uploadPrefix = prefix || "lap-wa";

    if (type === "base64") {
      // Upload base64 encoded image
      url = await uploadBase64Image(data, uploadPrefix);
    } else if (type === "url") {
      // Upload from URL (e.g., Google Maps static image)
      url = await uploadImageFromUrl(data, uploadPrefix);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'base64' or 'url'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      url,
      message: "Image uploaded successfully" 
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    configured: isR2Configured(),
    message: isR2Configured() 
      ? "R2 storage is configured and ready" 
      : "R2 storage is not configured. Please set environment variables."
  });
}
