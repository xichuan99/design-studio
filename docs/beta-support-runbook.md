# Beta Support Runbook

This runbook covers the top five incident types expected during the controlled paid beta (30-50 invited sellers).

## Incident Priority Levels

- **P0**: User loses credits without generating; silent credit loss; payment stuck pending
- **P1**: Generation fails; export fails; can't signup; payment webhook delayed
- **P2**: UI lag; slow export; allowlist entry not working as expected
- **P3**: Copy/design quality feedback; feature request; general support question

---

## 1. User Cannot Sign Up (P0/P1)

### Symptom
- User tries to register with email or invite code, gets error: "Email or invite code not on allowlist"
- User is confused about beta access

### Diagnosis
```sql
-- Check if user's email is on allowlist
SELECT * FROM beta_allowlist 
WHERE entry_type='email' AND entry_value=LOWER('user@email.com') AND status='active';

-- Check if invite code exists
SELECT * FROM beta_allowlist 
WHERE entry_type='code' AND entry_value=UPPER('theircode') AND status='active';

-- Check if gating is enabled
-- Via operator endpoint: GET /api/internal/operator-summary
-- and look for signups_by_invite_source_7d breakdown
```

### Resolution
**Option A: User should be on allowlist**
1. Open operator panel → POST `/api/internal/beta-allowlist/add`
2. Add email or code with cohort (e.g., "wave_1")
3. User can now retry signup

**Option B: User is in wrong cohort**
1. Check `/api/internal/beta-allowlist/list` if email is inactive
2. If status='inactive', call PATCH `/api/internal/beta-allowlist/{id}` to set status='active'
3. User can now retry signup

**Option C: Temporarily disable gating (emergency)**
1. Set environment variable `BETA_GATING_ENABLED=false`
2. Redeploy backend
3. User can signup without allowlist
4. ⚠️ Re-enable after issue resolved

---

## 2. Failed AI Generation (P1)

### Symptom
- User generates design, gets "Failed to generate" error
- Credits may or may not be consumed
- User is frustrated, wants refund or retry

### Diagnosis
```sql
-- Check recent failures for this user
SELECT 
  ue.id, ue.operation, ue.status, ue.error_code, ue.credits_charged, ue.actual_cost,
  ue.created_at
FROM ai_usage_events ue
WHERE ue.user_id = '<user_id>'
ORDER BY ue.created_at DESC
LIMIT 10;

-- Check if job exists
SELECT * FROM ai_tool_jobs WHERE id='<job_id>';

-- Operator view: GET /api/internal/operator-summary
-- Look for recent_failures block
```

### Resolution
**If credits were charged and generation failed (most common):**
1. Confirm `ai_usage_events.status='failed'` and `credits_charged > 0`
2. Check if `refund_transaction_id IS NOT NULL` → already refunded automatically, tell user to check balance
3. If not refunded:
   - Create a CreditTransaction: `amount = +credits_charged`, `description="Refund: Failed generation <job_id>"`
   - Commit transaction
   - Notify user: "Credits have been refunded due to generation failure"

**If generation timed out (provider slow):**
1. Suggest retry; if fails again, proceed with refund above
2. If pattern emerges (e.g., all background-swap failing), escalate to engineering

**If user wants manual retry after refund:**
1. Confirm credits in user account
2. User retries generation from editor

---

## 3. Payment Stuck on "Pending" (P0)

### Symptom
- User completed Midtrans checkout, browser shows "Pending payment"
- Has been pending > 30 minutes
- User is worried payment didn't go through

### Diagnosis
```sql
-- Check credit_purchases table
SELECT * FROM credit_purchases 
WHERE user_id='<user_id>' 
ORDER BY created_at DESC LIMIT 5;

-- Look for status='pending' with created_at > 30 mins ago

-- Check Midtrans API directly (backend only):
-- Call /api/internal/credit-purchases/{id}/status (if endpoint exists)
-- Or manually query Midtrans via server key
```

### Resolution
**Case 1: Midtrans shows payment captured/settled**
1. Check if webhook was delivered: search backend logs for `notification received order_id=<order_id>`
2. If webhook delivered but purchase still pending:
   - Reconciliation worker should pick it up in next 10-min cycle
   - If > 40 mins, manually call: `reconcile_pending_credit_purchases()` task
3. Refresh operator summary to confirm credits were added

**Case 2: Midtrans shows payment pending/waiting**
- User needs to retry Midtrans checkout or ask bank
- Tell user: "Payment is still waiting at your bank. Please retry in a few minutes."
- Set a reminder to check in 2 hours; if still pending, escalate

**Case 3: Midtrans shows payment failed/denied**
- User's payment method was rejected
- Tell user: "Your payment was declined by your bank. Please try another card or payment method."
- User can retry from settings page

---

## 4. Export Fails or Stuck (P1/P2)

### Symptom
- User clicks "Export", waits 30+ seconds, still no file
- Or export completes but file is corrupt/blank

