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
  
  // Helper function to extract message from nested objects
  const extractFromObject = (obj: any, depth = 0): string | null => {
    if (depth > 5) return null; // Prevent infinite recursion
    if (!obj || typeof obj !== "object") return null;
    
    // Priority order for extracting messages
    const keys = ["message", "error", "errorMessage", "statusMessage", "reason", "description", "detail", "details"];
    
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        if (typeof obj[key] === "string" && obj[key].trim()) {
          return obj[key].trim();
        }
        if (typeof obj[key] === "object") {
          const nested = extractFromObject(obj[key], depth + 1);
          if (nested) return nested;
        }
      }
    }
    
    // Check for data property (common in ConvexError)
    if (obj.data !== undefined) {
      if (typeof obj.data === "string" && obj.data.trim()) {
        return obj.data.trim();
      }
      if (typeof obj.data === "object") {
        const nested = extractFromObject(obj.data, depth + 1);
        if (nested) return nested;
      }
    }
    
    // Check for response.data (common in HTTP errors)
    if (obj.response && obj.response.data) {
      const nested = extractFromObject(obj.response.data, depth + 1);
      if (nested) return nested;
    }
    
    return null;
  };
  
  // Handle string errors directly
  if (typeof error === "string") {
    message = error.trim();
  }
  // Handle Error instances (including ConvexError which extends Error)
  else if (error instanceof Error) {
    const errorAny = error as any;
    
    // First, try to extract from nested structures
    message = extractFromObject(errorAny);
    
    // If no nested message found, use error.message
    if (!message && error.message) {
      message = error.message.trim();
    }
    
    // Check for name property that might indicate error type
    // But only if we don't have a good message yet
    if (!message || message.toLowerCase().includes("convex error") || message.toLowerCase().includes("error code")) {
      // Try to extract from data property more thoroughly
      if (errorAny.data !== undefined) {
        const dataMessage = extractFromObject(errorAny.data);
        if (dataMessage) {
          message = dataMessage;
        }
      }
    }
  }
  // Handle plain objects (not Error instances)
  else if (typeof error === "object" && error !== null) {
    message = extractFromObject(error);
  }
  
  // If we still don't have a message, try to stringify the error
  if (!message) {
    try {
      // Try JSON.stringify first to get structured data
      const jsonString = JSON.stringify(error);
      if (jsonString && jsonString !== "{}" && jsonString !== "null") {
        const parsed = JSON.parse(jsonString);
        message = extractFromObject(parsed);
      }
      
      // If still no message, try String conversion
      if (!message) {
        const errorString = String(error);
        // Only use stringified version if it's not just "[object Object]"
        if (errorString !== "[object Object]" && errorString !== "{}" && errorString !== "null") {
          message = errorString;
        }
      }
    } catch {
      // If JSON parsing fails, try String conversion
      try {
        const errorString = String(error);
        if (errorString !== "[object Object]" && errorString !== "{}") {
          message = errorString;
        }
      } catch {
        message = null;
      }
    }
  }
  
  // Clean and return the message
  if (message) {
    // Before cleaning, check if message contains "Convex error" or similar but has actual content after it
    // Example: "Convex error: Invalid or inactive link" -> extract "Invalid or inactive link"
    const convexErrorMatch = message.match(/(?:Convex\s+error|ConvexError|Server\s+error)[:\s]+(.+)/i);
    if (convexErrorMatch && convexErrorMatch[1]) {
      message = convexErrorMatch[1].trim();
    }
    
    // Also check for patterns like "Error CODE: message" and extract just the message
    const errorCodeMatch = message.match(/Error\s+[A-Z0-9_]+\s*:\s*(.+)/i);
    if (errorCodeMatch && errorCodeMatch[1]) {
      message = errorCodeMatch[1].trim();
    }
    
    const cleaned = cleanErrorMessage(message);
    // If after cleaning we still have a meaningful message, return it
    if (cleaned && cleaned.toLowerCase() !== "error" && cleaned.toLowerCase() !== "an error occurred") {
      return cleaned;
    }
  }
  
  return fallback;
}

/**
 * Cleans error messages by removing Request IDs and other technical details
 */
function cleanErrorMessage(message: string): string {
  if (!message) return "An error occurred";
  
  let cleaned = message;
  
  // Remove Request ID patterns like [Request ID: abc123] or (Request ID: abc123)
  cleaned = cleaned.replace(/\[Request ID: [^\]]+\]/gi, "");
  cleaned = cleaned.replace(/\(Request ID: [^\)]+\)/gi, "");
  cleaned = cleaned.replace(/Request ID: [^\s,]+/gi, "");
  cleaned = cleaned.replace(/requestId: [^\s,]+/gi, "");
  
  // Remove error codes in brackets or parentheses (e.g., [CODE123], (ERR_001))
  cleaned = cleaned.replace(/\[[A-Z0-9_]+\]/g, "");
  cleaned = cleaned.replace(/\([A-Z0-9_]+\)/g, "");
  
  // Remove "Server error" prefix if it's followed by more specific info
  // But only if there's actual content after it
  cleaned = cleaned.replace(/^Server error\s*:?\s*/i, "");
  
  // Remove "Convex error" prefix (but preserve the actual message after it)
  cleaned = cleaned.replace(/^Convex error\s*:?\s*/i, "");
  
  // Remove "ConvexError" prefix
  cleaned = cleaned.replace(/^ConvexError\s*:?\s*/i, "");
  
  // Remove "Error:" prefix if present (but keep the message)
  cleaned = cleaned.replace(/^Error\s*:?\s*/i, "");
  
  // Remove HTTP status codes and related text (e.g., "500 Internal Server Error:")
  cleaned = cleaned.replace(/\b\d{3}\s+[A-Z\s]+\s*:?\s*/gi, "");
  
  // Remove common technical prefixes that don't add value
  cleaned = cleaned.replace(/^(Failed|Error|Exception|Throw)\s*:?\s*/i, "");
  
  // Remove "called by client" type messages that aren't helpful
  cleaned = cleaned.replace(/called by client/gi, "");
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, "");
  
  // Remove stack traces (lines that look like "at functionName (file:line:column)")
  cleaned = cleaned.replace(/\s+at\s+[^\n]+/gi, "");
  
  // Remove file paths (common in error messages)
  cleaned = cleaned.replace(/\/[^\s]+\.(ts|js|tsx|jsx):\d+:\d+/gi, "");
  
  // Remove multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  // Remove leading/trailing punctuation that might be left over
  cleaned = cleaned.replace(/^[:\-\s]+|[:\-\s]+$/g, "");
  
  // If we removed everything, return a generic message
  if (!cleaned || cleaned.length === 0) {
    return "An error occurred. Please try again.";
  }
  
  // If the message is still very generic or just technical terms, return fallback
  const lowerCleaned = cleaned.toLowerCase();
  const genericTerms = [
    "error",
    "server error",
    "an error occurred",
    "failed",
    "exception",
    "undefined",
    "null",
    "[object object]",
  ];
  
  if (genericTerms.includes(lowerCleaned) || lowerCleaned.length < 3) {
    return "An error occurred. Please try again.";
  }
  
  // Capitalize first letter for better readability
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  return cleaned;
}