# QR Code System Refactoring Plan
## Goal: Reduce Convex Database Bandwidth Costs by 90%+

---

## Current System Analysis

### Current Problems:
1. **Server-side token generation every 50 seconds**
   - Each rotation creates a new `qr_tokens` record in database
   - Scheduler runs `rotate` mutation every 50 seconds
   - Multiple tokens stored per session (rotation_sequence)

2. **Continuous client polling**
   - `useQuery(api.qr.getActiveQr)` subscribes to real-time updates
   - Every client watching QR code = continuous query subscription
   - Convex pushes updates to all clients whenever tokens change
   - Multiple queries: `getAllActiveQr`, `getActiveQr`, `getTodayAttendance`

3. **Page reloads after actions**
   - `window.location.reload()` after mutations (e.g., stopQrAction)
   - Full page refetch on every action
   - No caching strategy

4. **Bandwidth cost drivers:**
   - Token rotation: ~1,728 rotations/day (every 50s for 24h)
   - Client subscriptions: N clients × continuous queries
   - No caching = repeated fetches

---

## Proposed Solution: Client-Side QR Generation

### Core Concept:
**Deterministic Token Generation** - Generate tokens client-side using a shared secret + time-based algorithm

### Architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Convex)                      │
│                                                          │
│  1. Store session secret (once per session)            │
│  2. Store meeting metadata (is_active, meeting_date)    │
│  3. Validate tokens when scanned (attendance.submitScan)│
│                                                          │
└─────────────────────────────────────────────────────────┘
                        ↓ (only on scan)
┌─────────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                      │
│                                                          │
│  1. Fetch session secret (once, cached)                │
│  2. Generate tokens locally using:                     │
│     token = HMAC(secret, timeWindow)                    │
│  3. Rotate every 50s using client-side timer           │
│  4. Display QR code (no server queries)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Schema Changes

#### 1.1 Update `meetings` table
```typescript
meetings: defineTable({
  // ... existing fields
  session_secret: v.string(),        // NEW: Secret for token generation
  rotation_interval_sec: v.number(), // NEW: Rotation interval (default 50)
  token_algorithm: v.literal("hmac-sha256"), // NEW: Algorithm identifier
})
```

#### 1.2 Keep `qr_tokens` table (for validation only)
- Only store tokens when they're **scanned** (not pre-generated)
- Use for validation in `attendance.submitScan`
- Clean up old tokens periodically

---

### Phase 2: Client-Side Token Generation

#### 2.1 Create token generation utility
**File: `lib/qr-token-generator.ts`**
```typescript
/**
 * Generate QR token client-side using HMAC-SHA256
 * Token = HMAC(secret, timeWindow)
 * 
 * @param secret - Session secret from server
 * @param timestamp - Current timestamp (ms)
 * @param rotationInterval - Rotation interval in seconds (default 50)
 * @returns Generated token string
 */
export function generateQrToken(
  secret: string,
  timestamp: number,
  rotationInterval: number = 50
): string {
  // Calculate time window (round down to rotation interval)
  const windowStart = Math.floor(timestamp / 1000 / rotationInterval) * rotationInterval;
  
  // Create HMAC
  const message = `${windowStart}`; // Time window as message
  const hash = crypto.subtle.digest('SHA-256', 
    new TextEncoder().encode(secret + message)
  );
  
  // Convert to hex string
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 64); // 64-char token
}
```

#### 2.2 Create session hook
**File: `hooks/useQrSession.ts`**
```typescript
/**
 * Hook to manage QR session with client-side token generation
 * Fetches session secret once, then generates tokens locally
 */
export function useQrSession(meetingId: string | null) {
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [rotationCount, setRotationCount] = useState(0);
  
  // Fetch session secret (cached, only once)
  const sessionData = useQuery(
    api.qr.getSessionSecret,
    meetingId ? { meetingId } : "skip"
  );
  
  useEffect(() => {
    if (!sessionData?.secret) return;
    
    const rotationInterval = sessionData.rotationInterval || 50;
    let intervalId: NodeJS.Timeout;
    
    const generateAndRotate = () => {
      const token = generateQrToken(
        sessionData.secret,
        Date.now(),
        rotationInterval
      );
      setCurrentToken(token);
      setRotationCount(prev => prev + 1);
    };
    
    // Generate immediately
    generateAndRotate();
    
    // Rotate every interval
    intervalId = setInterval(generateAndRotate, rotationInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [sessionData]);
  
  return { currentToken, rotationCount, sessionData };
}
```

