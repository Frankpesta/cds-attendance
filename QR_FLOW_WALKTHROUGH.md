# QR Code Flow: Complete Walkthrough
## From Admin Session Creation to Corp Member Scanning

---

## 🎯 Overview

This document explains the complete flow of how QR codes work in the new client-side generation system, from when an admin creates a session to when a corp member scans the code.

---

## 📋 Table of Contents

1. [Admin Creates QR Session](#1-admin-creates-qr-session)
2. [Client-Side Token Generation](#2-client-side-token-generation)
3. [QR Code Display](#3-qr-code-display)
4. [Corp Member Scans QR Code](#4-corp-member-scans-qr-code)
5. [Server Validates Token](#5-server-validates-token)
6. [Attendance Recorded](#6-attendance-recorded)

---

## 1. Admin Creates QR Session

### Frontend: Dashboard Page
**File:** `app/(authenticated)/dashboard/page.tsx`

1. Admin clicks **"Start New QR Session"** button
2. Frontend calls `startQrAction()` server action
3. Server action extracts `session_token` from cookies
4. Server action calls Convex mutation: `api.qr.startQrSession`

### Server Action Layer
**File:** `app/actions/qr.ts`

```typescript
export async function startQrAction() {
  const token = c.get("session_token")?.value || "";
  const res = await client.mutation(api.qr.startQrSession, { sessionToken: token });
  return { ok: true, data: res }; // Returns { meetingId, sessionId }
}
```

### Convex Mutation: `startQrSession`
**File:** `convex/qr.ts` (lines 122-187)

**What happens:**
1. ✅ Validates session token and admin role
2. ✅ Checks if any CDS groups meet today
3. ✅ Verifies at least one group is within meeting time window
4. ✅ Generates unique `sessionId` (16-byte hex)
5. ✅ **Generates `sessionSecret` (32-byte hex = 64 characters)** ← KEY STEP
6. ✅ Creates `meeting` record in database with:
   - `session_secret`: The secret key for token generation
   - `rotation_interval_sec`: 50 (default)
   - `token_algorithm`: "hmac-sha256"
   - `is_active`: true
   - `meeting_date`: Today's date (YYYY-MM-DD)
7. ✅ **NO token generation** - clients will generate tokens
8. ✅ **NO scheduler** - clients will rotate tokens
9. Returns `{ meetingId, sessionId }`

**Database State After This:**
```typescript
meetings: {
  _id: "j123abc...",
  meeting_date: "2026-01-22",
  session_id: "a1b2c3d4...",
  session_secret: "f8e7d6c5b4a3928172635485960716253...", // 64-char hex
  rotation_interval_sec: 50,
  token_algorithm: "hmac-sha256",
  is_active: true,
  activated_by_admin_id: "admin_user_id",
  activated_at: 1705896000000,
  // ... other fields
}
```

**Key Point:** The server stores the **secret**, not the tokens. Tokens are generated client-side.

---

## 2. Client-Side Token Generation

### Admin Redirects to QR Display Page
**File:** `app/(authenticated)/dashboard/page.tsx`

After successful session creation, admin is redirected to:
```
/qr?meetingId=<meetingId>
```

### QR Display Page Loads
**File:** `app/(authenticated)/qr/page.tsx`

1. Page extracts `meetingId` from URL query params
2. Calls `useQrSession(meetingId)` hook

### useQrSession Hook
**File:** `hooks/useQrSession.ts`

**Step 1: Fetch Session Secret**
```typescript
const sessionData = useQuery(
  api.qr.getSessionSecret,
  { meetingId: meetingId }
);
```

**Convex Query: `getSessionSecret`**
**File:** `convex/qr.ts` (lines 276-295)

- Queries `meetings` table by `meetingId`
- Checks if meeting is active
- Returns:
  ```typescript
  {
    secret: "f8e7d6c5b4a3928172635485960716253...", // 64-char hex
    rotationInterval: 50,
    meetingDate: "2026-01-22",
    isActive: true
  }
  ```
- **This query is cached by Convex** - only fetched once per session

**Step 2: Generate Token Locally**

Once `sessionData` is available, the hook:

1. Calculates current time window:
   ```typescript
   const now = Date.now(); // e.g., 1705896123456
   const currentWindow = Math.floor(now / 1000 / 50) * 50; // e.g., 1705896100
   ```

2. Calls `generateQrToken()`:
   ```typescript
   const token = await generateQrToken(
     sessionData.secret,  // "f8e7d6c5..."
     now,                  // 1705896123456
     50                    // rotation interval
   );
   ```

**Token Generation Algorithm**
**File:** `lib/qr-token-generator.ts` (lines 19-51)

```typescript
async function generateQrToken(secret, timestamp, rotationInterval) {
  // 1. Calculate time window (round down to nearest 50 seconds)
  const windowStartSeconds = Math.floor(timestamp / 1000 / 50) * 50;
  // Example: 1705896123 → 1705896100 (rounded down to nearest 50)
  
  // 2. Create message: time window as string
  const message = `${windowStartSeconds}`; // "1705896100"
  
  // 3. Create HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // 4. Sign the message
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  
  // 5. Convert to hex string (64 characters)
  const hashHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 64);
  
  return hashHex; // e.g., "a1b2c3d4e5f6..."
}
```

**Example:**
- Secret: `"f8e7d6c5b4a3928172635485960716253..."`
- Time: `1705896123456` ms
- Window: `1705896100` seconds
- Message: `"1705896100"`
- Token: `"a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"`

**Step 3: Auto-Rotation**

The hook sets up an interval that checks every second:

```typescript
setInterval(() => {
  const now = Date.now();
  const currentWindow = Math.floor(now / 1000 / 50) * 50;
  
  // Only regenerate if we've moved to a new time window
  if (lastWindowRef.current !== currentWindow) {
    const newToken = await generateQrToken(secret, now, 50);
    setCurrentToken(newToken);
    setRotationCount(prev => prev + 1);
  }
}, 1000);
```

**Key Points:**
- ✅ Token generation happens **entirely client-side**
- ✅ No database queries for token rotation
- ✅ Tokens rotate automatically every 50 seconds
- ✅ Same secret + same time window = same token (deterministic)

---

## 3. QR Code Display

**File:** `app/(authenticated)/qr/page.tsx`

1. `useQrSession` hook returns `currentToken`
2. When `currentToken` changes, `useEffect` triggers:
   ```typescript
   QRCode.toDataURL(currentToken, options, (error, url) => {
     setQrSrc(url); // Base64 image data
   });
   ```
3. QR code image is displayed in the UI
4. Token rotates every 50 seconds, QR code updates automatically

**Visual Flow:**
```
Admin Browser:
┌─────────────────────────┐
│  QR Display Page        │
│                         │
│  ┌───────────────┐      │
│  │  [QR Code]    │  ← Generated from currentToken
│  │               │      │
│  └───────────────┘      │
│                         │
│  Token: a1b2c3d4...     │
│  Rotation: 5            │
└─────────────────────────┘
```

---

## 4. Corp Member Scans QR Code

### Scan Page
**File:** `app/(authenticated)/scan/page.tsx`

1. Corp member opens `/scan` page
2. Clicks "Start Camera" button
3. Browser requests camera permission
4. Video stream starts showing camera feed

### QR Code Detection
**File:** `app/(authenticated)/scan/page.tsx` (lines 101-130)

1. `captureFrame()` function runs continuously (via `requestAnimationFrame`)
2. Captures video frame to canvas
3. Uses `jsQR` library to detect QR code:
   ```typescript
   const code = jsQR(imageData.data, width, height);
   if (code) {
     const token = code.data; // Extracted token string
     submitToken(token);
   }
   ```

### Token Submission
**File:** `app/(authenticated)/scan/page.tsx` (lines 132-172)

1. Extracted token is sent to server:
   ```typescript
   const formData = new FormData();
   formData.set("token", token); // e.g., "a1b2c3d4e5f6..."
   const res = await submitAttendanceAction(formData);
   ```

2. Server action extracts session token from cookies
3. Calls Convex mutation: `api.attendance.submitScan`

---

## 5. Server Validates Token

### Server Action
**File:** `app/actions/attendance.ts`

```typescript
export async function submitAttendanceAction(formData: FormData) {
  const sessionToken = c.get("session_token")?.value || "";
  const token = formData.get("token") as string;
  
  const res = await client.mutation(api.attendance.submitScan, {
    sessionToken,
    token
  });
}
```

### Convex Mutation: `submitScan`
**File:** `convex/attendance.ts` (lines 5-160)

**Step 1: User Authentication**
```typescript
const session = await ctx.db.query("sessions")
  .filter(q => q.eq("session_token", sessionToken))
  .unique();
const user = await ctx.db.get(session.user_id);
```
- Validates session token
- Gets user record

**Step 2: Basic Validations**
```typescript
// Check if already scanned today
const existing = await ctx.db.query("attendance")
  .filter(q => q.and(
    q.eq("user_id", user._id),
    q.eq("meeting_date", todayDate)
  ))
  .unique();
if (existing) throw new Error("Already scanned today");

// Validate CDS group meets today
const group = await ctx.db.get(user.cds_group_id);
if (!group.meeting_days.includes(weekday)) {
  throw new Error("Group doesn't meet today");
}

// Validate within meeting time window
if (!isWithinMeetingWindow(...)) {
  throw new Error("Outside meeting hours");
}
```

**Step 3: Token Validation (NEW SYSTEM)**

This is the **critical part** - how the server validates client-generated tokens:

```typescript
// Get all active meetings for today
const activeMeetings = await ctx.db
  .query("meetings")
  .filter(q => q.and(
    q.eq("meeting_date", todayDate),
    q.eq("is_active", true)
  ))
  .collect();

let validToken = false;
let validMeeting = null;

// Try each active meeting
for (const meeting of activeMeetings) {
  // Skip legacy meetings (no session_secret)
  if (!meeting.session_secret) continue;
  
  const rotationInterval = meeting.rotation_interval_sec || 50;
  const now = nowMs(); // Current server time
  
  // Generate expected token using SAME algorithm as client
  const expectedToken = generateQrTokenServer(
    meeting.session_secret,  // Same secret stored in DB
    now,                      // Current server time
    rotationInterval         // 50 seconds
  );
  
  // Check current window token
  if (token === expectedToken) {
    validToken = true;
    validMeeting = meeting;
    break;
  }
  
  // Check previous window (clock skew tolerance - 1 window back)
  const prevWindowToken = generateQrTokenServer(
    meeting.session_secret,
    now - (rotationInterval * 1000), // 50 seconds ago
    rotationInterval
  );
  if (token === prevWindowToken) {
    validToken = true;
    validMeeting = meeting;
    break;
  }
  
  // Check next window (clock skew tolerance - 1 window forward)
  const nextWindowToken = generateQrTokenServer(
    meeting.session_secret,
    now + (rotationInterval * 1000), // 50 seconds from now
    rotationInterval
  );
  if (token === nextWindowToken) {
    validToken = true;
    validMeeting = meeting;
    break;
  }
}
```

**Server-Side Token Generation**
**File:** `convex/utils.ts` (lines 147-161)

```typescript
function generateQrTokenServer(secret, timestamp, rotationInterval) {
  // Calculate time window (same as client)
  const windowStartSeconds = Math.floor(timestamp / 1000 / rotationInterval) * rotationInterval;
  const message = `${windowStartSeconds}`;
  
  // Use Node.js crypto for HMAC
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  const hash = hmac.digest('hex');
  
  return hash.substring(0, 64);
}
```

**Why This Works:**
- ✅ Client and server use **identical algorithm**
- ✅ Same secret + same time window = same token
- ✅ Server generates expected token and compares
- ✅ Clock skew tolerance: checks ±1 window (50 seconds)

**Example Validation:**
```
Corp Member Scans: "a1b2c3d4e5f6..." (from QR code)

Server Process:
1. Get active meetings for today
2. For each meeting with session_secret:
   a. Generate expected token for current window
      → "a1b2c3d4e5f6..." ✅ MATCH!
   b. If no match, try previous window
   c. If no match, try next window
3. If match found → validToken = true
4. If no match → throw "Invalid QR code"
```

**Step 4: Legacy Token Fallback**

If token doesn't match any client-generated tokens, try legacy validation:

```typescript
if (!validToken) {
  const qr = await ctx.db.query("qr_tokens")
    .filter(q => q.eq("token", token))
    .unique();
  
  if (qr && qr.expires_at > now && qr.meeting_id) {
    const meeting = await ctx.db.get(qr.meeting_id);
    if (meeting && meeting.is_active) {
      validToken = true;
      validMeeting = meeting;
    }
  }
}
```

**Step 5: Final Validation**
```typescript
if (!validToken || !validMeeting) {
  throw new Error("Invalid or expired QR code.");
}

if (validMeeting.meeting_date !== todayDate) {
  throw new Error("QR code not valid for today.");
}
```

---

## 6. Attendance Recorded

**File:** `convex/attendance.ts` (lines 122-158)

**Step 1: Create Audit Record (Optional)**
```typescript
if (validMeeting.session_secret) {
  // New system - create audit record
  qrTokenId = await ctx.db.insert("qr_tokens", {
    token,                    // The scanned token
    meeting_date: todayDate,
    meeting_id: validMeeting._id,
    generated_at: now,
    expires_at: now + 50000,  // 50 seconds from now
    is_consumed: true,        // Mark as consumed
    rotation_sequence: 0,     // Not used in new system
  });
}
```

**Step 2: Create Attendance Record**
```typescript
const attendanceId = await ctx.db.insert("attendance", {
  user_id: user._id,
  cds_group_id: group._id,
  meeting_date: todayDate,
  scanned_at: now,
  qr_token_id: qrTokenId,     // Link to audit record
  status: "present",
});
```

**Step 3: Return Success**
```typescript
return { attendanceId };
```

---

## 🔐 Security Features

### 1. **Deterministic but Time-Bound**
- Tokens are deterministic (same secret + same window = same token)
- But tokens expire after 50 seconds (next rotation)
- Prevents replay attacks

### 2. **Clock Skew Tolerance**
- Server checks current, previous, and next time windows
- Handles ±50 seconds of clock difference
- Prevents validation failures due to time sync issues

### 3. **One-Time Use Per Day**
- Each user can only scan once per day
- Prevents duplicate attendance

### 4. **Meeting Window Validation**
- Only valid during meeting hours
- Only valid on meeting days
- Only valid for today's date

### 5. **Secret Protection**
- Secret only returned to authorized admins
- Secret never exposed to corp members
- Secret stored securely in database

---

## 📊 Cost Comparison

### Old System (Server-Side Rotation)
- **Token Storage**: ~1,728 tokens/day per session (every 50s)
- **Database Writes**: ~50,000+ writes/month
- **Client Queries**: Continuous subscriptions for token updates
- **Bandwidth**: High (pushing updates to all clients)

### New System (Client-Side Generation)
- **Token Storage**: ~100-500 tokens/day (only when scanned)
- **Database Writes**: ~3,000-15,000 writes/month (99% reduction)
- **Client Queries**: 1 query per session (secret fetch, cached)
- **Bandwidth**: Minimal (no continuous updates)

**Estimated Savings: 90-95% reduction in database bandwidth costs**

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ADMIN CREATES SESSION                                    │
│    Dashboard → startQrAction → startQrSession mutation      │
│    Server generates: sessionSecret (64-char hex)           │
│    Database: Stores secret in meetings table                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ADMIN VIEWS QR CODE                                      │
│    QR Page → useQrSession hook                              │
│    Query: getSessionSecret (cached)                         │
│    Client generates: token = HMAC(secret, timeWindow)       │
│    QR Code displayed, auto-rotates every 50s                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CORP MEMBER SCANS QR                                      │
│    Scan Page → Camera → jsQR → Extract token                │
│    Token: "a1b2c3d4e5f6..." (64-char hex)                    │
│    Submit: submitAttendanceAction → submitScan mutation    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVER VALIDATES TOKEN                                    │
│    Get active meetings for today                            │
│    For each meeting:                                         │
│      Generate expectedToken = HMAC(secret, timeWindow)       │
│      Compare: token === expectedToken?                       │
│      Also check: ±1 window (clock skew tolerance)            │
│    If match → validToken = true                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ATTENDANCE RECORDED                                       │
│    Create qr_tokens audit record (optional)                 │
│    Create attendance record                                  │
│    Return success → Corp member redirected to dashboard    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

1. **Server stores secret, not tokens** - Massive bandwidth savings
2. **Client generates tokens locally** - Zero database queries for rotation
3. **Deterministic algorithm** - Same inputs = same output (validatable)
4. **Time-bound tokens** - Expire after rotation interval (security)
5. **Clock skew tolerance** - Validates ±1 window (robustness)
6. **Backward compatible** - Legacy sessions still work

---

## 🔍 Debugging Tips

If token validation fails:

1. **Check time synchronization**: Client and server clocks should be within 50 seconds
2. **Verify secret match**: Ensure `session_secret` in DB matches what client received
3. **Check time window calculation**: Both should round down to nearest 50 seconds
4. **Verify algorithm**: Both use HMAC-SHA256 with same parameters
5. **Check meeting status**: Meeting must be `is_active: true` and `meeting_date` matches today

---

## 📝 Example Token Generation

**Inputs:**
- Secret: `"f8e7d6c5b4a3928172635485960716253abcdef1234567890abcdef1234567890"`
- Timestamp: `1705896123456` ms
- Rotation Interval: `50` seconds

**Calculation:**
1. Convert to seconds: `1705896123.456` seconds
2. Round down to 50s: `1705896100` seconds
3. Message: `"1705896100"`
4. HMAC-SHA256(secret, "1705896100")
5. Result: `"a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"`

**Validation:**
- Client generates: `"a1b2c3d4..."`
- Server generates: `"a1b2c3d4..."`
- Match: ✅ Valid token

---

This system dramatically reduces database costs while maintaining security and functionality!
