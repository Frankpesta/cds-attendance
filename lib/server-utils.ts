/**
 * Server-side utilities (mirrored from convex/utils.ts for MySQL migration).
 * Used by repositories and API routes.
 */

export function nowMs(): number {
  return Date.now();
}

export function getNigeriaNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000);
}

export function toNigeriaYYYYMMDD(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseHHmmToMinutes(timeHHmm: string): number {
  const [hh, mm] = timeHHmm.split(":").map((s) => Number.parseInt(s, 10));
  return hh * 60 + mm;
}

export function isWithinMeetingWindow(
  meetingTimeHHmm: string,
  meetingDurationMinutes: number,
  earlyBufferMinutes = 15,
  lateBufferMinutes = 15,
  now: Date = new Date(),
): boolean {
  const nigeriaNow = new Date(now.getTime() + 60 * 60 * 1000);
  const minutesNow = nigeriaNow.getUTCHours() * 60 + nigeriaNow.getUTCMinutes();
  const meetingStart = parseHHmmToMinutes(meetingTimeHHmm);
  const windowStart = meetingStart - earlyBufferMinutes;
  const windowEnd = meetingStart + meetingDurationMinutes + lateBufferMinutes;
  return minutesNow >= windowStart && minutesNow <= windowEnd;
}

export function generateRandomTokenHex(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    out += buf[i].toString(16).padStart(2, "0");
  }
  return out;
}

export function generateQrToken(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    out += alphabet[buf[i] % alphabet.length];
  }
  return out;
}

export async function generateQrTokenServer(
  secret: string,
  timestamp: number,
  rotationInterval: number = 50,
): Promise<string> {
  const windowStartSeconds = Math.floor(timestamp / 1000 / rotationInterval) * rotationInterval;
  const message = `${windowStartSeconds}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.substring(0, 64);
}

export function generateTempPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const specials = "!@#$%^&*()-_=+";
  const all = upper + lower + digits + specials;

  if (length < 8) length = 8;

  const picks = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    specials[Math.floor(Math.random() * specials.length)],
  ];

  const remaining = length - picks.length;
  const buf = new Uint8Array(remaining);
  crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) {
    picks.push(all[buf[i] % all.length]);
  }
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.join("");
}

export function passwordMeetsPolicy(pw: string): boolean {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return re.test(pw);
}

export function extractBatchFromStateCode(stateCode: string): string | null {
  const match = stateCode.match(/\/\d{2}([A-C])\//);
  return match ? match[1] : null;
}