---

### Phase 3: Server-Side Changes

#### 3.1 Update `startQrSession` mutation
```typescript
export const startQrSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // ... existing validation ...
    
    // Generate session secret (random 32-byte hex)
    const sessionSecret = generateRandomTokenHex(32);
    const rotationInterval = DEFAULT_ROTATION_SEC;
    
    const meetingId = await ctx.db.insert("meetings", {
      meeting_date: today,
      session_id: sessionId,
      is_active: true,
      activated_by_admin_id: admin._id,
      activated_at: nowMs(),
      session_secret: sessionSecret,        // NEW
      rotation_interval_sec: rotationInterval, // NEW
      token_algorithm: "hmac-sha256",      // NEW
      // ... other fields
    });
    
    // NO token generation, NO scheduler
    // Clients will generate tokens locally
    
    return { 
      meetingId, 
      sessionId,
      // Don't return secret here - use separate query
    };
  },
});
```

#### 3.2 Create `getSessionSecret` query
```typescript
export const getSessionSecret = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, { meetingId }) => {
    const meeting = await ctx.db.get(meetingId);
    if (!meeting || !meeting.is_active) return null;
    
    // Verify user is admin (from session token in middleware)
    // Return secret only to authorized admins
    
    return {
      secret: meeting.session_secret,
      rotationInterval: meeting.rotation_interval_sec || 50,
      meetingDate: meeting.meeting_date,
      isActive: meeting.is_active,
    };
  },
});
```

#### 3.3 Update `attendance.submitScan` validation
```typescript
export const submitScan = mutation({
  // ... existing code ...
  
  handler: async (ctx, { sessionToken, token }) => {
    // ... existing user validation ...
    
    // NEW: Validate token using client-side algorithm
    // Find active meeting for today
    const today = toNigeriaYYYYMMDD(new Date());
    const activeMeetings = await ctx.db
      .query("meetings")
      .filter((q) => q.and(
        q.eq(q.field("meeting_date"), today),
        q.eq(q.field("is_active"), true)
      ))
      .collect();
    
    let validToken = false;
    let validMeeting = null;
    
    for (const meeting of activeMeetings) {
      // Generate expected token using same algorithm
      const expectedToken = generateQrTokenServer(
        meeting.session_secret,
        nowMs(),
        meeting.rotation_interval_sec || 50
      );
      
      // Also check previous window (for clock skew tolerance)
      const prevWindowToken = generateQrTokenServer(
        meeting.session_secret,
        nowMs() - (meeting.rotation_interval_sec * 1000),
        meeting.rotation_interval_sec || 50
      );
      
      if (token === expectedToken || token === prevWindowToken) {
        validToken = true;
        validMeeting = meeting;
        break;
      }
    }
    
    if (!validToken || !validMeeting) {
      throw new Error("Invalid or expired QR code.");
    }
    
    // Check if already scanned today
    const existing = await ctx.db
      .query("attendance")
      .filter((q) => q.and(
        q.eq(q.field("user_id"), user._id),
        q.eq(q.field("meeting_date"), today)
      ))
      .unique();
    
    if (existing) {
      throw new Error(`You already marked attendance today.`);
    }
    
    // Store token in qr_tokens for audit (optional)
    const qrTokenId = await ctx.db.insert("qr_tokens", {
      token,
      meeting_date: today,
      meeting_id: validMeeting._id,
      generated_by_admin_id: validMeeting.activated_by_admin_id,
      generated_at: nowMs(),
      expires_at: nowMs() + (validMeeting.rotation_interval_sec * 1000),
      rotation_sequence: 0, // Not used anymore
      is_consumed: true,    // Mark as consumed immediately
      cds_group_id: undefined,
    });
    
    // Create attendance record
    const attendanceId = await ctx.db.insert("attendance", {
      user_id: user._id,
      cds_group_id: group._id,
      meeting_date: today,
      scanned_at: now,
      qr_token_id: qrTokenId,
      status: "present",
    });
    
    return { attendanceId };
  },
});
```