### Diagnosis
```sql
-- Check export events
SELECT * FROM design_feedback 
WHERE user_id='<user_id>' 
ORDER BY created_at DESC LIMIT 5;

-- Check if Job exists
SELECT * FROM jobs 
WHERE user_id='<user_id>' 
ORDER BY created_at DESC LIMIT 5;

-- Look at job.status and job.error
```

### Resolution
**If job status='failed':**
1. Tell user: "Export encountered an error. Please try again."
2. If pattern emerges (e.g., all multi-format exports failing), check backend logs for storage service errors
3. If storage quota is exceeded:
   ```sql
   SELECT storage_used, storage_quota FROM users WHERE id='<user_id>';
   ```
   - Tell user: "Your storage is full. Upgrade storage or delete unused designs."

**If job status='processing' but stuck > 5 mins:**
1. Check backend logs for Celery worker errors
2. Try manually refreshing editor; user may retry export
3. If Celery crashed, restart worker: `docker-compose restart celery_worker`

**If file downloads but is corrupt:**
1. This is rare; usually indicates render service failure
2. Tell user: "Export file corrupted. Please try again."
3. If repeats, escalate to engineering (check render logs)

---

## 5. Provider Outage (External) (P0)

### Symptom
- Multiple users report generation/export failures
- Failures spike in operator-summary
- Recent failures block shows many of the same error code

### Diagnosis
```sql
-- Check recent failures for error_code pattern
SELECT error_code, COUNT(*) as count 
FROM ai_usage_events 
WHERE status='failed' AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY error_code 
ORDER BY count DESC;

-- Operator view: GET /api/internal/operator-summary
-- Look for spike in recent_failures
```

### Resolution
**If error involves specific provider (e.g., Replicate, Midtrans, etc.):**
1. Check provider status page: Replicate, Stability AI, Midtrans, etc.
2. If provider is down:
   - Post in internal team chat: "[OUTAGE] <Provider> is down; affecting <operation>"
   - Set expectation: "We're experiencing a temporary outage on the [Provider] side. ETA: [provider status page]"
   - Pause accepting new generation requests? (optional, depending on business call)
3. Once provider recovers:
   - User can retry generation/export without needing support

**If error is in our code:**
1. Check backend logs: `docker-compose logs backend | grep -i error`
2. If worker crashed, restart: `docker-compose restart celery_worker`
3. If database is full, clear old temp data and restart services

---

## 6. Rollback After Bad Deploy (P0)

### Symptom
- Feature/fix was deployed but broke signup, payments, or generation
- Multiple users affected

### Resolution
1. **Immediate:** Roll back to last known-good commit
   ```bash
   git revert <bad_commit_sha>
   git push
   docker-compose down && docker-compose up -d  # redeploy
   ```

2. **Communicate:** Post in team chat with ETA
   ```
   Rolled back due to [issue]. Service resuming now. We'll investigate and re-deploy after testing.
   ```

3. **Data cleanup:**
   - If partial payments were recorded: reconcile manually
   - If credits were double-charged: refund via CreditTransaction

4. **Post-mortem:** After service is stable, review what went wrong and add a test

---

## Escalation Path

| Severity | Action | Owner |
|----------|--------|-------|
| User can't signup or pay | Immediate action; fill allowlist or fix payment | Support + Backend eng |
| Generation/export fails for one user | Try manual refund; gather logs | Support |
| Multiple failures; provider outage | Check provider status; communicate ETA | Support + Backend eng |
| Silent credit loss detected | P0 emergency; rollback + audit | Backend eng + Founder |
| UI/UX bug or poor copy | Non-urgent; batch into next iteration | Frontend eng |

---

## Monitoring Checklist

Every morning (or shift change), operator should run:

```bash
# 1. Check operator summary
curl -H "X-Internal-Token: $INTERNAL_TOKEN" http://localhost:8000/api/internal/operator-summary

# 2. Look for:
#    - failed generation count spike
#    - pending payment count > 5
#    - error_code patterns
#    - recent_failures block

# 3. Check credit reconciliation ran
# Look for "reconcile_pending_credit_purchases" in celery logs

# 4. Spot-check PayOuts and Refunds in UI
# Any refunds pending > 1 day?
```

---

## Emergency Contact / Escalation

- **Backend emergency:** [Engineering contact]
- **Payment provider issue:** Contact [Midtrans support](https://www.midtrans.com/contact)
- **AI provider outage:** Check provider status page (Replicate, Stability AI, etc.)
- **Founder decision:** [Founder contact]

---

## Links

- [Operator Summary API](http://localhost:8000/docs#/internal-metrics/get_operator_summary)
- [Beta Allowlist API](http://localhost:8000/docs#/internal-metrics/list_allowlist_entries)
- [AI Usage Events Table Docs](../architecture/ai-provider-strategy.md)
- [Phase 2 Beta Control Plane](../LAUNCH_READINESS.md#phase-2-beta-control-plane-week-2)
