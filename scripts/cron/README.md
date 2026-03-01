# Cron Jobs for Spaceship

## Session Cleanup

Cleans up expired sessions from the database. Run daily.

### Setup on Spaceship

1. Ensure `DATABASE_URL` is set in your environment
2. Add to crontab:
   ```
   0 2 * * * cd /path/to/cds-attendance && npx ts-node scripts/cron/cleanup-sessions.ts >> /var/log/cds-cleanup.log 2>&1
   ```
   Or if using compiled JS:
   ```
   0 2 * * * cd /path/to/cds-attendance && node scripts/cron/cleanup-sessions.js >> /var/log/cds-cleanup.log 2>&1
   ```

### Manual Run

```bash
npx ts-node scripts/cron/cleanup-sessions.ts
```
