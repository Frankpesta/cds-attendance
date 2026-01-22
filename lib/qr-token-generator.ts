/**
 * Client-side QR token generation using HMAC-SHA256
 * 
 * This generates tokens deterministically based on:
 * - Session secret (from server)
 * - Current time window (rounded to rotation interval)
 * 
 * Tokens are validated server-side using the same algorithm.
 */

/**
 * Generate QR token using HMAC-SHA256
 * 
 * @param secret - Session secret from server (32-byte hex string)
 * @param timestamp - Current timestamp in milliseconds
 * @param rotationInterval - Rotation interval in seconds (default 50)
 * @returns Generated token string (64 hex characters)
 */
export async function generateQrToken(
  secret: string,
  timestamp: number,
  rotationInterval: number = 50
): Promise<string> {
  // Calculate time window (round down to rotation interval)
  const windowStartSeconds = Math.floor(timestamp / 1000 / rotationInterval) * rotationInterval;
  const message = `${windowStartSeconds}`;
  
  // Create HMAC using Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign (HMAC) the message
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return first 64 characters (SHA-256 produces 64 hex chars)
  return hashHex.substring(0, 64);
}

/**
 * Synchronous version using a simple hash (for server-side compatibility)
 * Note: This is less secure but works in Node.js environment
 * 
 * @param secret - Session secret
 * @param timestamp - Current timestamp in milliseconds
 * @param rotationInterval - Rotation interval in seconds
 * @returns Generated token string
 */
export function generateQrTokenSync(
  secret: string,
  timestamp: number,
  rotationInterval: number = 50
): string {
  // Calculate time window
  const windowStartSeconds = Math.floor(timestamp / 1000 / rotationInterval) * rotationInterval;
  const message = `${windowStartSeconds}`;
  
  // Simple hash using built-in crypto (Node.js compatible)
  // This matches the server-side implementation
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  const hash = hmac.digest('hex');
  
  return hash.substring(0, 64);
}

/**
 * Get the current time window for a given timestamp
 * Useful for debugging and validation
 */
export function getTimeWindow(timestamp: number, rotationInterval: number = 50): number {
  return Math.floor(timestamp / 1000 / rotationInterval) * rotationInterval;
}

/**
 * Get the next rotation time
 */
export function getNextRotationTime(timestamp: number, rotationInterval: number = 50): number {
  const currentWindow = getTimeWindow(timestamp, rotationInterval);
  return (currentWindow + rotationInterval) * 1000;
}
