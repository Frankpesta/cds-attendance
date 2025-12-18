import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts a clean, user-friendly error message from Convex errors.
 * Removes Request IDs and other technical details that aren't helpful to users.
 * Handles various error formats including ConvexError, HTTP client errors, and standard errors.
 */
export function extractErrorMessage(error: unknown, fallback: string = "An error occurred"): string {
  if (!error) return fallback;
  
  let message: string | null = null;
  
  // Handle string errors
  if (typeof error === "string") {
    message = error;
  }
  // Handle Error instances
  else if (error instanceof Error) {
    message = error.message;
    
    // Check if it's a ConvexError with data property
    if ((error as any).data) {
      const data = (error as any).data;
      if (typeof data === "string") {
        message = data;
      } else if (data && typeof data === "object" && "message" in data) {
        message = String(data.message);
      }
    }
  }
  // Handle objects with message property
  else if (typeof error === "object" && error !== null) {
    const err = error as any;
    
    // Check for ConvexError structure (data property)
    if (err.data) {
      if (typeof err.data === "string") {
        message = err.data;
      } else if (err.data && typeof err.data === "object") {
        if (err.data.message) {
          message = String(err.data.message);
        } else if (err.data.error) {
          message = String(err.data.error);
        } else if (err.data.statusMessage) {
          message = String(err.data.statusMessage);
        }
      }
    }
    
    // Check for direct message property
    if (!message && err.message) {
      message = String(err.message);
    }
    
    // Check for error property (common in HTTP errors)
    if (!message && err.error) {
      if (typeof err.error === "string") {
        message = err.error;
      } else if (err.error.message) {
        message = String(err.error.message);
      }
    }
    
    // Check for statusText (HTTP status text)
    if (!message && err.statusText) {
      message = String(err.statusText);
    }
  }
  
  // If we still don't have a message, try to stringify the error
  if (!message) {
    try {
      message = String(error);
    } catch {
      message = null;
    }
  }
  
  // Clean and return the message
  if (message) {
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
  cleaned = cleaned.replace(/Request ID: [^\s,]+/gi, "");
  
  // Remove "Server error" prefix if it's followed by more specific info
  cleaned = cleaned.replace(/^Server error\s*:?\s*/i, "");
  
  // Remove "Convex error" prefix
  cleaned = cleaned.replace(/^Convex error\s*:?\s*/i, "");
  
  // Remove "Error:" prefix if present
  cleaned = cleaned.replace(/^Error\s*:?\s*/i, "");
  
  // Remove HTTP status codes and related text
  cleaned = cleaned.replace(/\b\d{3}\s+[A-Z\s]+\s*:?\s*/gi, "");
  
  // Remove common technical prefixes
  cleaned = cleaned.replace(/^(Failed|Error|Exception)\s*:?\s*/i, "");
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, "");
  
  // Remove multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  // If we removed everything, return a generic message
  if (!cleaned) {
    return "An error occurred. Please try again.";
  }
  
  // If the message is still very generic, return the fallback
  if (cleaned.toLowerCase() === "error" || cleaned.toLowerCase() === "server error") {
    return "An error occurred. Please try again.";
  }
  
  return cleaned;
}