// Core server-side utilities used across Convex functions

// Time helpers
export function nowMs(): number {
  return Date.now();
}

// Returns current Date in Nigeria time (WAT, UTC+1) by shifting from UTC
export function getNigeriaNow(): Date {
  const now = new Date();
  // Nigeria is UTC+1 without DST. Convert by creating a new date using UTC ms plus 60 minutes.
  return new Date(now.getTime() + 60 * 60 * 1000);
}

// Format YYYY-MM-DD based on Nigeria local date
export function toNigeriaYYYYMMDD(d: Date = new Date()): string {
  // We want calendar date in Nigeria; take UTC date and shift +1h for display purposes
  const shifted = new Date(d.getTime() + 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse HH:mm string to minutes since midnight
export function parseHHmmToMinutes(timeHHmm: string): number {
  const [hh, mm] = timeHHmm.split(":").map((s) => Number.parseInt(s, 10));
  return hh * 60 + mm;
}

// Given meeting_time (HH:mm), meeting_duration, with early and late buffers (in minutes),
// check if current Nigeria time is within the allowed window.
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

// Random token generation (hex). Uses Web Crypto API which is available in Convex runtime.
export function generateRandomTokenHex(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    out += buf[i].toString(16).padStart(2, "0");
  }
  return out; // length = bytes * 2; default 48 chars
}

// Generate a high-entropy token string suitable for QR payload
export function generateQrToken(length = 32): string {
  // Build from URL-safe alphabet
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    out += alphabet[buf[i] % alphabet.length];
  }
  return out;
}

// Temp password generator that guarantees all character classes appear at least once
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
  // Shuffle
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.join("");
}

export function passwordMeetsPolicy(pw: string): boolean {
  // min 8, at least one upper, one lower, one digit
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return re.test(pw);
}

// Haversine distance in meters
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinRadiusMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusMeters: number,
): boolean {
  return haversineDistanceMeters(lat1, lon1, lat2, lon2) <= radiusMeters;
}

// State code helper e.g., AK/24A/0123
export function formatStateCode(prefix: string, batch: string, sequenceNumber: number): string {
  const seq = String(sequenceNumber).padStart(4, "0");
  return `${prefix}/${batch}/${seq}`;
}


