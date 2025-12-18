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
  
  // Handle string errors directly
  if (typeof error === "string") {
    message = error;
  }
  // Handle Error instances (including ConvexError which extends Error)
  else if (error instanceof Error) {
    message = error.message;
    
    // Check if it's a ConvexError with data property
    // ConvexError has a data property that may contain the actual error message
    const errorAny = error as any;
    if (errorAny.data !== undefined) {
      const data = errorAny.data;
      // If data is a string, use it directly
      if (typeof data === "string") {
        message = data;
      }
      // If data is an object, check for common message fields
      else if (data && typeof data === "object") {
        if (data.message) {
          message = String(data.message);
        } else if (data.error) {
          message = String(data.error);
        } else if (data.statusMessage) {
          message = String(data.statusMessage);
        } else if (data.code) {
          // Sometimes errors have codes, try to get a readable message
          message = error.message || String(data.code);
        }
      }
    }
  }
  // Handle plain objects (not Error instances)
  else if (typeof error === "object" && error !== null) {
    const err = error as any;
    
    // Check for ConvexError structure (data property)
    if (err.data !== undefined) {
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
      } else if (err.error && typeof err.error === "object" && err.error.message) {
        message = String(err.error.message);
      }
    }
    
    // Check for statusText (HTTP status text)
    if (!message && err.statusText) {
      message = String(err.statusText);
    }
    
    // Check for response.data (common in fetch errors)
    if (!message && err.response && err.response.data) {
      const responseData = err.response.data;
      if (typeof responseData === "string") {
        message = responseData;
      } else if (responseData && typeof responseData === "object" && responseData.message) {
        message = String(responseData.message);
      }
    }
  }
  
  // If we still don't have a message, try to stringify the error
  if (!message) {
    try {
      const errorString = String(error);
      // Only use stringified version if it's not just "[object Object]"
      if (errorString !== "[object Object]" && errorString !== "{}") {
        message = errorString;
      }
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
  
  // Remove "ConvexError" prefix
  cleaned = cleaned.replace(/^ConvexError\s*:?\s*/i, "");
  
  // Remove "Error:" prefix if present
  cleaned = cleaned.replace(/^Error\s*:?\s*/i, "");
  
  // Remove HTTP status codes and related text
  cleaned = cleaned.replace(/\b\d{3}\s+[A-Z\s]+\s*:?\s*/gi, "");
  
  // Remove common technical prefixes
  cleaned = cleaned.replace(/^(Failed|Error|Exception)\s*:?\s*/i, "");
  
  // Remove "called by client" type messages that aren't helpful
  cleaned = cleaned.replace(/called by client/gi, "");
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, "");
  
  // Remove multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  // If we removed everything, return a generic message
  if (!cleaned) {
    return "An error occurred. Please try again.";
  }
  
  // If the message is still very generic, return the fallback
  const lowerCleaned = cleaned.toLowerCase();
  if (lowerCleaned === "error" || lowerCleaned === "server error" || lowerCleaned === "an error occurred") {
    return "An error occurred. Please try again.";
  }
  
  return cleaned;
}