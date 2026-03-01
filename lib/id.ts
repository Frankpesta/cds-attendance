import { generateRandomTokenHex } from "./server-utils";

/** Generate a unique ID for MySQL (compatible with Convex migration) */
export function generateId(): string {
  return generateRandomTokenHex(16);
}
