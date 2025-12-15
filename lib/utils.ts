import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts a clean, user-friendly error message from Convex errors.
 * Removes Request IDs and other technical details that aren't helpful to users.
 */
export function extractErrorMessage(error: unknown, fallback: string = "An error occurred"): string {
  if (!error) return fallback;
  
  // If it's already a string, return it
  if (typeof error === "string") {
    return cleanErrorMessage(error);
  }
  
  // If it's an Error object, extract the message
  if (error instanceof Error) {
    return cleanErrorMessage(error.message);
  }
  
  // If it has a message property
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as any).message);
    return cleanErrorMessage(message);
  }
  
  return fallback;
}

/**
 * Cleans error messages by removing Request IDs and other technical details
 */
function cleanErrorMessage(message: string): string {
  if (!message) return "An error occurred";
  
  // Remove Request ID patterns like [Request ID: abc123] or (Request ID: abc123)
  let cleaned = message.replace(/\[Request ID: [^\]]+\]/gi, "");
  cleaned = cleaned.replace(/\(Request ID: [^\)]+\)/gi, "");
  
  // Remove "Server error" prefix if it's followed by more specific info
  cleaned = cleaned.replace(/^Server error\s*:?\s*/i, "");
  
  // Remove multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  // If we removed everything, return a generic message
  if (!cleaned) {
    return "An error occurred. Please try again.";
  }
  
  return cleaned;
}