#### 3.4 Remove `rotate` mutation
- No longer needed - clients generate tokens locally
- Remove scheduler calls from `startQrSession`

---

### Phase 4: Caching Strategy

#### 4.1 Install TanStack Query
```bash
npm install @tanstack/react-query
```

#### 4.2 Setup Query Client Provider
**File: `app/providers.tsx`**
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... existing providers ... */}
      {children}
    </QueryClientProvider>
  );
}
```

#### 4.3 Create cached hooks
**File: `hooks/useCachedQuery.ts`**
```typescript
import { useQuery as useConvexQuery } from 'convex/react';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { api } from '@/convex/_generated/api';

/**
 * Wrapper to cache Convex queries using TanStack Query
 */
export function useCachedConvexQuery<T>(
  queryName: keyof typeof api,
  args: any,
  options?: {
    staleTime?: number;
    enabled?: boolean;
  }
) {
  const convexData = useConvexQuery(api[queryName], args === "skip" ? "skip" : args);
  
  return useTanStackQuery({
    queryKey: [queryName, args],
    queryFn: () => Promise.resolve(convexData),
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled !== false && convexData !== undefined,
    initialData: convexData,
  });
}
```

#### 4.4 Update pages to use caching
- Replace `window.location.reload()` with query invalidation
- Use `queryClient.invalidateQueries()` after mutations
- Cache session secrets, meeting data, attendance stats

---

### Phase 5: Migration Strategy

#### 5.1 Backward Compatibility
- Keep `qr_tokens` table for existing tokens
- Support both old and new token formats during transition
- Add feature flag to switch between modes

#### 5.2 Gradual Rollout
1. Deploy server changes (new schema, new queries)
2. Deploy client changes (new token generation)
3. Monitor token validation success rate
4. Remove old rotation system after 1 week

---

## Expected Cost Reduction

### Before:
- **Token rotations**: 1,728/day × N sessions = ~50K+ database writes/month
- **Client queries**: N clients × continuous subscriptions = high bandwidth
- **No caching**: Repeated fetches on every action

### After:
- **Token storage**: Only when scanned (~100-500/day vs 50K+)
- **Client queries**: 1 query per session (secret fetch, cached)
- **Token generation**: Client-side (zero database cost)
- **Caching**: 90%+ reduction in redundant queries

### Estimated Savings: **90-95% reduction in bandwidth costs**

---

## Security Considerations

1. **Secret Protection**
   - Only return secret to authorized admins
   - Use session token validation in `getSessionSecret`
   - Consider expiring secrets after session ends

2. **Token Validation**
   - Server validates using same algorithm
   - Check current + previous time window (clock skew tolerance)
   - Rate limit validation attempts

3. **Replay Attacks**
   - Tokens expire after rotation interval
   - One-time use per user per day (existing check)

---

## Implementation Checklist

- [ ] Phase 1: Schema updates
- [ ] Phase 2: Client-side token generation
- [ ] Phase 3: Server-side validation updates
- [ ] Phase 4: Caching implementation
- [ ] Phase 5: Migration & testing
- [ ] Remove old rotation system
- [ ] Monitor cost reduction

---

## Testing Plan

1. **Unit Tests**
   - Token generation algorithm (client & server)
   - Time window calculation
   - Clock skew tolerance

2. **Integration Tests**
   - End-to-end QR scan flow
   - Token rotation on client
   - Validation on server

3. **Performance Tests**
   - Measure query reduction
   - Monitor database bandwidth
   - Verify cost savings

---

## Rollback Plan

If issues arise:
1. Feature flag to disable client-side generation
2. Fallback to server-side rotation
3. Keep old code for 2 weeks before removal
