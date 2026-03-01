import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params;
    const relativePath = pathSegments.join("/");
    if (!relativePath || relativePath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const fullPath = path.join(process.cwd(), "uploads", relativePath);
    const buffer = await readFile(fullPath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": contentType },
    });
  } catch (e) {
    console.error("File serve error:", e);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
