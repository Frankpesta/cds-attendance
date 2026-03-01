import { NextRequest, NextResponse } from "next/server";
import { saveFile, generateUploadPath, validateMedicalFiles } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const relativePath = generateUploadPath(file.name, file.type);

    const descriptors = [
      {
        file_path: relativePath,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      },
    ];
    validateMedicalFiles(descriptors);

    await saveFile(relativePath, buffer);

    return NextResponse.json(descriptors[0]);
  } catch (e) {
    console.error("Medical upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  }
}
