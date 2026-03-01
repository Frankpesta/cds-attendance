/**
 * File storage for medical files (replaces Convex storage).
 * Uses local filesystem (FILE_STORAGE_PATH) or can be extended for S3.
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_MEDICAL_FILES = 3;

const getStoragePath = () => {
  const base = process.env.FILE_STORAGE_PATH || "./uploads";
  return path.join(process.cwd(), base, "medical");
};

/**
 * Generate a unique file path for an upload.
 * Returns relative path like "medical/abc123-def456.pdf"
 */
export function generateUploadPath(
  fileName: string,
  contentType: string,
): string {
  const ext = path.extname(fileName) || ".bin";
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const safeName = `${uniqueId}${ext}`;
  return path.join("medical", safeName);
}

/**
 * Save an uploaded file (from multipart/form-data or base64).
 * Returns the file path to store in DB.
 */
export async function saveFile(
  relativePath: string,
  buffer: Buffer,
): Promise<string> {
  const fullPath = path.join(process.cwd(), "uploads", relativePath);
  const dir = path.dirname(fullPath);
  await mkdir(dir, { recursive: true });
  await writeFile(fullPath, buffer);
  return relativePath;
}

/**
 * Get the full filesystem path for a stored file.
 */
export function getFilePath(relativePath: string): string {
  return path.join(process.cwd(), "uploads", relativePath);
}

/**
 * Get a URL for the file (for API route serving).
 * In production, this could return an S3/CDN URL.
 */
export function getFileUrl(relativePath: string): string {
  return `/api/files/${encodeURIComponent(relativePath)}`;
}

/**
 * Validate medical file descriptors before saving.
 */
export function validateMedicalFiles(
  files: { file_path: string; fileName: string; fileSize: number; contentType: string }[],
): void {
  if (files.length > MAX_MEDICAL_FILES) {
    throw new Error(`A maximum of ${MAX_MEDICAL_FILES} files is allowed`);
  }
  for (const file of files) {
    if (file.fileSize > MAX_FILE_BYTES) {
      throw new Error("File exceeds the 5MB limit");
    }
    if (
      file.contentType !== "application/pdf" &&
      !file.contentType.startsWith("image/")
    ) {
      throw new Error("Only PDF and image files are allowed");
    }
  }
}
